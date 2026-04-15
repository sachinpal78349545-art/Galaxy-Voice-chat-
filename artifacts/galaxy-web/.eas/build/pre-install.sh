#!/bin/bash
set -e
echo "==> EAS Pre-install: Clean standalone setup"

echo "==> Remove workspace config to prevent monorepo detection"
rm -f pnpm-workspace.yaml
rm -f pnpm-lock.yaml

echo "==> Create .npmrc to disable frozen-lockfile"
cat > .npmrc << 'EOF'
frozen-lockfile=false
auto-install-peers=true
strict-peer-dependencies=false
EOF

echo "==> Run fresh pnpm install"
pnpm install --no-frozen-lockfile

echo "==> Pre-install complete"
