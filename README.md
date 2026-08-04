<div align="center">

# DPlayer Web API

**DPlayer 弹幕视频播放系统 · Web 管理服务端**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](Dockerfile)
[![Version](https://img.shields.io/badge/Version-1.1.0-brightgreen.svg)](package.json)

基于 Node.js + Express + DPlayer 的弹幕视频播放系统。支持 HLS/FLV 流媒体、弹幕发送管理、PoW 防火墙、速率限制、多主题切换、字幕自动匹配、管理后台等。

</div>

---

## 目录

- [中文文档](#中文文档)
- [English Documentation](#english-documentation)

---

# 中文文档

## 功能概览

### 播放器
- HLS (m3u8) / FLV / MP4 自动识别
- 弹幕发送（bilibili 风格输入框）、滚动/顶部/底部弹幕
- 弹幕遮蔽（无极滑块，防挡字幕）
- 6 套配色主题（bilibili / sakura / ocean / sunset / forest / mono）
- 截图、热键、进度记忆、字幕自动检测
- 全平台响应式

### 安全
- **PoW 工作量证明**（SHA-256 挑战，防爬虫/CC）
- **API 速率限制**（express-rate-limit，可配置）
- **弹幕频率限制**（按 IP 计数，防刷屏）
- **账号+密码+令牌认证**（SHA-256 加盐哈希，2小时过期）
- **自定义管理入口路径**（防扫描）
- **Helmet 安全头**

### 管理后台
- 侧栏导航 · 6 套主题实时切换
- 屏蔽词管理（增删查分页）
- 弹幕列表（视频码筛选 + 内容搜索 + 侧栏快捷跳转）
- 视频管理（vid↔URL 映射，自动记录 + 手动维护）
- 服务器配置（PoW/速率/频率/CDN/安全入口/主题/改密码/改用户名）
- 关于页（开发者头像 + 依赖鸣谢）

### 其他
- CDN 视频源代理（播放器自动拼接 CDN 前缀）
- 字幕自动检测（同目录同名词幕文件）
- MiSans 字体全站应用
- Docker / Nginx / Caddy 部署支持

## 项目结构

```
Dplayer-Web-Api/
├── server.js              # Express 服务端
├── package.json
├── Dockerfile / docker-compose.yml
├── nginx.conf.example
├── data/
│   ├── danmu.json         # 弹幕数据
│   ├── banned_words.json  # 敏感词库
│   ├── accounts.json      # 账号密码（SHA-256 哈希）
│   ├── config.json        # 服务器配置
│   └── videos.json        # 视频码映射
└── public/
    ├── player.html        # 播放器页面
    └── admin.html         # 管理后台
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

```bash
docker-compose up -d
# 或
docker build -t dplayer-web-api .
docker run -d -p 1919:1919 -v ./data:/app/data dplayer-web-api
```

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
| GET | `/api/admin/danmu?vid=&search=` | 筛选弹幕 |
| GET | `/api/admin/danmu/vids` | 视频码列表 |
| GET | `/api/admin/videos` | 视频映射列表 |
| POST | `/api/admin/videos` | 添加视频映射 |
| POST | `/api/admin/videos/delete` | 删除视频映射 |

### 公开 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config/public` | CDN + 主题配置 |
| GET | `/api/subtitle/detect?url=` | 字幕自动检测 |
| POST | `/api/video/map` | 播放器上报 vid→URL |
| POST | `/api/pow/verify` | PoW 验证（内部使用） |

## 配置说明

所有配置可通过管理后台实时修改，或直接编辑 `data/config.json`：

```json
{
  "pow": { "enabled": false, "difficulty": 4 },
  "rateLimit": { "enabled": false, "windowMs": 60000, "max": 60 },
  "danmakuLimit": { "enabled": false, "maxPerMinute": 10 },
  "security": { "sessionMinutes": 120, "adminPath": "" },
  "theme": "bilibili",
  "cdn": { "enabled": false, "baseUrl": "" }
}
```

> `security.adminPath`：设为 "secret" 则管理入口变为 `/secret/`，默认 `/admin/` 仍可用。需重启生效。

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

## 鸣谢

- [DPlayer](https://github.com/DIYgod/DPlayer) · HTML5 弹幕播放器
- [Sensitive-lexicon](https://github.com/konsheng/Sensitive-lexicon) · 敏感词库

## License

[MIT](LICENSE) · Copyright &copy; 2026 [yangyang8002](https://github.com/yangyang8002)

---

# English Documentation

## Features

### Player
- HLS / FLV / MP4 auto-detection
- Danmaku input (bilibili-style), scroll/top/bottom modes
- Danmaku occlusion (stepless slider)
- 6 color themes (bilibili / sakura / ocean / sunset / forest / mono)
- Screenshot, hotkeys, progress memory, auto subtitle detection
- Fully responsive

### Security
- **PoW challenge** (SHA-256, anti-bot/CC)
- **API rate limiting** (configurable)
- **Danmaku frequency limit** (per IP)
- **Account + password + token auth** (SHA-256 salted hash, 2h expiry)
- **Custom admin path** (anti-scanning)
- **Helmet** security headers

### Admin Panel
- Sidebar navigation · real-time theme switching
- Banned words CRUD with pagination
- Danmaku list with vid filter + search
- Video management (vid↔URL mapping)
- Server config (PoW/rate/frequency/CDN/security entry/theme/password/username)
- About page (developer avatar + dependency credits)

### Other
- CDN video proxy (auto prepend CDN base URL)
- Auto subtitle detection (same-directory matching)
- MiSans font

## Quick Start

```bash
git clone https://github.com/yangyang8002/Dplayer-Web-Api.git
cd Dplayer-Web-Api
npm install
npm start
```

| Page | URL |
|------|-----|
| Player | `http://localhost:1919/player/?url=VIDEO_URL` |
| Admin | `http://localhost:1919/admin/` |

**Default account:** `admin` / `admin123`

## API Reference

### Danmaku API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/danmu/v3/?id=VID` | Get danmaku |
| POST | `/api/danmu/v3/` | Send danmaku |

### Admin API (Bearer Token)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/login` | Login |
| GET/POST | `/api/admin/config` | Get/update config |
| GET/POST | `/api/admin/banned-words` | Banned words |
| GET/POST | `/api/admin/danmu` | Danmaku list |
| GET/POST | `/api/admin/videos` | Video mappings |

### Public API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config/public` | CDN & theme config |
| GET | `/api/subtitle/detect?url=` | Auto-detect subtitle |
| POST | `/api/video/map` | Report vid→URL |
| POST | `/api/pow/verify` | PoW verification |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `1919` | Server port |

## Tech Stack

- **Backend**: Node.js + Express 5
- **Frontend**: Vanilla JS + CSS Custom Properties themes
- **Player**: [DPlayer](https://github.com/DIYgod/DPlayer) 1.27.1
- **Streaming**: [hls.js](https://github.com/video-dev/hls.js) + [flv.js](https://github.com/bilibili/flv.js)
- **Font**: [MiSans](https://github.com/microsoft/misans) 4.1
- **Security**: [Helmet](https://helmetjs.github.io) + [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)

## License

[MIT](LICENSE) · Copyright &copy; 2026 [yangyang8002](https://github.com/yangyang8002)

---

<div align="center">

**⭐ If this project helps you, please give it a star! ⭐**

[Back to Top](#dplayer-web-api)

</div>
