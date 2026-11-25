#!/usr/bin/env bash
set -e

# Ensure data and cache directories exist and are writable
mkdir -p /app/data/cache /app/data/bin /app/data/yt-dlp-plugins /app/data/backups
chmod -R 777 /app/data || true

# Start bgutil PO token provider server in background on port 4416 if available
BGUTIL_SRV=""
if [ -d "/opt/bgutil-pot/server" ]; then
    BGUTIL_SRV="/opt/bgutil-pot/server"
elif [ -d "/opt/bgutil/server" ]; then
    BGUTIL_SRV="/opt/bgutil/server"
fi

if [ -n "$BGUTIL_SRV" ]; then
    echo "Starting bgutil YouTube PO Token provider server in background from $BGUTIL_SRV..."
    cd "$BGUTIL_SRV"
    (npm start || node dist/index.js || node index.js || node build/main.js) > /tmp/bgutil.log 2>&1 &
    cd /app
    sleep 1
fi

# Start the main Node.js application
exec "$@"
