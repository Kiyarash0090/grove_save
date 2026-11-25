# Grove Save - Dockerfile with PO Token Provider (bgutil-ytdlp-pot-provider)
FROM node:22-bookworm-slim

WORKDIR /app

# Install system dependencies including python3, git, ffmpeg, curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    unzip \
    ffmpeg \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp and bgutil-ytdlp-pot-provider plugin
RUN pip3 install --no-cache-dir --break-system-packages --prefer-binary bgutil-ytdlp-pot-provider yt-dlp || true

# Clone and build bgutil-ytdlp-pot-provider plugin server to /opt/bgutil
RUN git clone https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil \
    && if [ -d "/opt/bgutil/server" ]; then \
         cd /opt/bgutil/server \
         && npm install \
         && (npx tsc || npm run build || true); \
       fi \
    && mkdir -p /root/.yt-dlp/plugins /root/yt-dlp-plugins /root/.config/yt-dlp \
    && echo '--extractor-args "youtubepot:provider=http://127.0.0.1:4416"' > /etc/yt-dlp.conf \
    && cp /etc/yt-dlp.conf /root/.config/yt-dlp/config

# Copy dependency definitions and install
COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source files
COPY . .

# Build application
RUN npm run build

# Setup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data and cache directories
RUN mkdir -p /app/data/cache

ENV PORT=3000
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1

EXPOSE 3000 4416

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "start"]