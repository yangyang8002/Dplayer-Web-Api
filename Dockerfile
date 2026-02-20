FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source files
COPY server.js ./
COPY public ./public/

# Create data directory
RUN mkdir -p data

# Initialize default data files
RUN echo '[]' > data/danmu.json && \
    echo '["广告", "刷屏", "垃圾"]' > data/banned_words.json

# Expose port
EXPOSE 1919

# Environment variables
ENV PORT=1919
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:1919/player/ || exit 1

# Start server
CMD ["node", "server.js"]
