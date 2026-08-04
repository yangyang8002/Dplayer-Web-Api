const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { exec } = require('child_process');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 1919;

// 中间件
app.use(express.json());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// PoW 工作量证明（必须在 static 之前拦截页面请求）
app.use(powMiddleware);

app.use(express.static(path.join(__dirname, 'public')));

// CORS 支持（跨域请求）
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ==================== PoW 工作量证明（Anubis 同款防爬虫） ====================
const POW_SECRET = crypto.randomBytes(32).toString('hex');
const POW_COOKIE = 'dp_pow';

function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach(c => {
        const idx = c.indexOf('=');
        if (idx > -1) cookies[c.slice(0, idx).trim()] = c.slice(idx + 1).trim();
    });
    return cookies;
}

function signPayload(payload) {
    const hmac = crypto.createHmac('sha256', POW_SECRET).update(payload).digest('hex');
    return payload + '.' + hmac;
}

function verifyPayload(signed) {
    const idx = signed.lastIndexOf('.');
    if (idx === -1) return null;
    const payload = signed.slice(0, idx);
    const sig = signed.slice(idx + 1);
    const expected = crypto.createHmac('sha256', POW_SECRET).update(payload).digest('hex');
    if (sig !== expected) return null;
    return payload;
}

function powMiddleware(req, res, next) {
    const config = readConfig();
    if (!config.pow || !config.pow.enabled) return next();
    const adminPath = (config.security && config.security.adminPath) || '/admin';
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin') || req.path.startsWith(adminPath)) return next();

    const cookies = parseCookies(req.headers.cookie || '');
    const signed = cookies[POW_COOKIE];
    if (signed) {
        const payload = verifyPayload(signed);
        if (payload) {
            try {
                const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
                if (Date.now() - data.t < 3600000) return next();
            } catch (e) {}
        }
    }

    const challenge = crypto.randomBytes(16).toString('hex');
    const difficulty = config.pow.difficulty || 4;
    res.type('html').send(`<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>连接验证</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#07070d;color:#e4e4ed;display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,sans-serif}.card{text-align:center;padding:32px 40px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:#14141f;max-width:420px}h2{margin-bottom:8px;font-size:20px}#status{color:#9099a3;font-size:13px;margin-top:12px}.bar{margin-top:16px;height:3px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden}.bar-inner{height:100%;width:0;background:linear-gradient(90deg,#00a1d6,#00c3f0);border-radius:3px;transition:width .3s}</style></head><body><div class="card"><h2>正在验证连接安全...</h2><p id="status" style="font-size:13px;color:#9099a3">正在进行工作量证明计算</p><div class="bar"><div class="bar-inner" id="bar"></div></div></div><script>
const challenge='${challenge}', difficulty=${difficulty}, target='0'.repeat(difficulty);
let found=false,nonce=0;
function solve(){
    const start=performance.now(),enc=new TextEncoder(),data=enc.encode(challenge);
    const nonceBuf=new ArrayBuffer(8),dv=new DataView(nonceBuf);
    let best=0;
    async function step(){
        for(let i=0;i<20000&&!found;i++,nonce++){
            dv.setBigUint64(0,BigInt(nonce),true);
            const combined=new Uint8Array(data.length+8);
            combined.set(data);combined.set(new Uint8Array(nonceBuf),data.length);
            const hash=await crypto.subtle.digest('SHA-256',combined);
            const bytes=new Uint8Array(hash);
            let zeros=0;
            for(let j=0;j<bytes.length;j++){
                if(bytes[j]===0)zeros+=2;
                else{if(bytes[j]<16)zeros+=1;break}
            }
            if(zeros>=difficulty){found=true;
                document.getElementById('status').innerHTML='验证完成，正在进入...';
                fetch('/api/pow/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nonce,challenge})}).then(r=>r.json()).then(d=>{if(d.ok)location.reload()});
                return;
            }
            if(zeros>best){best=zeros;document.getElementById('bar').style.width=Math.min(90,Math.round(zeros/difficulty*100))+'%'}
        }
        if(!found){document.getElementById('status').innerHTML='计算中... ('+nonce+'次)';requestAnimationFrame(step)}
    }
    requestAnimationFrame(step);
}
solve();
</script></body></html>`);
}

// PoW 验证端点
app.post('/api/pow/verify', (req, res) => {
    const config = readConfig();
    const { nonce, challenge } = req.body;
    if ((nonce !== 0 && !nonce) || !challenge) return res.json({ ok: false });
    const combined = Buffer.concat([Buffer.from(challenge, 'utf8'), Buffer.from(new BigUint64Array([BigInt(nonce)]).buffer)]);
    const hash = crypto.createHash('sha256').update(combined).digest('hex');
    const target = '0'.repeat(config.pow.difficulty || 4);
    if (!hash.startsWith(target)) return res.json({ ok: false });
    const payload = Buffer.from(JSON.stringify({ t: Date.now() })).toString('base64');
    const signed = signPayload(payload);
    res.setHeader('Set-Cookie', POW_COOKIE + '=' + signed + '; Path=/; Max-Age=3600; SameSite=Lax; HttpOnly');
    res.json({ ok: true });
});

// ==================== 速率限制 ====================
function getApiLimiter() {
    const config = readConfig();
    if (!config.rateLimit || !config.rateLimit.enabled) return (req, res, next) => next();
    return rateLimit({
        windowMs: config.rateLimit.windowMs || 60000,
        max: config.rateLimit.max || 60,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => res.status(429).json({ code: 429, msg: '请求过于频繁,请稍后再试' })
    });
}

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data');
const DANMU_FILE = path.join(DATA_DIR, 'danmu.json');
const BANNED_WORDS_FILE = path.join(DATA_DIR, 'banned_words.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const VIDEOS_FILE = path.join(DATA_DIR, 'videos.json');

// ==================== 账号密码认证系统 ====================
const TOKEN_SECRET = crypto.randomBytes(32).toString('hex');
let tokenExpiryMs = 2 * 60 * 60 * 1000;

function getTokenExpiry() {
    const config = readConfig();
    return (config.security && config.security.sessionMinutes || 120) * 60 * 1000;
}

function hashPassword(password, salt) {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function initAccounts() {
    if (!fs.existsSync(ACCOUNTS_FILE)) {
        const salt = crypto.randomBytes(16).toString('hex');
        const defaultAccount = {
            admin: { salt, hash: hashPassword('admin123', salt), name: '管理员', created: Date.now() }
        };
        fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(defaultAccount, null, 2));
        console.log('[认证] 已创建默认账号 admin / admin123');
    }
}

function readAccounts() {
    try { return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8')); } catch { return {}; }
}

function writeAccounts(accounts) {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

function generateToken(username) {
    const payload = Buffer.from(JSON.stringify({ u: username, t: Date.now() })).toString('base64');
    const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
    return payload + '.' + sig;
}

function verifyToken(token) {
    if (!token) return null;
    const idx = token.lastIndexOf('.');
    if (idx === -1) return null;
    const payload = token.slice(0, idx);
    const sig = token.slice(idx + 1);
    if (crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex') !== sig) return null;
    try {
        const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
        if (Date.now() - data.t > getTokenExpiry()) return null;
        return data.u;
    } catch { return null; }
}

// 管理员登录验证中间件（Bearer Token）
function checkAdmin(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.body.token || req.headers['x-admin-token'];
    const username = verifyToken(token);
    if (!username) {
        return res.status(401).json({ code: 1, msg: '未登录或令牌已过期' });
    }
    req.adminUser = username;
    next();
}

initAccounts();

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化数据文件
function initDataFile(filePath, defaultData) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
}

initDataFile(DANMU_FILE, []);
initDataFile(BANNED_WORDS_FILE, ['广告', '刷屏', '垃圾']);

// ==================== 服务器配置 ====================
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const DEFAULT_CONFIG = {
    pow: { enabled: false, difficulty: 4 },
    rateLimit: { enabled: false, windowMs: 60000, max: 60 },
    danmakuLimit: { enabled: false, maxPerMinute: 10 },
    security: { sessionMinutes: 120, adminPath: '' },
    theme: 'bilibili',
    cdn: { enabled: false, baseUrl: '' }
};

if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

function readConfig() {
    try {
        const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return { ...DEFAULT_CONFIG, ...raw };
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

function writeConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// 读取数据
function readData(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return [];
    }
}

// 写入数据
function writeData(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// 检查是否包含屏蔽词
function containsBannedWord(text) {
    const bannedWords = readData(BANNED_WORDS_FILE);
    const lowerText = text.toLowerCase();
    return bannedWords.some(word => lowerText.includes(word.toLowerCase()));
}

// ==================== 弹幕API ====================

// 弹幕发送频率限制（内存计数器）
const danmakuCounters = new Map();

function checkDanmakuLimit(req, res) {
    const config = readConfig();
    if (!config.danmakuLimit || !config.danmakuLimit.enabled) return true;
    const max = config.danmakuLimit.maxPerMinute || 10;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = 'dm_' + ip;
    const now = Date.now();
    let entry = danmakuCounters.get(key);
    if (!entry || now > entry.resetAt) {
        danmakuCounters.set(key, { count: 1, resetAt: now + 60000 });
        return true;
    }
    if (entry.count >= max) {
        res.status(429).json({ code: 3, msg: `发送过快，每分钟最多 ${max} 条弹幕` });
        return false;
    }
    entry.count++;
    return true;
}

// API 速率限制
app.use('/api/', getApiLimiter());

// 获取弹幕列表 - DPlayer v3标准格式
// 路由1: /api/danmu/v3/?id=xxx (DPlayer 实际使用的格式)
app.get('/api/danmu/v3/', (req, res) => {
    const id = req.query.id;
    console.log(`[弹幕API] GET 请求(query) - 视频ID: ${id}`);
    
    let danmuList = readData(DANMU_FILE);
    console.log(`[弹幕API] 数据库中共有 ${danmuList.length} 条弹幕`);
    
    if (id) {
        danmuList = danmuList.filter(d => d.vid === id);
        console.log(`[弹幕API] 过滤后剩余 ${danmuList.length} 条弹幕`);
    }
    
    // 过滤掉包含屏蔽词的弹幕
    const bannedWords = readData(BANNED_WORDS_FILE);
    danmuList = danmuList.filter(d => {
        const text = d.text.toLowerCase();
        return !bannedWords.some(word => text.includes(word.toLowerCase()));
    });
    
    // 转换为DPlayer v3标准格式: [time, type, color, author, text]
    const danmakuData = danmuList.map(d => [
        d.time,
        d.type === 'right' ? 0 : (d.type === 'top' ? 1 : 2),
        parseInt(d.color.replace('#', ''), 16),
        d.author || 'anonymous',
        d.text
    ]);
    
    console.log(`[弹幕API] 返回 ${danmakuData.length} 条弹幕`);
    res.json({ code: 0, data: danmakuData });
});

// 路由2: /api/danmu/v3/xxx (路径参数格式)
app.get('/api/danmu/v3/:id', (req, res) => {
    const id = req.params.id;
    console.log(`[弹幕API] GET 请求(path) - 视频ID: ${id}`);
    
    let danmuList = readData(DANMU_FILE);
    
    if (id) {
        danmuList = danmuList.filter(d => d.vid === id);
    }
    
    // 过滤屏蔽词
    const bannedWords = readData(BANNED_WORDS_FILE);
    danmuList = danmuList.filter(d => {
        const text = d.text.toLowerCase();
        return !bannedWords.some(word => text.includes(word.toLowerCase()));
    });
    
    const danmakuData = danmuList.map(d => [
        d.time,
        d.type === 'right' ? 0 : (d.type === 'top' ? 1 : 2),
        parseInt(d.color.replace('#', ''), 16),
        d.author || 'anonymous',
        d.text
    ]);
    
    res.json({ code: 0, data: danmakuData });
});

// DPlayer标准弹幕API路由 (兼容旧版DPlayer配置)
// 获取弹幕: GET /api/danmu/?id=xxx
app.get('/api/danmu/', (req, res) => {
    const id = req.query.id;
    console.log(`[弹幕API] GET 请求(query) - 视频ID: ${id}`);
    
    let danmuList = readData(DANMU_FILE);
    console.log(`[弹幕API] 数据库中共有 ${danmuList.length} 条弹幕`);
    
    if (id) {
        danmuList = danmuList.filter(d => d.vid === id);
        console.log(`[弹幕API] 过滤后剩余 ${danmuList.length} 条弹幕`);
    }
    
    // 过滤掉包含屏蔽词的弹幕
    const bannedWords = readData(BANNED_WORDS_FILE);
    danmuList = danmuList.filter(d => {
        const text = d.text.toLowerCase();
        return !bannedWords.some(word => text.includes(word.toLowerCase()));
    });
    
    // 转换为DPlayer v3标准格式: [time, type, color, author, text]
    const danmakuData = danmuList.map(d => [
        d.time,
        d.type === 'right' ? 0 : (d.type === 'top' ? 1 : 2),
        parseInt(d.color.replace('#', ''), 16),
        d.author || 'anonymous',
        d.text
    ]);
    
    console.log(`[弹幕API] 返回 ${danmakuData.length} 条弹幕`);
    res.json({ code: 0, data: danmakuData });
});

// 发送弹幕 - DPlayer标准格式
// DPlayer POST格式: POST /api/danmu/  body: { id, author, time, text, color, type }
app.post('/api/danmu/', (req, res) => {
    const { id, player, text, color, type, time, author } = req.body;
    const vid = id || player;
    console.log(`[弹幕API] POST 请求 - 视频ID: ${vid}, 内容: ${text}`);

    if (!vid || !text) {
        console.log(`[弹幕API] 参数不完整 - id/player: ${vid}, text: ${text}`);
        return res.status(400).json({ code: 1, msg: '参数不完整' });
    }

    if (!checkDanmakuLimit(req, res)) return;

    if (containsBannedWord(text)) {
        console.log(`[弹幕API] 弹幕包含屏蔽词: ${text}`);
        return res.status(403).json({ code: 2, msg: '弹幕包含屏蔽词' });
    }

    const danmuList = readData(DANMU_FILE);

    let danmuType = 'right';
    if (type === 1) danmuType = 'top';
    else if (type === 2) danmuType = 'bottom';

    let colorHex = '#ffffff';
    if (color !== undefined) {
        colorHex = '#' + parseInt(color).toString(16).padStart(6, '0');
    }

    const newDanmu = {
        id: Date.now().toString(),
        vid: vid,
        text,
        color: colorHex,
        type: danmuType,
        time: parseFloat(time) || 0,
        author: author || 'anonymous',
        date: new Date().toISOString()
    };

    danmuList.push(newDanmu);
    writeData(DANMU_FILE, danmuList);

    console.log(`[弹幕API] 弹幕保存成功: ${text}`);
    res.json({ code: 0, data: newDanmu });
});

// 发送弹幕 - DPlayer v3标准格式
// DPlayer POST格式: POST /api/danmu/v3/  body: { id, author, time, text, color, type }
app.post('/api/danmu/v3/', (req, res) => {
    const { id, player, text, color, type, time, author } = req.body;
    const vid = id || player;
    console.log(`[弹幕API] POST 请求 - 视频ID: ${vid}, 内容: ${text}`);

    if (!vid || !text) {
        console.log(`[弹幕API] 参数不完整 - id/player: ${vid}, text: ${text}`);
        return res.status(400).json({ code: 1, msg: '参数不完整' });
    }

    if (!checkDanmakuLimit(req, res)) return;

    if (containsBannedWord(text)) {
        console.log(`[弹幕API] 弹幕包含屏蔽词: ${text}`);
        return res.status(403).json({ code: 2, msg: '弹幕包含屏蔽词' });
    }

    const danmuList = readData(DANMU_FILE);

    let danmuType = 'right';
    if (type === 1) danmuType = 'top';
    else if (type === 2) danmuType = 'bottom';

    let colorHex = '#ffffff';
    if (color !== undefined) {
        colorHex = '#' + parseInt(color).toString(16).padStart(6, '0');
    }

    const newDanmu = {
        id: Date.now().toString(),
        vid: vid,
        text,
        color: colorHex,
        type: danmuType,
        time: parseFloat(time) || 0,
        author: author || 'anonymous',
        date: new Date().toISOString()
    };

    danmuList.push(newDanmu);
    writeData(DANMU_FILE, danmuList);

    console.log(`[弹幕API] 弹幕保存成功: ${text}`);
    res.json({ code: 0, data: newDanmu });
});

// ==================== 视频映射 ====================

initDataFile(VIDEOS_FILE, {});

// 播放器自动上报 vid → URL 映射
app.post('/api/video/map', (req, res) => {
    const { vid, url } = req.body;
    if (!vid || !url) return res.status(400).json({ code: 1, msg: '参数不完整' });
    const videos = readData(VIDEOS_FILE);
    videos[vid] = url;
    writeData(VIDEOS_FILE, videos);
    res.json({ code: 0, msg: '已记录' });
});

// 管理员获取视频映射列表
app.get('/api/admin/videos', checkAdmin, (req, res) => {
    const videos = readData(VIDEOS_FILE);
    const list = Object.entries(videos).map(([vid, url]) => ({ vid, url }));
    res.json({ code: 0, data: list });
});

// 管理员添加/更新视频映射
app.post('/api/admin/videos', checkAdmin, (req, res) => {
    const { vid, url } = req.body;
    if (!vid || !url) return res.status(400).json({ code: 1, msg: '参数不完整' });
    const videos = readData(VIDEOS_FILE);
    videos[vid] = url;
    writeData(VIDEOS_FILE, videos);
    res.json({ code: 0, msg: '已保存', data: { vid, url } });
});

// 管理员删除视频映射
app.post('/api/admin/videos/delete', checkAdmin, (req, res) => {
    const { vid } = req.body;
    const videos = readData(VIDEOS_FILE);
    if (!videos[vid]) return res.status(404).json({ code: 1, msg: '不存在' });
    delete videos[vid];
    writeData(VIDEOS_FILE, videos);
    res.json({ code: 0, msg: '已删除' });
});

// ==================== 管理员API ====================

// 登录限流（严格：5次/分钟/IP）
const loginLimiter = rateLimit({
    windowMs: 60000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ code: 429, msg: '登录尝试过于频繁，请1分钟后再试' })
});

// 管理员登录
app.post('/api/admin/login', loginLimiter, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ code: 1, msg: '请输入账号和密码' });
    }
    const accounts = readAccounts();
    const account = accounts[username];
    if (!account) {
        return res.status(401).json({ code: 2, msg: '账号或密码错误' });
    }
    const hash = hashPassword(password, account.salt);
    if (hash !== account.hash) {
        return res.status(401).json({ code: 2, msg: '账号或密码错误' });
    }
    const token = generateToken(username);
    res.json({ code: 0, msg: '登录成功', data: { token, username, name: account.name || username } });
});

// 修改密码（管理员本人）
app.post('/api/admin/change-password', checkAdmin, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ code: 1, msg: '参数不完整' });
    if (newPassword.length < 4) return res.status(400).json({ code: 2, msg: '新密码至少4位' });
    const accounts = readAccounts();
    const account = accounts[req.adminUser];
    if (hashPassword(oldPassword, account.salt) !== account.hash) {
        return res.status(403).json({ code: 3, msg: '原密码错误' });
    }
    const newSalt = crypto.randomBytes(16).toString('hex');
    account.salt = newSalt;
    account.hash = hashPassword(newPassword, newSalt);
    accounts[req.adminUser] = account;
    writeAccounts(accounts);
    res.json({ code: 0, msg: '密码已更新，请重新登录' });
});

// 修改用户名（管理员本人）
app.post('/api/admin/change-username', checkAdmin, (req, res) => {
    const { password, newUsername } = req.body;
    if (!password || !newUsername) return res.status(400).json({ code: 1, msg: '参数不完整' });
    if (newUsername.length < 2) return res.status(400).json({ code: 2, msg: '用户名至少2位' });
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) return res.status(400).json({ code: 3, msg: '用户名只能包含字母数字和下划线' });
    const accounts = readAccounts();
    if (accounts[newUsername]) return res.status(400).json({ code: 4, msg: '该用户名已存在' });
    const account = accounts[req.adminUser];
    if (hashPassword(password, account.salt) !== account.hash) {
        return res.status(403).json({ code: 5, msg: '密码错误' });
    }
    accounts[newUsername] = account;
    delete accounts[req.adminUser];
    writeAccounts(accounts);
    const token = generateToken(newUsername);
    res.json({ code: 0, msg: '用户名已更换，请使用新用户名重新登录', data: { token, username: newUsername } });
});

// 获取服务器配置（管理员）
app.get('/api/admin/config', checkAdmin, (req, res) => {
    const config = readConfig();
    res.json({ code: 0, data: config });
});

// 更新服务器配置（管理员）
app.post('/api/admin/config', checkAdmin, (req, res) => {
    const config = readConfig();
    const { pow, rateLimit: rl, danmakuLimit: dl, security: sec, theme, cdn } = req.body;
    if (pow) config.pow = { ...config.pow, ...pow };
    if (rl) config.rateLimit = { ...config.rateLimit, ...rl };
    if (dl) config.danmakuLimit = { ...config.danmakuLimit, ...dl };
    if (sec) config.security = { ...config.security, ...sec };
    if (theme) config.theme = theme;
    if (cdn) config.cdn = { ...config.cdn, ...cdn };
    writeConfig(config);
    res.json({ code: 0, msg: '配置已更新', data: config });
});

// CDN 公开配置（播放器读取）
app.get('/api/config/public', (req, res) => {
    const config = readConfig();
    res.json({ code: 0, data: { cdn: config.cdn, theme: config.theme || 'bilibili' } });
});

// 获取屏蔽词列表（分页 + 搜索）
app.get('/api/admin/banned-words', checkAdmin, (req, res) => {
    let words = readData(BANNED_WORDS_FILE);
    const search = (req.query.search || '').toLowerCase();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    if (search) {
        words = words.filter(w => w.toLowerCase().includes(search));
    }

    const total = words.length;
    const start = (page - 1) * limit;
    const paged = words.slice(start, start + limit);

    res.json({ code: 0, data: { words: paged, total, page, limit } });
});

// 添加屏蔽词
app.post('/api/admin/banned-words', checkAdmin, (req, res) => {
    const { word } = req.body;
    if (!word || !word.trim()) {
        return res.status(400).json({ code: 1, msg: '关键词不能为空' });
    }
    
    const words = readData(BANNED_WORDS_FILE);
    const newWord = word.trim().toLowerCase();
    
    if (words.map(w => w.toLowerCase()).includes(newWord)) {
        return res.status(400).json({ code: 2, msg: '该关键词已存在' });
    }
    
    words.push(word.trim());
    writeData(BANNED_WORDS_FILE, words);
    res.json({ code: 0, msg: '添加成功', data: words });
});

// 删除屏蔽词
app.delete('/api/admin/banned-words', checkAdmin, (req, res) => {
    const { word } = req.body;
    let words = readData(BANNED_WORDS_FILE);
    const index = words.map(w => w.toLowerCase()).indexOf(word.toLowerCase());
    
    if (index === -1) {
        return res.status(404).json({ code: 1, msg: '关键词不存在' });
    }
    
    words.splice(index, 1);
    writeData(BANNED_WORDS_FILE, words);
    res.json({ code: 0, msg: '删除成功', data: words });
});

// 获取所有弹幕（管理员用，支持筛选）
app.get('/api/admin/danmu', checkAdmin, (req, res) => {
    let danmuList = readData(DANMU_FILE);
    const vid = req.query.vid || '';
    const search = (req.query.search || '').toLowerCase();
    if (vid) danmuList = danmuList.filter(d => d.vid === vid);
    if (search) danmuList = danmuList.filter(d => d.text.toLowerCase().includes(search));
    res.json({ code: 0, data: danmuList });
});

// 获取所有视频码（去重 + 计数）
app.get('/api/admin/danmu/vids', checkAdmin, (req, res) => {
    const danmuList = readData(DANMU_FILE);
    const map = {};
    for (const d of danmuList) {
        if (!map[d.vid]) map[d.vid] = { vid: d.vid, count: 0 };
        map[d.vid].count++;
    }
    const vids = Object.values(map).sort((a, b) => b.count - a.count);
    res.json({ code: 0, data: vids });
});

// 删除弹幕（管理员用）
app.delete('/api/admin/danmu', checkAdmin, (req, res) => {
    const { id } = req.body;
    let danmuList = readData(DANMU_FILE);
    const index = danmuList.findIndex(d => d.id === id);
    
    if (index === -1) {
        return res.status(404).json({ code: 1, msg: '弹幕不存在' });
    }
    
    danmuList.splice(index, 1);
    writeData(DANMU_FILE, danmuList);
    res.json({ code: 0, msg: '删除成功' });
});

// ==================== 字幕检测 ====================

app.get('/api/subtitle/detect', (req, res) => {
    const url = decodeURIComponent(req.query.url || '');
    if (!url) return res.json({ code: 1, msg: '缺少 url 参数' });
    if (/^https?:\/\//i.test(url)) return res.json({ code: 0, data: { subtitle: null } });

    const clean = url.split('?')[0].split('#')[0].replace(/^\//, '');
    const dir = path.dirname(clean);
    const base = path.basename(clean, path.extname(clean));
    const subExts = ['.srt', '.vtt', '.ass', '.ssa', '.webvtt'];
    const searchDir = path.join(__dirname, 'public', dir);

    if (!fs.existsSync(searchDir)) return res.json({ code: 0, data: { subtitle: null } });
    const files = fs.readdirSync(searchDir);
    for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        if (path.basename(f, ext) === base && subExts.includes(ext)) {
            const subPath = '/' + path.join(dir, f).replace(/\\/g, '/');
            return res.json({ code: 0, data: { subtitle: subPath } });
        }
    }
    res.json({ code: 0, data: { subtitle: null } });
});

// ==================== 页面路由 ====================

// 播放器页面
app.get('/player/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

// 管理后台页面（默认入口 + 自定义入口）
app.get('/admin/', serveAdmin);
app.use('/admin', express.static(path.join(__dirname, 'public')));

function serveAdmin(req, res) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
}

// 自定义安全入口（如果配置了 adminPath 则注册额外路由）
function registerAdminRoutes() {
    const config = readConfig();
    if (config.security && config.security.adminPath) {
        const p = '/' + config.security.adminPath.replace(/^\/+|\/+$/g, '') + '/';
        if (p !== '/admin/') {
            app.get(p, serveAdmin);
            app.use(p.replace(/\/$/, ''), express.static(path.join(__dirname, 'public')));
        }
    }
}
registerAdminRoutes();

// ==================== 敏感词库自动更新 ====================

// 从GitHub更新敏感词库
async function updateBannedWordsFromGitHub() {
    const GITHUB_REPO = 'https://github.com/konsheng/Sensitive-lexicon.git';
    const TEMP_DIR = path.join(__dirname, 'temp_lexicon_update');
    const VOCAB_DIR = path.join(TEMP_DIR, 'Vocabulary');
    
    return new Promise((resolve, reject) => {
        console.log('[敏感词库] 开始更新...');
        
        // 清理旧临时目录
        if (fs.existsSync(TEMP_DIR)) {
            fs.rmSync(TEMP_DIR, { recursive: true, force: true });
        }
        
        // 克隆仓库
        exec(`git clone --depth 1 ${GITHUB_REPO} "${TEMP_DIR}"`, (error) => {
            if (error) {
                console.error('[敏感词库] 克隆失败:', error.message);
                return reject(error);
            }
            
            try {
                const words = new Set();
                
                // 读取Vocabulary目录下所有txt文件
                if (fs.existsSync(VOCAB_DIR)) {
                    const files = fs.readdirSync(VOCAB_DIR);
                    for (const file of files) {
                        if (file.endsWith('.txt')) {
                            const filePath = path.join(VOCAB_DIR, file);
                            const content = fs.readFileSync(filePath, 'utf-8');
                            const lines = content.split('\n');
                            for (const line of lines) {
                                const word = line.trim();
                                if (word) words.add(word);
                            }
                        }
                    }
                }
                
                // 保存更新后的词库
                const wordList = Array.from(words).sort();
                fs.writeFileSync(BANNED_WORDS_FILE, JSON.stringify(wordList, null, 2));
                
                // 清理临时目录
                fs.rmSync(TEMP_DIR, { recursive: true, force: true });
                
                console.log(`[敏感词库] 更新完成，共 ${wordList.length} 个敏感词`);
                resolve(wordList.length);
            } catch (err) {
                console.error('[敏感词库] 处理失败:', err.message);
                reject(err);
            }
        });
    });
}

// 定时更新（每24小时）
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24小时

function scheduleUpdate() {
    setInterval(async () => {
        try {
            await updateBannedWordsFromGitHub();
        } catch (err) {
            console.error('[敏感词库] 定时更新失败:', err.message);
        }
    }, UPDATE_INTERVAL);
    console.log('[敏感词库] 已设置定时更新，每24小时自动更新一次');
}

// 启动服务器
app.listen(PORT, () => {
    const config = readConfig();
    console.log(`DPlayer服务已启动: http://localhost:${PORT}`);
    console.log(`播放器地址: http://localhost:${PORT}/player/?url=视频地址`);
    console.log(`管理后台: http://localhost:${PORT}/admin/`);
    console.log(`默认登录账号: admin / admin123`);
    if (config.pow && config.pow.enabled) console.log(`[防火墙] PoW 工作量证明已启用 (难度: ${config.pow.difficulty})`);
    if (config.rateLimit && config.rateLimit.enabled) console.log(`[防火墙] 速率限制已启用 (${config.rateLimit.max}次/${config.rateLimit.windowMs / 1000}s)`);
    console.log('[安全] Helmet 安全头已启用');
    
    // 启动定时更新
    scheduleUpdate();
});