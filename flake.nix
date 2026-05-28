{
  description = "Chiri - a cross-platform CalDAV task management app. Currently in very early alpha!";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      rust-overlay,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [
            "rust-src"
            "rust-analyzer"
            "clippy"
          ];
        };

        # macOS-specific dependencies for dev shell
        darwinDevDeps =
          with pkgs;
          lib.optionals stdenv.isDarwin [
            libiconv
            apple-sdk_14
          ];

        # Linux-specific dependencies for dev shell
        linuxDevDeps =
          with pkgs;
          lib.optionals stdenv.isLinux [
            webkitgtk_4_1
            gtk3
            libsoup_3
            glib
            gdk-pixbuf
            pango
            cairo
            atk
            libayatana-appindicator
          ];

      in
      {
        packages =
          let
            source = pkgs.callPackage ./nix/package.nix { src = ./.; };
            bin = pkgs.callPackage ./nix/package-bin.nix { };
          in
          {
            default = if pkgs.stdenv.hostPlatform.isDarwin then bin else source;
            source = source;
            bin = bin;
          };

        apps = {
          caldav-xandikos = import ./nix/caldav-servers/xandikos.nix { inherit pkgs; };
          caldav-radicale = import ./nix/caldav-servers/radicale.nix { inherit pkgs; };
          caldav-baikal = import ./nix/caldav-servers/baikal.nix { inherit pkgs; };
          caldav-nextcloud = import ./nix/caldav-servers/nextcloud.nix { inherit pkgs; };
          caldav-rustical = import ./nix/caldav-servers/rustical.nix { inherit pkgs; };
        };

        devShells.default = pkgs.mkShell {
          buildInputs =
            let
              nodejs = pkgs.nodejs_26;
              pnpm = pkgs.pnpm.override { nodejs = pkgs.nodejs_26; };
            in
            with pkgs;
            [
              # Rust
              rustToolchain
              cargo-tauri

              # Node.js
              nodejs
              pnpm

              # Build tools
              pkg-config
              openssl

              # Tauri dependencies
              libiconv
            ]
            ++ darwinDevDeps
            ++ linuxDevDeps;

          shellHook = ''
            ${pkgs.lib.optionalString pkgs.stdenv.isDarwin ''
              export CC="${pkgs.clang.cc}/bin/clang"
              export CXX="${pkgs.clang.cc}/bin/clang++"
              export CFLAGS_aarch64_apple_darwin="-isysroot ${pkgs.apple-sdk_14}/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk"
              export CXXFLAGS_aarch64_apple_darwin="-isysroot ${pkgs.apple-sdk_14}/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk"
              export CFLAGS_x86_64_apple_darwin="-isysroot ${pkgs.apple-sdk_14}/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk"
              export CXXFLAGS_x86_64_apple_darwin="-isysroot ${pkgs.apple-sdk_14}/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk"
            ''}

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
            printf "\nRunning Node ${pkgs.nodejs_20.version}, pnpm ${pkgs.pnpm.version}, Rust ${rustToolchain.version}"
            printf "\n%bUsing %s (${pkgs.stdenv.hostPlatform.system})%b\n" "$dim" "$os_label" "$reset"
          '';

          # Required for Tauri on macOS
          RUST_BACKTRACE = 1;

          # For pkg-config to find libraries
          PKG_CONFIG_PATH = pkgs.lib.makeSearchPath "lib/pkgconfig" (
            with pkgs;
            [
              openssl.dev
            ]
            ++ linuxDevDeps
          );
        };
      }
    );
}
