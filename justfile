[private]
_default:
  @just --list

set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

alias b := build
alias c := clippy
alias d := dev
alias i := install
alias u := update
alias v := vite

[unix]
alias h := hash

[macos]
alias bs := build-sign

build:
  pnpm run build:app

[unix]
check-workflows:
  actionlint .github/workflows/*.yml
  yq '.' .github/workflows/*.yml > /dev/null

[windows]
check-workflows:
  Get-ChildItem .github/workflows/*.yml -File | ForEach-Object { actionlint $_.FullName }
  Get-ChildItem .github/workflows/*.yml -File | ForEach-Object { yq '.' $_.FullName | Out-Null }

clippy:
  cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings

dev:
  pnpm tauri dev

[unix]
hash:
  ./scripts/update-hashes.sh

hooks:
  node scripts/install-hooks.ts

install: hooks
  pnpm install

[macos]
build-sign:
  #!/usr/bin/env bash
  set -euo pipefail

  if ! command -v op >/dev/null 2>&1; then
    echo '1Password CLI (op) is required for build.'
    exit 1
  fi

  tmp_p8="$(mktemp "${TMPDIR:-/tmp}/apple_api_key.XXXXXX.p8")"
  trap 'rm -f "$tmp_p8"' EXIT
  chmod 600 "$tmp_p8"

  op read 'op://GitHub Actions/Apple Secrets/api-key-certificate' > "$tmp_p8"

  TAURI_SIGNING_PRIVATE_KEY='op://GitHub Actions/Tauri Secrets/signing-key' \
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD='op://GitHub Actions/Tauri Secrets/signing-key-password' \
  APPLE_SIGNING_IDENTITY='op://GitHub Actions/Apple Secrets/identity' \
  APPLE_API_ISSUER='op://GitHub Actions/Apple Secrets/api-issuer' \
  APPLE_API_KEY='op://GitHub Actions/Apple Secrets/api-key' \
  APPLE_API_KEY_PATH="$tmp_p8" \
  op run -- pnpm tauri build

update:
  pnpm upgrade -L
  cargo update --manifest-path src-tauri/Cargo.toml

vite:
  pnpm vite build
