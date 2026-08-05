# Docker 部署指南 · Deployment Guide

DPlayer Web API 支持 Docker / Docker Compose 部署，基础镜像 `node:22-alpine`，约 200MB。

---

## 快速开始

### Docker Compose（推荐）

```bash
git clone https://github.com/yangyang8002/Dplayer-Web-Api.git
cd Dplayer-Web-Api
docker compose up -d
```

### 手动构建

```bash
docker build -t dplayer-web-api .
docker run -d \
  --name dplayer-api \
  -p 1919:1919 \
  -v ./data:/app/data \
  dplayer-web-api
```

### 预构建镜像（GitHub Container Registry）

```bash
docker pull ghcr.io/yangyang8002/dplayer-web-api:latest
docker run -d \
  --name dplayer-api \
  -p 1919:1919 \
  -v ./data:/app/data \
  ghcr.io/yangyang8002/dplayer-web-api:latest
```

---

## 访问

| 页面 | 地址 |
|------|------|
| 播放器 | `http://localhost:1919/player/?url=视频地址` |
| 管理后台 | `http://localhost:1919/admin/` |

**默认账号：** `admin` / `admin123`

---

## 数据持久化

将宿主机目录挂载到容器内的 `/app/data`：

```bash
-v /your/data/path:/app/data
```

该目录包含：
| 文件 | 说明 |
|------|------|
| `danmu.json` | 弹幕数据 |
| `banned_words.json` | 敏感词库 |
| `accounts.json` | 管理员账号（SHA-256 加盐哈希） |
| `config.json` | 服务器配置 |
| `videos.json` | 视频码映射 |

所有文件首次启动自动创建，无需手动初始化。

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `1919` | 服务端口 |
| `NODE_ENV` | `production` | 运行模式 |

---

## 健康检查

容器内置健康检查：

```bash
wget -q --spider http://localhost:1919/api/config/public
```

每 30 秒检测一次，5 秒启动等待期，3 次重试。

---

## 镜像标签

| 标签 | 说明 |
|------|------|
| `latest` | 最新稳定版本 |
| `v26.8.1` | 版本锁定 |

---

## 生产部署建议

### 使用反向代理

生产环境建议在容器前面放置 Nginx 或 Caddy 作为反向代理，处理 HTTPS 和静态资源缓存。

**Nginx 配置示例：**

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:1919;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Caddy 配置（更简单）：**

```
your-domain.com {
    reverse_proxy localhost:1919
}
```

Caddy 自动申请和续期 Let's Encrypt 证书。

### 资源限制

```bash
docker run -d \
  --name dplayer-api \
  --memory="512m" \
  --cpus="1" \
  -p 1919:1919 \
  -v ./data:/app/data \
  ghcr.io/yangyang8002/dplayer-web-api:latest
```

---

## 手动发布镜像到 GHCR

```bash
# 登录
echo $GITHUB_TOKEN | docker login ghcr.io -u yangyang8002 --password-stdin

# 构建 + 标记
docker build -t ghcr.io/yangyang8002/dplayer-web-api:latest .
docker tag ghcr.io/yangyang8002/dplayer-web-api:latest ghcr.io/yangyang8002/dplayer-web-api:v26.8.1

# 推送
docker push ghcr.io/yangyang8002/dplayer-web-api:latest
docker push ghcr.io/yangyang8002/dplayer-web-api:v26.8.1
```

### GitHub Actions 自动发布

创建 `.github/workflows/docker-publish.yml`：

```yaml
name: Docker Publish

on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/${{ github.repository }}
          tags: type=semver,pattern={{version}}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

---

## 常见问题

**Q: 启动后数据不显示？**
A: 检查 `./data` 目录是否有写入权限。容器以 `node` 用户运行，确保宿主机目录权限正确。

**Q: 敏感词库更新失败？**
A: 镜像已内置 `git`，确保容器能访问 GitHub。如网络受限可关闭自动更新。

**Q: 如何修改管理员密码？**
A: 登录管理后台 → 服务器配置 → 安全入口 → 修改密码，或删除 `data/accounts.json` 重启将重新生成默认账号。

**Q: 如何升级？**
A: 拉取新镜像后重建容器，数据目录保持不变：

```bash
docker compose pull
docker compose up -d

# 或手动
docker pull ghcr.io/yangyang8002/dplayer-web-api:latest
docker stop dplayer-api && docker rm dplayer-api
docker run -d --name dplayer-api -p 1919:1919 -v ./data:/app/data ghcr.io/yangyang8002/dplayer-web-api:latest
```
