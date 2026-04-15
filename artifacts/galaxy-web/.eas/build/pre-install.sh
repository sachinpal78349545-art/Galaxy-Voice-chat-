#!/bin/bash
set -e
echo "==> EAS Pre-install: Fixing workspace detection & lockfile mismatch"

echo "==> Step 1: Remove workspace config so EAS treats this as standalone"
rm -f pnpm-workspace.yaml
rm -f pnpm-lock.yaml

echo "==> Step 2: Disable frozen-lockfile"
echo "frozen-lockfile=false" > .npmrc

echo "==> Step 3: Fresh install without frozen lockfile"
pnpm install --no-frozen-lockfile

echo "==> Pre-install complete. All dependencies resolved."
