const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 1919;

// 信任反向代理（支持 Nginx/Caddy 等反代）
app.set('trust proxy', true);

// 中间件
app.use(express.json());
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

// 数据文件路径
const DATA_DIR = path.join(__dirname, 'data');
const DANMU_FILE = path.join(DATA_DIR, 'danmu.json');
const BANNED_WORDS_FILE = path.join(DATA_DIR, 'banned_words.json');
const ADMIN_PASSWORD = 'admin123'; // 管理员密码，可修改

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
    
    // 转换为DPlayer标准格式
    const danmakuData = danmuList.map(d => ({
        time: d.time,
        type: d.type === 'right' ? 0 : (d.type === 'top' ? 1 : 2),
        color: parseInt(d.color.replace('#', ''), 16),
        author: d.author || 'anonymous',
        text: d.text
    }));
    
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
    
    const danmakuData = danmuList.map(d => ({
        time: d.time,
        type: d.type === 'right' ? 0 : (d.type === 'top' ? 1 : 2),
        color: parseInt(d.color.replace('#', ''), 16),
        author: d.author || 'anonymous',
        text: d.text
    }));
    
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
    
    // 转换为DPlayer标准格式
    const danmakuData = danmuList.map(d => ({
        time: d.time,
        type: d.type === 'right' ? 0 : (d.type === 'top' ? 1 : 2),
        color: parseInt(d.color.replace('#', ''), 16),
        author: d.author || 'anonymous',
        text: d.text
    }));
    
    console.log(`[弹幕API] 返回 ${danmakuData.length} 条弹幕`);
    res.json({ code: 0, data: danmakuData });
});

// 发送弹幕 - DPlayer标准格式
// DPlayer POST格式: POST /api/danmu/  body: { id, author, time, text, color, type }
app.post('/api/danmu/', (req, res) => {
    const { id, text, color, type, time, author } = req.body;
    console.log(`[弹幕API] POST 请求 - 视频ID: ${id}, 内容: ${text}`);
    
    if (!id || !text) {
        console.log(`[弹幕API] 参数不完整 - id: ${id}, text: ${text}`);
        return res.status(400).json({ code: 1, msg: '参数不完整' });
    }
    
    // 检查屏蔽词
    if (containsBannedWord(text)) {
        console.log(`[弹幕API] 弹幕包含屏蔽词: ${text}`);
        return res.status(403).json({ code: 2, msg: '弹幕包含屏蔽词' });
    }
    
    const danmuList = readData(DANMU_FILE);
    
    // 转换type: DPlayer格式 0=right, 1=top, 2=bottom
    let danmuType = 'right';
    if (type === 1) danmuType = 'top';
    else if (type === 2) danmuType = 'bottom';
    
    // 转换color: 数字转hex
    let colorHex = '#ffffff';
    if (color !== undefined) {
        colorHex = '#' + parseInt(color).toString(16).padStart(6, '0');
    }
    
    const newDanmu = {
        id: Date.now().toString(),
        vid: id,
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
    const { id, text, color, type, time, author } = req.body;
    console.log(`[弹幕API] POST 请求 - 视频ID: ${id}, 内容: ${text}`);
    
    if (!id || !text) {
        console.log(`[弹幕API] 参数不完整 - id: ${id}, text: ${text}`);
        return res.status(400).json({ code: 1, msg: '参数不完整' });
    }
    
    // 检查屏蔽词
    if (containsBannedWord(text)) {
        console.log(`[弹幕API] 弹幕包含屏蔽词: ${text}`);
        return res.status(403).json({ code: 2, msg: '弹幕包含屏蔽词' });
    }
    
    const danmuList = readData(DANMU_FILE);
    
    // 转换type: DPlayer格式 0=right, 1=top, 2=bottom
    let danmuType = 'right';
    if (type === 1) danmuType = 'top';
    else if (type === 2) danmuType = 'bottom';
    
    // 转换color: 数字转hex
    let colorHex = '#ffffff';
    if (color !== undefined) {
        colorHex = '#' + parseInt(color).toString(16).padStart(6, '0');
    }
    
    const newDanmu = {
        id: Date.now().toString(),
        vid: id,
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

// ==================== 管理员API ====================

// 管理员登录验证中间件
function checkAdmin(req, res, next) {
    const password = req.headers['x-admin-password'] || req.body.password;
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ code: 1, msg: '密码错误' });
    }
    next();
}

// 获取屏蔽词列表
app.get('/api/admin/banned-words', checkAdmin, (req, res) => {
    const words = readData(BANNED_WORDS_FILE);
    res.json({ code: 0, data: words });
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

// 获取所有弹幕（管理员用）
app.get('/api/admin/danmu', checkAdmin, (req, res) => {
    const danmuList = readData(DANMU_FILE);
    res.json({ code: 0, data: danmuList });
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

// ==================== 页面路由 ====================

// 播放器页面
app.get('/player/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

// 管理后台页面
app.get('/admin/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

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
    console.log(`DPlayer服务已启动: http://localhost:${PORT}`);
    console.log(`播放器地址: http://localhost:${PORT}/player/?url=视频地址`);
    console.log(`管理后台: http://localhost:${PORT}/admin/`);
    console.log(`默认管理员密码: ${ADMIN_PASSWORD}`);
    
    // 启动定时更新
    scheduleUpdate();
});