<div align="center">

# DPlayer Web API

**DPlayer Danmaku Video Player System · Web Management Server**

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](Dockerfile)
[![Version](https://img.shields.io/badge/Version-26.8.1-brightgreen.svg)](package.json)

A danmaku video player system built with Node.js + Express + DPlayer. Supports HLS/FLV streaming, danmaku management, PoW firewall, API control & real-time stats, file manager, dual theme system (10 themes each), multi-subtitle switching, admin panel, and more.

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
- **Server-assigned 8-char video ID** (`/api/video/resolve`, legacy hash IDs inherited)
- **Multi-subtitle auto-detect & switch** (SC/TC/EN/JA/KO… with on/off, font size, bottom offset)
- **Danmaku render config** (auto-throttled by server `render.maxPerSecond`)
- **10 color themes** (bilibili / sakura / ocean / sunset / forest / mono / cyber / shoujo / jrpg / neon; server theme priority + local memory)
- Volume memory, screenshot, hotkeys, progress memory
- Fully responsive

### Security
- **PoW challenge** (SHA-256, anti-bot/CC)
- **API rate limiting** (configurable)
- **Per-API enable / RPS / bandwidth control**
- **Danmaku frequency limit** (per IP)
- **Account + password + token auth** (SHA-256 salted hash, 2h expiry)
- **Custom admin path** (anti-scanning)
- **Helmet** security headers

### Admin Panel
- Sidebar navigation · **player + admin theme switchers (10 themes each, server-driven lists)**
- Banned words CRUD with pagination + **subscriptions & one-click/auto word-bank refresh (GitHub)**
- Danmaku list with vid filter + search + **pagination**
- Video management (vid↔URL mapping)
- **File manager** (browse/preview/upload/delete/copy/zip/unzip: zip/7z/tar/tar.gz)
- **Server request logs** (last 500 entries)
- **API management** (1s-precision charts, 1-90 day retention, calls/bandwidth)
- Server config (PoW/rate/danmaku limit/**render**/CDN/themes/security entry/password/username)
- About page (developer avatar + dependency credits)

### Other
- CDN video proxy (auto prepend CDN base URL)
- Auto subtitle detection (same-directory + language-suffix matching)
- **Theme system**: folder-based themes under `theme/`, built with `node theme/build.js`, custom themes supported (see `public/CUSTOM_THEME.md`)
- **Danmaku perf-test script** (`gen_perf_danmu.js`)
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
| GET/POST/DELETE | `/api/admin/banned-words/subscriptions` | Word-bank subscriptions |
| POST | `/api/admin/banned-words/refresh` | Refresh word bank now |
| GET/POST | `/api/admin/danmu?page=&limit=` | Danmaku list (paginated) |
| GET/POST | `/api/admin/videos` | Video mappings |
| GET | `/api/admin/files?path=` | File browser/viewer |
| POST | `/api/admin/files/{delete,copy,zip,unzip,upload}` | File operations |
| GET | `/api/admin/logs?limit=` | Request logs |
| GET | `/api/admin/api/stats?span=` | API stats charts |
| POST | `/api/admin/api` | API enable/RPS/retention |

### Public API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config/public` | CDN & theme & render config |
| GET | `/api/video/resolve?url=` | Server-assigned video ID |
| GET | `/api/subtitle/detect?url=` | Auto-detect subtitles (multi-lang) |
| POST | `/api/subtitle/external` | Accept external subtitle URL |
| POST | `/api/video/map` | Report vid→URL |
| POST | `/api/pow/verify` | PoW verification |
| GET | `/api/theme/player/list` / `/api/theme/admin/list` | Theme lists |
| GET | `/api/theme/player.css` / `/api/theme/admin.css` | Theme CSS bundles |

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
- **File management**: [Multer](https://github.com/expressjs/multer) + [7zip-bin](https://github.com/andreafabrizi/7zip-bin)

## License

[MIT](LICENSE) · Copyright &copy; 2026 [yangyang8002](https://github.com/yangyang8002)

---

<div align="center">

**⭐ If this project helps you, please give it a star! ⭐**

[Back to Top](#dplayer-web-api)

</div>
