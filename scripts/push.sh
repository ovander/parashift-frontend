#!/bin/bash
set -euo pipefail

SSH_USER="olivier"
SSH_HOST="vandermoten.eu"
SSH_PORT="2222"
REMOTE="${SSH_USER}@${SSH_HOST}"

APP_NAME="parashift"

VERSION="${1:-$(git describe --tags --always --dirty 2>/dev/null || echo "dev")}"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

LOCAL_DIST="dist"
REMOTE_TMP_DIR="/tmp/${APP_NAME}-frontend"

# ==============================
# GUARD
# ==============================
if [[ "${VERSION}" == *"-dirty"* ]]; then
  echo "❌ Working tree is dirty. Commit your changes before deploying."
  exit 1
fi

echo "=============================="
echo "🎨 Frontend Build & Upload"
echo "Version:  $VERSION"
echo "Time:     $BUILD_TIME"
echo "=============================="

# ==============================
# BUILD
# ==============================
echo "🔨 Building frontend..."

npm run build

if [ ! -f "$LOCAL_DIST/index.html" ]; then
  echo "❌ Build failed: dist/index.html not found"
  exit 1
fi

echo "✔ Build complete"

# ==============================
# UPLOAD
# ==============================
echo "📁 Preparing remote tmp..."
ssh -p $SSH_PORT $REMOTE "rm -rf ${REMOTE_TMP_DIR} && mkdir -p ${REMOTE_TMP_DIR}"

echo "📤 Uploading frontend..."
rsync -az --delete -e "ssh -p $SSH_PORT" \
  $LOCAL_DIST/ \
  $REMOTE:$REMOTE_TMP_DIR/

echo "✔ Upload complete"

# ==============================
# FINAL INSTRUCTIONS
# ==============================
echo ""
echo "=============================="
echo "✅ PUSH COMPLETE"
echo "=============================="
echo ""
echo "➡️  Next steps on VPS:"
echo ""
echo "    ssh -p ${SSH_PORT} ${REMOTE}"
echo ""
echo "    sudo /opt/apps/${APP_NAME}/deploy-frontend.sh ${VERSION}"
echo ""
echo "=============================="
