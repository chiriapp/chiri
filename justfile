[private]
_default:
  @just --list

alias b := build
alias c := cargo
alias d := dev
alias h := hash
alias i := install
alias u := update
alias v := vite

build_args := if os() == "macos" { "--target aarch64-apple-darwin --bundles app" } else { "" }

cargo:
  cd src-tauri && cargo update

build:
  pnpm tauri build {{build_args}}

build-cef:
  cd src-tauri && ./fix-libs.sh && cargo tauri build --features cef -- --no-default-features

dev:
  pnpm tauri dev

dev-cef:
  cd src-tauri && ./fix-libs.sh && cargo tauri dev --features cef -- --no-default-features

hash:
  ./nix/update-hashes.sh

install:
  pnpm install

update:
  pnpm upgrade -L

vite:
  pnpm vite build
