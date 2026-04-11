#!/bin/bash
set -euo pipefail

SSH_USER="olivier"
SSH_HOST="vandermoten.eu"
SSH_PORT="2222"
REMOTE="${SSH_USER}@${SSH_HOST}"

VERSION="${1:-$(git describe --tags --always --dirty 2>/dev/null || echo "dev")}"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

LOCAL_DIST="dist"
REMOTE_TMP="/tmp/frontend"

echo "=============================="
echo "🎨 Frontend Build & Upload"
echo "Version: $VERSION"
echo "Time: $BUILD_TIME"
echo "=============================="

# -----------------------------
# 1. BUILD
# -----------------------------
echo "🔨 Building frontend..."

npm run build

if [ ! -d "$LOCAL_DIST" ]; then
  echo "❌ Build failed: dist/ not found"
  exit 1
fi

echo "✔ Build complete"

# -----------------------------
# 2. UPLOAD
# -----------------------------
echo "📤 Uploading frontend..."

rsync -az --delete -e "ssh -p $SSH_PORT" \
  $LOCAL_DIST/ \
  $REMOTE:$REMOTE_TMP/

echo "✔ Upload complete"

echo ""
echo "✅ READY TO DEPLOY ON VPS"
echo "Run:"
echo "cd /opt/apps/parashift && sudo ./deploy-frontend.sh"
