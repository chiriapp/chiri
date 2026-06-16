#!/usr/bin/env bash
# installs Git hooks for this repository
set -euo pipefail

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install_hook() {
  local name="$1"
  local src="$SCRIPTS_DIR/hooks/$name"
  local dst="$HOOKS_DIR/$name"

  if [ -L "$dst" ] || [ -f "$dst" ]; then
    echo "  ✓ $name already exists, skipping."
  else
    ln -s "$src" "$dst"
    chmod +x "$dst"
    echo "  ✓ Installed $name"
  fi
}

echo "🪝 Installing Git hooks…"
install_hook "pre-commit"
echo "Done."
