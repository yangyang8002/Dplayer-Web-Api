<div align="center">

# DPlayer Web API

**弹幕视频播放系统 API 服务**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D14-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](Dockerfile)

一个基于 Node.js + Express + DPlayer 的弹幕视频播放系统，支持多种视频格式、弹幕发送与管理、敏感词过滤等功能。

**Repository:** https://github.com/yangyang8002/Dplayer-Web-Api

</div>

---

## 📖 目录 / Table of Contents

- [中文文档](#中文文档)
  - [功能介绍](#功能介绍)
  - [项目结构](#项目结构)
  - [部署方式](#部署方式)
  - [反向代理配置](#反向代理配置)
  - [API 接口](#api-接口)
  - [配置说明](#配置说明)
- [English Documentation](#english-documentation)
  - [Features](#features)
  - [Project Structure](#project-structure)
  - [Deployment](#deployment)
  - [Reverse Proxy](#reverse-proxy)
  - [API Reference](#api-reference)
  - [Configuration](#configuration)

---

# 中文文档

## 功能介绍

### 🎬 视频播放器
- 支持多种视频格式：普通视频、HLS(m3u8)、FLV
- 自动识别视频类型
- 支持截图、热键、循环播放等功能
- 响应式全屏播放界面

### 💬 弹幕系统
- 兼容 DPlayer v3 标准格式 API
- 支持弹幕发送、颜色自定义、位置设置（滚动/顶部/底部）
- 按视频ID自动分组弹幕
- 敏感词自动过滤

### 🛡️ 敏感词过滤
- 内置敏感词库，自动过滤违规弹幕
- 支持从 GitHub 自动更新敏感词库（每24小时）
- 管理员可手动添加/删除屏蔽词

### 🔧 管理后台
- 密码登录验证
- 弹幕列表查看与删除
- 屏蔽词管理（添加/删除）

### 🌐 部署支持
- 支持 Docker 容器化部署
- 支持 Nginx/Caddy 反向代理
- 支持 HTTPS 配置
- 跨域请求支持（CORS）

## 项目结构

```
Dplayer-Web-Api/
├── server.js            # 服务端主文件
├── package.json         # 项目依赖配置
├── Dockerfile           # Docker 镜像构建文件
├── docker-compose.yml   # Docker Compose 配置
├── nginx.conf.example   # Nginx 反代配置示例
├── data/
│   ├── danmu.json       # 弹幕数据存储
│   └── banned_words.json # 屏蔽词库
└── public/
    ├── player.html      # 播放器页面
    └── admin.html       # 管理后台页面
```

## 部署方式

### 方式一：直接运行

```bash
# 克隆仓库
git clone https://github.com/yangyang8002/Dplayer-Web-Api.git
cd Dplayer-Web-Api

# 安装依赖
npm install

# 启动服务
npm start

# 或指定端口
PORT=8080 npm start
```

### 方式二：Docker 部署

```bash
# 克隆仓库
git clone https://github.com/yangyang8002/Dplayer-Web-Api.git
cd Dplayer-Web-Api

# 使用 Docker Compose 启动
docker-compose up -d

# 或手动构建
docker build -t dplayer-web-api .
docker run -d -p 1919:1919 -v $(pwd)/data:/app/data dplayer-web-api
```

### 方式三：使用已发布的 Docker 镜像

```bash
docker run -d \
  --name dplayer-api \
  -p 1919:1919 \
  -v ./data:/app/data \
  ghcr.io/yangyang8002/dplayer-web-api:latest
```

### 环境要求

- Node.js >= 14.x
- npm 或 yarn
- Git（用于敏感词库自动更新）
- Docker（可选）

### 访问地址

| 页面 | 地址 |
|------|------|
| 播放器 | `http://localhost:1919/player/?url=视频地址` |
| 管理后台 | `http://localhost:1919/admin/` |

**默认管理员密码：** `admin123`

## 反向代理配置

### Nginx 配置

1. 复制配置示例：
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/dplayer-api
sudo ln -s /etc/nginx/sites-available/dplayer-api /etc/nginx/sites-enabled/
```

2. 修改配置文件中的域名：
```nginx
server_name your-domain.com;  # 改为你的域名
```

3. 测试并重载 Nginx：
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### HTTPS 配置（推荐使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### Caddy 配置（更简单）

创建 `Caddyfile`：
```
your-domain.com {
    reverse_proxy localhost:1919
}
```

Caddy 会自动配置 HTTPS。

## API 接口

### 弹幕 API（DPlayer v3 格式）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/danmu/v3/?id=视频ID` | 获取弹幕列表 |
| POST | `/api/danmu/v3/` | 发送弹幕 |

**POST 弹幕参数：**
```json
{
  "id": "视频ID",
  "author": "发送者",
  "time": 10.5,
  "text": "弹幕内容",
  "color": 16777215,
  "type": 0
}
```

**type 类型：**
- `0` - 滚动弹幕
- `1` - 顶部弹幕
- `2` - 底部弹幕

### 管理 API（需密码验证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/banned-words` | 获取屏蔽词列表 |
| POST | `/api/admin/banned-words` | 添加屏蔽词 |
| DELETE | `/api/admin/banned-words` | 删除屏蔽词 |
| GET | `/api/admin/danmu` | 获取所有弹幕 |
| DELETE | `/api/admin/danmu` | 删除弹幕 |

**认证方式：**
- 请求头添加 `X-Admin-Password`
- 或请求体添加 `password` 字段

```bash
# 示例
curl -H "X-Admin-Password: admin123" http://localhost:1919/api/admin/danmu
```

## 配置说明

### 端口配置

```bash
# 通过环境变量
PORT=8080 npm start

# 或在 server.js 中修改
const PORT = process.env.PORT || 1919;
```

### 管理员密码

在 `server.js` 中修改：
```javascript
const ADMIN_PASSWORD = 'your_password_here';
```

### 敏感词库

- 数据文件：`data/banned_words.json`
- 自动更新源：`konsheng/Sensitive-lexicon`
- 更新间隔：每 24 小时

---

# English Documentation

## Features

### 🎬 Video Player
- Support multiple formats: regular video, HLS (m3u8), FLV
- Auto-detect video type
- Screenshot, hotkeys, loop playback support
- Responsive fullscreen interface

### 💬 Danmaku System
- Compatible with DPlayer v3 standard API format
- Color customization, position settings (scroll/top/bottom)
- Auto-grouping by video ID
- Auto sensitive word filtering

### 🛡️ Content Filtering
- Built-in sensitive word library
- Auto-update from GitHub (every 24 hours)
- Manual management via admin panel

### 🔧 Admin Panel
- Password authentication
- Danmaku list viewing and deletion
- Banned words management

### 🌐 Deployment Support
- Docker containerization
- Nginx/Caddy reverse proxy
- HTTPS configuration
- CORS support

## Project Structure

```
Dplayer-Web-Api/
├── server.js            # Main server file
├── package.json         # Dependencies
├── Dockerfile           # Docker image build
├── docker-compose.yml   # Docker Compose config
├── nginx.conf.example   # Nginx reverse proxy example
├── data/
│   ├── danmu.json       # Danmaku data
│   └── banned_words.json # Banned words
└── public/
    ├── player.html      # Player page
    └── admin.html       # Admin panel
```

## Deployment

### Method 1: Direct Run

```bash
# Clone repository
git clone https://github.com/yangyang8002/Dplayer-Web-Api.git
cd Dplayer-Web-Api

# Install dependencies
npm install

# Start server
npm start

# Or with custom port
PORT=8080 npm start
```

### Method 2: Docker Deployment

```bash
# Clone repository
git clone https://github.com/yangyang8002/Dplayer-Web-Api.git
cd Dplayer-Web-Api

# Start with Docker Compose
docker-compose up -d

# Or build manually
docker build -t dplayer-web-api .
docker run -d -p 1919:1919 -v $(pwd)/data:/app/data dplayer-web-api
```

### Requirements

- Node.js >= 14.x
- npm or yarn
- Git (for auto-update of sensitive words)
- Docker (optional)

### Access URLs

| Page | URL |
|------|-----|
| Player | `http://localhost:1919/player/?url=VIDEO_URL` |
| Admin | `http://localhost:1919/admin/` |

**Default Admin Password:** `admin123`

## Reverse Proxy

### Nginx Configuration

1. Copy example config:
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/dplayer-api
sudo ln -s /etc/nginx/sites-available/dplayer-api /etc/nginx/sites-enabled/
```

2. Edit domain:
```nginx
server_name your-domain.com;  # Change to your domain
```

3. Test and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### HTTPS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Caddy (Simpler Option)

Create `Caddyfile`:
```
your-domain.com {
    reverse_proxy localhost:1919
}
```

Caddy handles HTTPS automatically.

## API Reference

### Danmaku API (DPlayer v3 Format)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/danmu/v3/?id=VIDEO_ID` | Get danmaku list |
| POST | `/api/danmu/v3/` | Send danmaku |

**POST Parameters:**
```json
{
  "id": "video_id",
  "author": "sender",
  "time": 10.5,
  "text": "danmaku content",
  "color": 16777215,
  "type": 0
}
```

**Type Values:**
- `0` - Scroll
- `1` - Top
- `2` - Bottom

### Admin API (Authentication Required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/banned-words` | Get banned words |
| POST | `/api/admin/banned-words` | Add banned word |
| DELETE | `/api/admin/banned-words` | Delete banned word |
| GET | `/api/admin/danmu` | Get all danmaku |
| DELETE | `/api/admin/danmu` | Delete danmaku |

**Authentication:**
- Add `X-Admin-Password` header
- Or add `password` field in request body

```bash
# Example
curl -H "X-Admin-Password: admin123" http://localhost:1919/api/admin/danmu
```

## Configuration

### Port

```bash
# Environment variable
PORT=8080 npm start

# Or modify in server.js
const PORT = process.env.PORT || 1919;
```

### Admin Password

Modify in `server.js`:
```javascript
const ADMIN_PASSWORD = 'your_password_here';
```

---

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Player:** DPlayer
- **Streaming:** hls.js + flv.js

## License

[MIT License](LICENSE)

Copyright (c) 2026 yangyang8002

---

<div align="center">

**⭐ If this project helps you, please give it a star! ⭐**

[⬆ Back to Top](#dplayer-web-api)

</div>