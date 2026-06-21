{ pkgs }:

let
  inherit (pkgs) lib stdenv;
  inherit (import ./tooling.nix { inherit pkgs; })
    cargoXwinRunner
    darwinCcExports
    darwinSdk
    llvm
    nodejs
    pnpm
    rustToolchain
    ;

  darwinDeps = lib.optionals stdenv.isDarwin [
    pkgs.libiconv
    darwinSdk
  ];

  linuxDeps = lib.optionals stdenv.isLinux [
    pkgs.webkitgtk_4_1
    pkgs.gtk3
    pkgs.libsoup_3
    pkgs.glib
    pkgs.gdk-pixbuf
    pkgs.pango
    pkgs.cairo
    pkgs.atk
    pkgs.libayatana-appindicator
  ];

  buildInputs = [
    # Rust
    rustToolchain
    pkgs.cargo-tauri
    pkgs.cargo-xwin
    cargoXwinRunner
    llvm.clang-unwrapped
    llvm.lld
    llvm.llvm

    # Node.js
    nodejs
    pnpm

    # build tools
    pkgs.just
    pkgs.pkg-config
    pkgs.openssl
    pkgs.nsis
    pkgs.nix-update

    # Tauri dependencies
    pkgs.libiconv
  ]
  ++ darwinDeps
  ++ linuxDeps;
in
pkgs.mkShell {
  inherit buildInputs;

  shellHook = ''
    ${lib.optionalString stdenv.isDarwin darwinCcExports}

    export PATH="${llvm.clang-unwrapped}/bin:${llvm.lld}/bin:${llvm.llvm}/bin:$PATH"

    if [ -z "$CI" ]; then
      bold="$(tput bold 2>/dev/null || true)"
      green="$(tput setaf 2 2>/dev/null || true)"
      cyan="$(tput setaf 6 2>/dev/null || true)"
      dim="$(tput dim 2>/dev/null || true)"
      reset="$(tput sgr0 2>/dev/null || true)"

      os_name="$(uname -s)"
      case "$os_name" in
        Darwin)
          os_label="macOS $(sw_vers -productVersion 2>/dev/null || uname -r)"
          ;;
        Linux)
          if [ -r /etc/os-release ]; then
            os_label="$(. /etc/os-release && printf "%s" "$PRETTY_NAME")"
          else
            os_label="Linux $(uname -r)"
          fi
          ;;
        *)
          os_label="$os_name $(uname -r)"
          ;;
      esac

      printf "🍃%b%b Chiri dev environment%b\n\n" "$green" "$bold" "$reset"
      printf "%bThe following commands are available:%b\n" "$bold" "$reset"
      printf "  %b%-14s%b %b%s%b\n" "$cyan" "just install" "$reset" "$dim" "install dependencies with pnpm" "$reset"
      printf "  %b%-14s%b %b%s%b\n" "$cyan" "just dev" "$reset" "$dim" "start development server" "$reset"
      printf "  %b%-14s%b %b%s%b\n" "$cyan" "just build" "$reset" "$dim" "build app" "$reset"
      printf "  %b%-14s%b %b%s%b\n" "$cyan" "nix build" "$reset" "$dim" "build app with Nix" "$reset"
      printf "\nRunning Node ${nodejs.version}, pnpm ${pnpm.version}, Rust ${rustToolchain.version}"
      printf "\n%bUsing %s (${pkgs.stdenv.hostPlatform.system})%b\n" "$dim" "$os_label" "$reset"
    fi
  '';

  # required for Tauri on macOS
  RUST_BACKTRACE = 1;

  # for pkg-config to find libraries
  PKG_CONFIG_PATH = lib.makeSearchPath "lib/pkgconfig" (
    [
      pkgs.openssl.dev
    ]
    ++ linuxDeps
  );

  # avoid Nix's host cc-wrapper injecting Darwin/Linux flags into Windows ARM cross builds
  CC_aarch64_pc_windows_msvc = "${llvm.clang-unwrapped}/bin/clang";
  CXX_aarch64_pc_windows_msvc = "${llvm.clang-unwrapped}/bin/clang++";
  AR_aarch64_pc_windows_msvc = "${llvm.llvm}/bin/llvm-lib";
  CARGO_TARGET_AARCH64_PC_WINDOWS_MSVC_LINKER = "${llvm.lld}/bin/lld-link";
  XWIN_CROSS_COMPILER = "clang";
}
