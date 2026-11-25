#!/bin/sh
set -e

DATA_PATH="${DATA_DIR:-${RAILWAY_VOLUME_MOUNT_PATH:-/app/data}}"

mkdir -p "$DATA_PATH/cache" "$DATA_PATH/bin" "$DATA_PATH/yt-dlp-plugins"

if [ -d "/opt/bgutil-pot/plugin/yt_dlp_plugins" ] && [ ! -e "$DATA_PATH/yt-dlp-plugins/yt_dlp_plugins/extractor/getpot_bgutil.py" ]; then
  cp -r /opt/bgutil-pot/plugin/yt_dlp_plugins "$DATA_PATH/yt-dlp-plugins/" 2>/dev/null || true
fi

if [ "$(id -u)" = "0" ]; then
  chown -R grovesave:nodejs "$DATA_PATH" 2>/dev/null || true
  exec su-exec grovesave "$@"
fi

exec "$@"
