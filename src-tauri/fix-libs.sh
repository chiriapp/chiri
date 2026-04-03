#!/usr/bin/env bash
set -euo pipefail

APP_BINARY_PATH="target/release/Chiri"
CARGO_TAURI_PATH="${CARGO_TAURI_PATH:-$HOME/.cargo/bin/cargo-tauri}"

if [ -e "/usr/lib/libiconv.2.dylib" ]; then
    SYSTEM_ICONV="/usr/lib/libiconv.2.dylib"
elif [ -e "/usr/lib/libiconv.dylib" ]; then
    SYSTEM_ICONV="/usr/lib/libiconv.dylib"
else
    # Keep a sane default even if the host cannot validate the path at script start.
    SYSTEM_ICONV="/usr/lib/libiconv.2.dylib"
fi

fix_iconv_dependency() {
    local binary_path="$1"
    local binary_label="$2"

    if [ ! -f "$binary_path" ]; then
        echo "Skipping ${binary_label}: binary not found at ${binary_path}"
        return 0
    fi

    local nix_iconv
    nix_iconv=$(otool -L "$binary_path" | awk '/\/nix\/store\/.*libiconv/ { print $1; exit }')

    if [ -z "$nix_iconv" ]; then
        echo "No Nix libiconv dependency found for ${binary_label}, no changes needed"
        return 0
    fi

    echo "Found Nix libiconv dependency for ${binary_label}: ${nix_iconv}"
    echo "Replacing with system library: ${SYSTEM_ICONV}"
    install_name_tool -change "$nix_iconv" "$SYSTEM_ICONV" "$binary_path"

    echo "Updated iconv references for ${binary_label}:"
    otool -L "$binary_path" | grep iconv || true
}

echo "Fixing library dependencies for local macOS binaries..."
fix_iconv_dependency "$APP_BINARY_PATH" "app binary"
fix_iconv_dependency "$CARGO_TAURI_PATH" "cargo-tauri"
