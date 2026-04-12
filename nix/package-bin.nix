{
  lib,
  stdenvNoCC,
  fetchurl,
  makeWrapper,
  autoPatchelfHook,
  dpkg,
  undmg,

  # Linux runtime dependencies
  glib,
  gtk3,
  webkitgtk_4_1,
  libayatana-appindicator,
  openssl,
  glib-networking,
  libsoup_3,

  # Optional: override version
  version ? "0.8.1",
}:

let
  inherit (stdenvNoCC.hostPlatform) system;

  # Map Nix system to release asset info
  platformInfo = {
    "x86_64-linux" = {
      asset = "chiri_${version}_amd64.deb";
      hash = "sha256-DvFBj5IevVWLbqyM36HJlvg7EEyIo/g5c9O1x3mMgo8=";
    };
    "aarch64-linux" = {
      asset = "chiri_${version}_arm64.deb";
      hash = "sha256-OMNKX69wQ7D/MV/ntOjj9Omn6Iq8WBquWgNo67bwrnU=";
    };
    "x86_64-darwin" = {
      asset = "chiri_${version}_x64.dmg";
      hash = "sha256-aXQ80QAEVAFrXlwD16b61U7VZ2c8QXtFk9NAhaa4X38=";
    };
    "aarch64-darwin" = {
      asset = "chiri_${version}_aarch64.dmg";
      hash = "sha256-8jutJ5vOb4VNNtcv2WzSMMkaHCtPjFFnSsN9/Hz6rAk=";
    };
  };

  info = platformInfo.${system} or (throw "Unsupported platform: ${system}");

  src = fetchurl {
    url = "https://github.com/SapphoSys/chiri/releases/download/app-v${version}/${info.asset}";
    hash = info.hash;
  };
in
if stdenvNoCC.isDarwin then
  # macOS: extract from DMG
  stdenvNoCC.mkDerivation {
    pname = "chiri-bin";
    inherit version src;

    nativeBuildInputs = [
      undmg
      makeWrapper
    ];

    sourceRoot = ".";

    installPhase = ''
      runHook preInstall

      chmod -R +w "Chiri.app"
      mkdir -p $out/Applications
      cp -r "Chiri.app" $out/Applications/

      # Create wrapper script in bin
      mkdir -p $out/bin
      makeWrapper "$out/Applications/Chiri.app/Contents/MacOS/chiri" "$out/bin/chiri"

      runHook postInstall
    '';

    meta = {
      description = "A cross-platform CalDAV task management app. Currently in very early alpha! (pre-built binary)";
      homepage = "https://github.com/SapphoSys/chiri";
      license = lib.licenses.zlib;
      maintainers = with lib.maintainers; [ SapphoSys ];
      mainProgram = "chiri";
      platforms = [
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      sourceProvenance = with lib.sourceTypes; [ binaryNativeCode ];
    };
  }
else
  # Linux: extract from .deb
  stdenvNoCC.mkDerivation {
    pname = "chiri-bin";
    inherit version src;

    nativeBuildInputs = [
      dpkg
      autoPatchelfHook
      makeWrapper
    ];

    buildInputs = [
      glib
      gtk3
      webkitgtk_4_1
      libayatana-appindicator
      openssl
      glib-networking
      libsoup_3
    ];

    unpackPhase = ''
      runHook preUnpack
      dpkg-deb -x $src .
      runHook postUnpack
    '';

    installPhase = ''
      runHook preInstall

      mkdir -p $out
      cp -r usr/* $out/

      if [ -f "$out/bin/Chiri" ]; then
        chmod +x $out/bin/Chiri
      fi

      # Copy desktop file and icons if present
      if [ -d "usr/share" ]; then
        cp -r usr/share $out/
      fi

      runHook postInstall
    '';

    # Wrap to set required environment variables
    postFixup = ''
      wrapProgram $out/bin/Chiri \
        --set GIO_EXTRA_MODULES "${glib-networking}/lib/gio/modules" \
        --prefix LD_LIBRARY_PATH : "${lib.makeLibraryPath [ libayatana-appindicator ]}"
    '';

    meta = {
      description = "A cross-platform CalDAV task management app. Currently in very early alpha! (pre-built binary)";
      homepage = "https://github.com/SapphoSys/chiri";
      license = lib.licenses.zlib;
      maintainers = with lib.maintainers; [ SapphoSys ];
      mainProgram = "Chiri";
      platforms = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      sourceProvenance = with lib.sourceTypes; [ binaryNativeCode ];
    };
  }
