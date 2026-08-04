<div align="center">

# DPlayer Web API

**DPlayer Danmaku Video Player System · Web Management Server**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](Dockerfile)
[![Version](https://img.shields.io/badge/Version-1.1.0-brightgreen.svg)](package.json)

A danmaku video player system built with Node.js + Express + DPlayer. Supports HLS/FLV streaming, danmaku management, PoW firewall, rate limiting, multi-theme, auto subtitle matching, admin panel, and more.

</div>

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Tech Stack](#tech-stack)
- [License](#license)

---

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
