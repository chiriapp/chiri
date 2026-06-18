#!/usr/bin/env bash
# helper script to update nix hashes when dependencies change
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Updating Nix hashes for Chiri"
echo ""

# use nix run to fetch nix-update from nixpkgs if not installed locally
# we skip version update because we only want to update cargoDeps and pnpmDeps hashes
nix run nixpkgs#nix-update -- --flake source --version skip --no-src

echo ""
echo "==> Hashes updated successfully!"
echo ""
echo "Run 'nix build .#source' to verify the full build."
