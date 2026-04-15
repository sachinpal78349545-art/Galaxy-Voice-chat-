#!/bin/bash
set -e
echo "==> EAS Pre-install: npm clean setup"
rm -f pnpm-workspace.yaml pnpm-lock.yaml .npmrc
echo "==> Pre-install complete"
