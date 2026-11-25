#!/usr/bin/env bash
set -e

# Ensure data and cache directories exist and are writable (fixing Railway volume permission issues)
mkdir -p /app/data/cache /app/data/bin /app/data/yt-dlp-plugins /app/data/backups
chmod -R 777 /app/data || true

# Start bgutil PO token provider server in background on port 4416
if [ -d "/opt/bgutil/server" ]; then
    echo "Starting bgutil YouTube PO Token provider server..."
    cd /opt/bgutil/server
    npm start &
    cd /app
fi

# Start the main Node.js application
exec "$@"
