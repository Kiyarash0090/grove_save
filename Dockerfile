# Grove Save - Dockerfile
# Multi-stage build for Node.js app with yt-dlp support

# Base stage - install system dependencies
FROM node:22-alpine AS base

# Install system dependencies including yt-dlp and ffmpeg
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    ca-certificates

# Install yt-dlp via pip with EJS support for YouTube challenges
RUN pip3 install --no-cache-dir --break-system-packages "yt-dlp[default]"

# Install yt-dlp remote components (EJS for YouTube JS challenges) - run once to download
RUN yt-dlp --remote-components ejs:github 2>/dev/null || true

# Verify installations
RUN node --version && npm --version && yt-dlp --version && ffmpeg -version && yt-dlp --version

# Build stage
FROM base AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install since package-lock.json may not exist)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM base AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --legacy-peer-deps

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/public ./public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S grovesave -u 1001 -G nodejs

# Create data and cache directories with proper permissions
RUN mkdir -p /app/data/cache && \
    chown -R grovesave:nodejs /app

USER grovesave

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.ts"]