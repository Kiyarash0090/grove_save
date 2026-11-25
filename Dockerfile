# Grove Save - Dockerfile with PO Token Provider and Canvas dependencies
FROM node:22-bookworm-slim

WORKDIR /app

# Install system dependencies including python3, git, ffmpeg, curl, and native canvas compilation tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    unzip \
    ffmpeg \
    python3 \
    python3-pip \
    build-essential \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp and bgutil-ytdlp-pot-provider plugin
RUN pip3 install --no-cache-dir --break-system-packages --prefer-binary bgutil-ytdlp-pot-provider yt-dlp || true

# Clone and build bgutil-ytdlp-pot-provider plugin server to /opt/bgutil-pot
RUN git clone https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil-pot \
    && if [ -d "/opt/bgutil-pot/server" ]; then \
         cd /opt/bgutil-pot/server \
         && (npm install --legacy-peer-deps --no-audit --no-fund || (node -e 'const fs=require("fs"); const p=JSON.parse(fs.readFileSync("package.json","utf8")); delete p.dependencies?.canvas; delete p.devDependencies?.canvas; fs.writeFileSync("package.json", JSON.stringify(p, null, 2))' && npm install --legacy-peer-deps --no-audit --no-fund --ignore-scripts) || true) \
         && (npx tsc || npm run build || true); \
       fi \
    && mkdir -p /root/.yt-dlp/plugins /root/yt-dlp-plugins /root/.config/yt-dlp \
    && echo '--extractor-args "youtubepot:provider=http://127.0.0.1:4416"' > /etc/yt-dlp.conf \
    && cp /etc/yt-dlp.conf /root/.config/yt-dlp/config

# Copy dependency definitions and install app dependencies
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