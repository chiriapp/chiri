{
  lib,
  stdenv,
  rustPlatform,
  rustToolchain,
  darwinCcEnv ? { },
  darwinCcExports ? "",
  src,

  # build tools
  cargo-tauri,
  nodejs,
  pnpmConfigHook,
  pnpm,
  fetchPnpmDeps,
  pkg-config,
  makeBinaryWrapper,
  wrapGAppsHook4,

  # Linux dependencies
  glib-networking,
  libayatana-appindicator,
  openssl,
  webkitgtk_4_1,
}:

let
  packageJson = builtins.fromJSON (builtins.readFile ../../package.json);
  sources = import ../sources.nix { inherit lib src; };
in
rustPlatform.buildRustPackage (finalAttrs: {
  pname = "chiri";
  src = sources.app;
  version = packageJson.version;

  env = lib.optionalAttrs stdenv.hostPlatform.isDarwin (
    darwinCcEnv
    // {
      MACOSX_DEPLOYMENT_TARGET = "14.0";
      CARGO_TARGET_AARCH64_APPLE_DARWIN_RUSTFLAGS = "-C link-arg=-mmacosx-version-min=14.0";
      CARGO_TARGET_X86_64_APPLE_DARWIN_RUSTFLAGS = "-C link-arg=-mmacosx-version-min=14.0";
    }
  );

  cargoBuildFlags = lib.optionals stdenv.hostPlatform.isDarwin [
    "--config"
    "target.${stdenv.hostPlatform.rust.rustcTarget}.linker=\"/usr/bin/clang\""
  ];

  # cargo dependencies hash - update when Cargo.lock changes
  cargoHash = "sha256-4OrMiSIniR1Ewpx+rBe+HxvHmRe8MvDXnX56aAwdxxM=";

  # pnpm dependencies for the frontend
  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    inherit pnpm;
    fetcherVersion = 3;
    hash = "sha256-yBWcI1QnKOrnYttRqcP+a0WriXFith1IalFEkYJhwmU="; # pnpmDeps
  };

  nativeBuildInputs = [
    # official tauri hook for nix
    cargo-tauri.hook

    # frontend
    nodejs
    pnpmConfigHook
    pnpm

    # build tools (Linux)
    pkg-config
  ]
  ++ lib.optionals stdenv.hostPlatform.isLinux [
    wrapGAppsHook4
  ]
  ++ lib.optionals stdenv.hostPlatform.isDarwin [
    makeBinaryWrapper
  ];

  buildInputs = [
    openssl
  ]
  ++ lib.optionals stdenv.hostPlatform.isLinux [
    glib-networking
    libayatana-appindicator # needed for tauri system tray on linux
    webkitgtk_4_1
  ];

  # set Tauri source directory
  cargoRoot = "src-tauri";
  buildAndTestSubdir = "src-tauri";

  # patch libappindicator path on Linux for tray icon support
  postPatch =
    lib.optionalString stdenv.hostPlatform.isLinux ''
      for libappindicatorRs in $cargoDepsCopy/*/libappindicator-sys-*/src/lib.rs; do
        if [[ -f "$libappindicatorRs" ]]; then
          substituteInPlace "$libappindicatorRs" \
            --replace-fail "libayatana-appindicator3.so.1" "${libayatana-appindicator}/lib/libayatana-appindicator3.so.1"
        fi
      done
    ''
    + ''
      # disable updater artifact creation to avoid requiring signing keys
      # regular users don't have the private signing key, and don't need updater artifacts
      substituteInPlace src-tauri/tauri.conf.json \
        --replace-fail '"createUpdaterArtifacts": true' '"createUpdaterArtifacts": false'
    '';

  # build the frontend before Tauri build
  # disable bundle signing since we don't have the signing keys
  preBuild =
    lib.optionalString stdenv.hostPlatform.isDarwin ''
      ${darwinCcExports}
      export MACOSX_DEPLOYMENT_TARGET=14.0
    ''
    + ''
      unset TAURI_SIGNING_PRIVATE_KEY
      unset TAURI_SIGNING_PUBLIC_KEY
      pnpm build
    '';

  postInstall =
    if stdenv.hostPlatform.isDarwin then
      ''
        mkdir -p $out/bin
        makeWrapper "$out/Applications/Chiri.app/Contents/MacOS/chiri" "$out/bin/chiri"
      ''
    else
      ''
        mv $out/bin/Chiri $out/bin/chiri
        for desktopFile in \
          $out/share/applications/Chiri.desktop \
          $out/share/applications/garden.chiri.Chiri.desktop
        do
          if [ -f "$desktopFile" ]; then
            substituteInPlace "$desktopFile" \
              --replace-fail "Exec=Chiri" "Exec=chiri"
          fi
        done
      '';

  # tauri apps typically don't have cargo tests
  doCheck = false;

  passthru.tooling = {
    inherit
      nodejs
      pnpm
      rustPlatform
      rustToolchain
      ;
  };

  meta = {
    description = "Cross-platform CalDAV task management app";
    homepage = "https://github.com/SapphoSys/chiri";
    changelog = "https://github.com/SapphoSys/chiri/releases/tag/app-v${finalAttrs.version}";
    license = lib.licenses.zlib;
    maintainers = with lib.maintainers; [ SapphoSys ];
    mainProgram = "chiri";
    platforms = lib.platforms.linux ++ lib.platforms.darwin;
  };
})
