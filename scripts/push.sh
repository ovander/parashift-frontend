#!/usr/bin/env bash
# =============================================================================
# push.sh  —  ParaShift frontend build & deploy to VPS
#
# Reference model: vandermoten.eu · Multi-App VPS (gpwa-style, direct rsync)
#
# Usage:
#   ./scripts/push.sh [version]         # e.g. ./scripts/push.sh v0.2.0
#   ./scripts/push.sh                   # reads version from latest git tag
#
# What it does:
#   1. Resolve version (arg or latest git tag)
#   2. npm ci + npm run build  (uses .env.production automatically)
#   3. rsync dist/ → /opt/apps/parashift/frontend/ on the VPS
#
# The frontend dir is a plain directory owned by olivier, so the deploy is a
# single direct rsync — no /tmp staging or separate deploy step.
# =============================================================================
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
SSH_HOST="vandermoten.eu"
SSH_USER="olivier"
SSH_PORT="2222"
REMOTE="${SSH_USER}@${SSH_HOST}"
REMOTE_FRONTEND="/opt/apps/parashift/frontend"
SITE_URL="https://parashift.vandermoten.eu"

SSH_OPTS="-p ${SSH_PORT} -o StrictHostKeyChecking=accept-new"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── Version ───────────────────────────────────────────────────────────────────
VERSION="${1:-}"
if [ -z "${VERSION}" ]; then
  VERSION="$(git -C "${REPO_ROOT}" describe --tags --abbrev=0 2>/dev/null || echo "unknown")"
fi

echo "=============================="
echo "🚀 ParaShift Frontend Deploy ${VERSION}"
echo "Target: ${REMOTE}:${REMOTE_FRONTEND}"
echo "=============================="

# ── 1. Install dependencies ───────────────────────────────────────────────────
echo "📦 Installing dependencies..."
cd "${REPO_ROOT}"
npm ci --prefer-offline 2>/dev/null || npm ci
echo "✔ Dependencies installed"

# ── 2. Production build ───────────────────────────────────────────────────────
echo "🔨 Building for production (uses .env.production)..."
npm run build
if [ ! -f "${REPO_ROOT}/dist/index.html" ]; then
  echo "❌ Build failed: dist/index.html not found"
  exit 1
fi
echo "✔ Build complete → dist/"

# ── 3. Upload to VPS ─────────────────────────────────────────────────────────
echo "📤 Uploading dist/ → ${REMOTE}:${REMOTE_FRONTEND}/"
rsync -az --delete \
  -e "ssh ${SSH_OPTS}" \
  "${REPO_ROOT}/dist/" \
  "${REMOTE}:${REMOTE_FRONTEND}/"
echo "✔ Frontend deployed"

echo ""
echo "=============================="
echo "✅ Frontend ${VERSION} live at ${SITE_URL}"
echo "=============================="
