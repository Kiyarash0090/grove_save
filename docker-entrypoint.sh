#!/usr/bin/env bash
set -e

# Ensure data and cache directories exist and are writable (fixing Railway volume permission issues)
mkdir -p /app/data/cache /app/data/bin /app/data/yt-dlp-plugins /app/data/backups
chmod -R 777 /app/data || true

# Start bgutil PO token provider server in background on port 4416 if available
if [ -d "/opt/bgutil/server" ]; then
    echo "Starting bgutil YouTube PO Token provider server in background..."
    cd /opt/bgutil/server
    # Run server in background, fallback to node index if npm start fails
    (npm start || node dist/index.js || node index.js) > /tmp/bgutil.log 2>&1 &
    cd /app
    sleep 1
fi

# Start the main Node.js application
exec "$@"
