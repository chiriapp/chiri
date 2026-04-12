{
  lib,
  stdenv,
  rustPlatform,
  fetchFromGitHub ? null,

  # build tools
  cargo-tauri,
  nodejs_20,
  pnpmConfigHook,
  pnpm_9,
  fetchPnpmDeps,
  pkg-config,
  makeBinaryWrapper,
  wrapGAppsHook4,

  # Linux dependencies
  glib-networking,
  libayatana-appindicator,
  openssl,
  webkitgtk_4_1,

  # macOS dependencies
  libiconv,
  apple-sdk_14,

  # source override (used by flake for local builds)
  src ? null,
}:

rustPlatform.buildRustPackage (finalAttrs: {
  pname = "chiri";
  version = "0.8.0";

  # Currently unused now that we have package-bin.nix. Keeping it here anyway
  src =
    if src != null then
      src
    else
      fetchFromGitHub {
        owner = "SapphoSys";
        repo = "chiri";
        tag = "app-v${finalAttrs.version}";
        # Update this hash when releasing a new version
        # This is automatically updated by GitHub Actions when a release is published
        hash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
      };

  # cargo dependencies hash - update when Cargo.lock changes
  cargoHash = "sha256-ES+ESrQpIv6y/bub+4NgGhd0n5+msnMZET9tE2aNgAI=";

  # pnpm dependencies for the frontend
  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    pnpm = pnpm_9;
    fetcherVersion = 3;
    hash = "sha256-8rVxz7QCmlQDecuLAqTAVN7NsEgl2BE2R+AajlS4RIE="; # pnpmDeps
  };

  nativeBuildInputs = [
    # official tauri hook for nix
    cargo-tauri.hook

    # frontend
    nodejs_20
    pnpmConfigHook
    pnpm_9

    # Rust setup
    rustPlatform.cargoSetupHook

    # build tools (linux)
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
  ]
  ++ lib.optionals stdenv.hostPlatform.isDarwin [
    libiconv
    apple-sdk_14
  ];

  # set Tauri source directory
  cargoRoot = "src-tauri";
  buildAndTestSubdir = "src-tauri";

  # patch libappindicator path on Linux for tray icon support
  postPatch =
    lib.optionalString stdenv.hostPlatform.isLinux ''
      substituteInPlace $cargoDepsCopy/libappindicator-sys-*/src/lib.rs \
        --replace-fail "libayatana-appindicator3.so.1" "${libayatana-appindicator}/lib/libayatana-appindicator3.so.1"
    ''
    + ''
      # Disable updater artifact creation to avoid requiring signing keys
      # Regular users don't have the private signing key, and don't need updater artifacts
      substituteInPlace src-tauri/tauri.conf.json \
        --replace-fail '"createUpdaterArtifacts": true' '"createUpdaterArtifacts": false'
    '';

  # build the frontend before Tauri build
  # disable bundle signing since we don't have the signing keys
  preBuild = ''
    unset TAURI_SIGNING_PRIVATE_KEY
    unset TAURI_SIGNING_PUBLIC_KEY
    pnpm build
  '';

  # on macOS, create a wrapper script in $out/bin
  postInstall = lib.optionalString stdenv.hostPlatform.isDarwin ''
    mkdir -p $out/bin
    makeWrapper "$out/Applications/Chiri.app/Contents/MacOS/chiri" "$out/bin/chiri"
  '';

  # tauri apps typically don't have cargo tests
  doCheck = false;

  meta = {
    description = "A cross-platform CalDAV task management app. Currently in very early alpha!";
    homepage = "https://github.com/SapphoSys/chiri";
    changelog = "https://github.com/SapphoSys/chiri/releases/tag/v${finalAttrs.version}";
    license = lib.licenses.zlib;
    maintainers = with lib.maintainers; [ SapphoSys ];
    mainProgram = "chiri";
    platforms = lib.platforms.linux ++ lib.platforms.darwin;
  };
})
