#!/usr/bin/env bash
# Assembles an SRPM for Copr. Runs with network access inside the SRPM mock
# chroot (via .copr/Makefile), so this is where all fetching happens:
#
#   1. source tarball straight from the git checkout
#   2. vendored cargo crates   -> offline cargo build in the rpm chroot
#   3. prebuilt frontend (dist)-> no nodejs needed in the rpm chroot
#
# Usage: make-srpm.sh <spec path> <output directory>
set -euo pipefail

SPEC="${1:?spec path required}"
OUTDIR="${2:?output directory required}"
mkdir -p "$OUTDIR"

# the srpm chroot has a minimal HOME; keep all tool state inside the checkout
export HOME="$PWD/.srpm-home"
export CARGO_HOME="$HOME/cargo"
export XDG_CACHE_HOME="$HOME/cache"
export XDG_CONFIG_HOME="$HOME/config"
mkdir -p "$HOME"

# the checkout may be owned by a different uid than the build process
# (copr bind-mounts it into the mock chroot). mark it safe for git
# (the /* variant covers any nested submodule checkouts)
git config --global --add safe.directory "$PWD"
git config --global --add safe.directory "$PWD/*"

VERSION=$(node -p 'require("./src-tauri/tauri.conf.json").version')
echo "==> Assembling SRPM for chiri $VERSION"

# keep the spec in sync with the ref being built
sed -i "s/^Version:.*/Version:        $VERSION/" "$SPEC"

echo "==> [1/3] Archiving sources"
git archive --format=tar.gz --prefix="chiri-$VERSION/" \
  -o "$OUTDIR/chiri-$VERSION.tar.gz" HEAD

echo "==> [2/3] Vendoring cargo crates"
cargo vendor --manifest-path src-tauri/Cargo.toml vendor > /dev/null
tar -czf "$OUTDIR/chiri-$VERSION-vendor.tar.gz" vendor

echo "==> [3/3] Building frontend"
PNPM_VERSION=$(node -p 'require("./package.json").packageManager.split("@")[1]')
npm install -g "pnpm@$PNPM_VERSION"
pnpm install --frozen-lockfile
pnpm build
tar -czf "$OUTDIR/chiri-$VERSION-frontend.tar.gz" dist

rpmbuild -bs \
  --define "_sourcedir $OUTDIR" \
  --define "_srcrpmdir $OUTDIR" \
  "$SPEC"

echo "==> SRPM written to $OUTDIR"
