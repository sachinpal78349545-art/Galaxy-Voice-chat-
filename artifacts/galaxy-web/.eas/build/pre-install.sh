#!/bin/bash
set -e
echo "==> EAS Pre-install: Fixing lockfile config mismatch"

echo "==> Step 1: Delete existing lockfile"
rm -f pnpm-lock.yaml

echo "==> Step 2: Disable frozen-lockfile globally"
npm config set frozen-lockfile false 2>/dev/null || true
echo "frozen-lockfile=false" > .npmrc

echo "==> Step 3: Generate fresh lockfile for this environment"
pnpm install --no-frozen-lockfile

echo "==> Pre-install complete. Fresh lockfile ready."
