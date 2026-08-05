<div align="center">

# DPlayer Web API

**DPlayer 弹幕视频播放系统 · Web 管理服务端**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](Dockerfile)
[![Version](https://img.shields.io/badge/Version-26.8.1-brightgreen.svg)](package.json)

基于 Node.js + Express + DPlayer 的弹幕视频播放系统。支持 HLS/FLV 流媒体、弹幕发送管理、PoW 防火墙、API 限流与实时统计、文件管理、双主题系统（各 10 套）、多字幕切换、管理后台等。

</div>

---

## 目录

- [功能概览](#功能概览)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [Docker 部署](#docker-部署)
- [API 接口](#api-接口)
- [配置说明](#配置说明)
- [环境变量](#环境变量)
- [反向代理](#反向代理)
- [技术栈](#技术栈)
- [鸣谢](#鸣谢)
- [License](#license)

---

## 功能概览

### 播放器
- HLS (m3u8) / FLV / MP4 自动识别
- 弹幕发送（bilibili 风格输入框）、滚动/顶部/底部弹幕
- 弹幕遮蔽（无极滑块，防挡字幕）
- **服务端分配 8 位视频 ID**（`/api/video/resolve`，自动继承旧散列 ID，弹幕不丢）
- **多字幕自动检测与切换**（简/繁/日/英/韩…，字幕开关 / 字号 / 底距设置）
- **弹幕渲染配置**（跟随服务器 `render.maxPerSecond` 自动限流）
- **10 套配色主题**（bilibili / sakura / ocean / sunset / forest / mono / cyber / shoujo / jrpg / neon，服务器主题优先 + 本地记忆）
- 音量记忆、截图、热键、进度记忆
- 全平台响应式

### 安全
- **PoW 工作量证明**（SHA-256 挑战，防爬虫/CC）
- **API 速率限制**（express-rate-limit，可配置）
- **API 独立开关 / RPS / 带宽控制**（按 API 路由精确管控）
- **弹幕频率限制**（按 IP 计数，防刷屏）
- **账号+密码+令牌认证**（SHA-256 加盐哈希，2小时过期）
- **自定义管理入口路径**（防扫描）
- **Helmet 安全头**

### 管理后台
- 侧栏导航 · **播放器 + 后台双主题各 10 套实时切换**（服务器主题列表动态加载）
- 屏蔽词管理（增删查分页 + **自定义词库订阅** + GitHub 敏感词库一键/定时刷新）
- 弹幕列表（视频码筛选 + 内容搜索 + **分页** + 侧栏快捷跳转）
- 视频管理（vid↔URL 映射，自动记录 + 手动维护）
- **文件管理**（浏览/预览/上传/删除/复制/压缩/解压，支持 zip/7z/tar/tar.gz）
- **服务器日志**（最近 500 条请求记录）
- **API 管理**（1s 精度统计曲线，1-90 天保留，调用量/带宽/耗时图表）
- 服务器配置（PoW/速率/弹幕频率/**弹幕渲染**/CDN/主题/安全入口/改密码/改用户名）
- 关于页（开发者头像 + 依赖鸣谢）

### 其他
- CDN 视频源代理（播放器自动拼接 CDN 前缀）
- 字幕自动检测（同目录同名词幕 + 多语言后缀）
- **主题系统**：`theme/` 目录文件夹式主题，`node theme/build.js` 构建，支持自定义主题导入（见 `public/CUSTOM_THEME.md`）
- **弹幕压测脚本**（`gen_perf_danmu.js`，一键生成海量测试弹幕）
- MiSans 字体全站应用
- Docker / Nginx / Caddy 部署支持

## 项目结构

```
Dplayer-Web-Api/
├── server.js              # Express 服务端
├── gen_perf_danmu.js      # 弹幕压测脚本（生成海量测试弹幕）
├── package.json
├── Dockerfile / docker-compose.yml
├── nginx.conf.example
├── theme/                 # 主题系统（player + admin 各 10 套）
│   ├── build.js           # 主题构建脚本（node theme/build.js）
│   ├── player.css         # 构建产物：播放器主题包
│   ├── admin.css          # 构建产物：后台主题包
│   ├── player/<id>/       # 播放器主题（theme.json + 可选 style.css）
│   └── admin/<id>/        # 后台主题
├── data/
│   ├── danmu.json         # 弹幕数据
│   ├── banned_words.json  # 敏感词库
│   ├── accounts.json      # 账号密码（SHA-256 哈希）
│   ├── config.json        # 服务器配置
│   ├── videos.json        # 视频码映射
│   └── api-stats.json     # API 统计（1s 精度，重启不丢）
└── public/
    ├── player.html        # 播放器页面
    ├── admin.html         # 管理后台
    ├── CUSTOM_THEME.md    # 自定义主题导入指南
    └── favicon.svg
```

## 快速开始

```bash
git clone https://github.com/yangyang8002/Dplayer-Web-Api.git
cd Dplayer-Web-Api
npm install
npm start
```

访问：
| 页面 | 地址 |
|------|------|
| 播放器 | `http://localhost:1919/player/?url=视频地址` |
| 管理后台 | `http://localhost:1919/admin/` |

**默认账号：** `admin` / `admin123`

## Docker 部署

### 使用 Docker Compose（推荐）

```bash
git clone https://github.com/yangyang8002/Dplayer-Web-Api.git
cd Dplayer-Web-Api
docker compose up -d
```

数据持久化在 `./data` 目录，包括弹幕、屏蔽词、账号、配置等。

### 手动构建

```bash
docker build -t dplayer-web-api .
docker run -d \
  --name dplayer-api \
  -p 1919:1919 \
  -v ./data:/app/data \
  dplayer-web-api
```

### 使用 GitHub 镜像

```bash
docker run -d \
  --name dplayer-api \
  -p 1919:1919 \
  -v ./data:/app/data \
  ghcr.io/yangyang8002/dplayer-web-api:latest
```

> 基础镜像 `node:22-alpine`，内置 git（用于敏感词库自动更新）。

## API 接口

### 弹幕 API（DPlayer v3）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/danmu/v3/?id=VID` | 获取弹幕 |
| POST | `/api/danmu/v3/` | 发送弹幕 |

```json
// POST body
{ "id": "vid", "author": "user", "time": 10, "text": "弹幕", "color": 16777215, "type": 0 }
```

### 管理 API（需 Bearer Token）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 登录获取 token |
| GET | `/api/admin/config` | 获取配置 |
| POST | `/api/admin/config` | 更新配置 |
| POST | `/api/admin/change-password` | 修改密码 |
| POST | `/api/admin/change-username` | 修改用户名 |
| GET | `/api/admin/banned-words` | 屏蔽词列表（分页） |
| POST | `/api/admin/banned-words` | 添加屏蔽词 |
| POST | `/api/admin/banned-words/delete`（旧）| 删除屏蔽词 |
| GET/POST/DELETE | `/api/admin/banned-words/subscriptions` | 词库订阅管理 |
| POST | `/api/admin/banned-words/refresh` | 立即刷新词库（GitHub + 订阅） |
| GET | `/api/admin/danmu?vid=&search=&page=&limit=` | 筛选弹幕（分页） |
| GET | `/api/admin/danmu/vids` | 视频码列表 |
| GET | `/api/admin/videos` | 视频映射列表 |
| POST | `/api/admin/videos` | 添加视频映射 |
| POST | `/api/admin/videos/delete` | 删除视频映射 |
| GET | `/api/admin/files?path=` | 文件浏览/查看 |
| POST | `/api/admin/files/delete` | 批量删除 |
| POST | `/api/admin/files/copy` | 批量复制 |
| POST | `/api/admin/files/zip` | 压缩（zip/7z/tar/tar.gz） |
| POST | `/api/admin/files/unzip` | 解压（zip/7z/rar/tar/gz/xz 等） |
| POST | `/api/admin/files/upload` | 上传文件 |
| GET | `/api/admin/logs?limit=` | 请求日志 |
| GET | `/api/admin/api/stats?span=` | API 统计（1s 精度曲线） |
| POST | `/api/admin/api` | API 开关/RPS/保留天数 |

### 公开 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config/public` | CDN + 主题 + 渲染配置 |
| GET | `/api/video/resolve?url=` | 服务端分配视频 ID（8 位，自动继承旧 ID） |
| POST | `/api/video/map` | 播放器上报 vid→URL |
| GET | `/api/subtitle/detect?url=` | 字幕自动检测（多语言列表） |
| POST | `/api/subtitle/external` | 接受外部字幕 url |
| POST | `/api/pow/verify` | PoW 验证（内部使用） |
| GET | `/api/theme/player/list` | 播放器主题列表 |
| GET | `/api/theme/admin/list` | 后台主题列表 |
| GET | `/api/theme/player.css` | 播放器主题 CSS |
| GET | `/api/theme/admin.css` | 后台主题 CSS |

## 配置说明

所有配置可通过管理后台实时修改，或直接编辑 `data/config.json`：

```json
{
  "pow": { "enabled": false, "difficulty": 4 },
  "rateLimit": { "enabled": false, "windowMs": 60000, "max": 60 },
  "danmakuLimit": { "enabled": false, "maxPerMinute": 10 },
  "render": { "maxPerSecond": 250, "speedJitter": 10 },
  "api": { "apis": { "/api/config/public": { "enabled": true, "rps": 0, "bandwidth": 0 }, "...": "..." }, "retentionDays": 1 },
  "bannedWords": { "subscriptions": [] },
  "security": { "sessionMinutes": 120, "adminPath": "" },
  "theme": "bilibili",
  "adminTheme": "bilibili",
  "cdn": { "enabled": false, "baseUrl": "" }
}
```

> `security.adminPath`：设为 "secret" 则管理入口变为 `/secret/`，默认 `/admin/` 仍可用。需重启生效。
> `api.apis`：按路由前缀控制每个 API 的开关 / 每秒请求数（rps）/ 带宽追踪，`retentionDays` 为统计保留天数（1-90）。
> 自定义主题：在 `theme/player/<id>/`（或 `theme/admin/<id>/`）放入 `theme.json` 后运行 `node theme/build.js`，详见 `public/CUSTOM_THEME.md`。

## 环境变量

| 变量 | 默认 | 说明 |
|------|------|------|
| `PORT` | `1919` | 服务端口 |

## 反向代理

详见 `nginx.conf.example`。推荐配合 Caddy 一键 HTTPS。

## 技术栈

- **后端**：Node.js + Express 5
- **前端**：Vanilla JS + CSS Custom Properties 主题
- **播放器**：[DPlayer](https://github.com/DIYgod/DPlayer) 1.27.1
- **流媒体**：[hls.js](https://github.com/video-dev/hls.js) + [flv.js](https://github.com/bilibili/flv.js)
- **字体**：[MiSans](https://github.com/microsoft/misans) 4.1
- **安全**：[Helmet](https://helmetjs.github.io) + [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
- **文件管理**：[Multer](https://github.com/expressjs/multer) + [7zip-bin](https://github.com/andreafabrizi/7zip-bin)（压缩/解压）

## 鸣谢

- [DPlayer](https://github.com/DIYgod/DPlayer) · HTML5 弹幕播放器
- [Sensitive-lexicon](https://github.com/konsheng/Sensitive-lexicon) · 敏感词库

## License

[MIT](LICENSE) · Copyright &copy; 2026 [yangyang8002](https://github.com/yangyang8002)

---

<div align="center">

**⭐ 如果这个项目帮助到你，请给一个 star！⭐**

[回到顶部](#dplayer-web-api)

</div>
