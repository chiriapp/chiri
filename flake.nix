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
          ];
          targets = pkgs.lib.optionals pkgs.stdenv.isDarwin [
            "x86_64-apple-darwin"
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

        apps.caldav-test =
          let
            script = pkgs.writeShellApplication {
              name = "caldav-test";
              runtimeInputs = [ pkgs.xandikos ];
              text = ''
                DATA_DIR="''${CALDAV_DATA_DIR:-$HOME/.local/share/chiri-caldav-test}"
                PORT="''${CALDAV_PORT:-5232}"
                PRINCIPAL="''${CALDAV_PRINCIPAL:-test}"

                mkdir -p "$DATA_DIR"

                echo "Xandikos CalDAV test server (no auth)"
                echo "  Principal URL: http://localhost:$PORT/$PRINCIPAL/"
                echo "  Data:          $DATA_DIR"
                echo ""
                echo "Press Ctrl+C to stop."
                echo ""

                # Disable git commit signing — dulwich (xandikos's storage backend)
                # reads ~/.gitconfig directly and will try to invoke op-ssh-sign.
                # GIT_CONFIG_GLOBAL overrides the user config path in dulwich 1.1+.
                GITCONFIG_OVERRIDE=$(mktemp)
                printf '[commit]\n\tgpgsign = false\n[user]\n\tname = xandikos-test\n\temail = test@localhost\n' > "$GITCONFIG_OVERRIDE"
                export GIT_CONFIG_GLOBAL="$GITCONFIG_OVERRIDE"
                trap 'rm -f "$GITCONFIG_OVERRIDE"' EXIT

                exec xandikos serve \
                  -d "$DATA_DIR" \
                  -l 127.0.0.1 \
                  -p "$PORT" \
                  --current-user-principal "/$PRINCIPAL/" \
                  --defaults
              '';
            };
          in
          {
            type = "app";
            program = "${script}/bin/caldav-test";
          };

        devShells.default = pkgs.mkShell {
          buildInputs =
            with pkgs;
            [
              # Rust
              rustToolchain
              cargo-tauri

              # Node.js
              nodejs_20
              pnpm

              # Build tools
              pkg-config
              openssl
              cmake
              ninja

              # Tauri dependencies
              libiconv
            ]
            ++ darwinDevDeps
            ++ linuxDevDeps;

          shellHook = ''
            echo "Chiri dev environment"
            echo ""
            echo "commands:"
            echo "  just install    - install dependencies"
            echo "  just dev        - start development server"
            echo "  just build      - build app"
            echo "  nix build       - build app with nix"
            echo ""
            echo "CEF build:"
            echo "  just build-cef  - build with Chromium"
            echo "  just dev-cef    - dev mode with Chromium"
            echo ""
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
