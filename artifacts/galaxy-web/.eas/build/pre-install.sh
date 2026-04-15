#!/bin/bash
echo "==> EAS Pre-install: removing lockfile and disabling frozen-lockfile"
rm -f pnpm-lock.yaml
echo "frozen-lockfile=false" > .npmrc
echo "==> Done. pnpm will generate fresh lockfile."
