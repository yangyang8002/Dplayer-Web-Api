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

<div align="center">

**⭐ 如果这个项目帮助到你，请给一个 star！⭐**

[回到顶部](#dplayer-web-api)

</div>
