[private]
_default:
  @just --list

alias b := build
alias c := cargo
alias d := dev
alias h := hash
alias i := install
alias l := clippy
alias m := mac-build
alias u := update
alias v := vite

cargo:
  cd src-tauri && cargo update

clippy:
  cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings

build:
  pnpm tauri build

mac-build:
  #!/usr/bin/env bash
  set -euo pipefail

  if ! command -v op >/dev/null 2>&1; then
    echo '1Password CLI (op) is required for build.'
    exit 1
  fi

  tmp_p8="$(mktemp "${TMPDIR:-/tmp}/apple_api_key.XXXXXX.p8")"
  trap 'rm -f "$tmp_p8"' EXIT
  chmod 600 "$tmp_p8"

  op read 'op://Tauri/Apple Secrets/api-key-certificate' > "$tmp_p8"

  TAURI_SIGNING_PRIVATE_KEY='op://Tauri/Tauri Secrets/signing-key' \
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD='op://Tauri/Tauri Secrets/signing-key-password' \
  APPLE_SIGNING_IDENTITY='op://Tauri/Apple Secrets/identity' \
  APPLE_API_ISSUER='op://Tauri/Apple Secrets/api-issuer' \
  APPLE_API_KEY='op://Tauri/Apple Secrets/api-key' \
  APPLE_API_KEY_PATH="$tmp_p8" \
  op run -- pnpm tauri build

dev:
  pnpm tauri dev

hash:
  ./nix/update-hashes.sh

install:
  pnpm install

update:
  pnpm upgrade -L

vite:
  pnpm vite build
