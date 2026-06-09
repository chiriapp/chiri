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

  # This tracks signed/notarized release artifacts, not the checkout version.
  # Update the version and per-platform hashes when publishing new artifacts.
  version ? "0.9.1",
}:

let
  inherit (stdenvNoCC.hostPlatform) system;

  # Map Nix system to release asset info
  platformInfo = {
    "x86_64-linux" = {
      asset = "Chiri_${version}_amd64.deb";
      hash = "sha256-RS0lC2w//LUfNvPBuPLjr04Pi9z7lBzxuOiRGRtHQPc=";
    };
    "aarch64-linux" = {
      asset = "Chiri_${version}_arm64.deb";
      hash = "sha256-VEQ46sb6fKFBdrFKGdu2yoUxbjkA6Tu4oGzDRsnTslg=";
    };
    "x86_64-darwin" = {
      asset = "Chiri_${version}_x64.dmg";
      hash = "sha256-PTGolevIEO15C41SUCX2R+yB5b1njMaA05F6uWCRX68=";
    };
    "aarch64-darwin" = {
      asset = "Chiri_${version}_aarch64.dmg";
      hash = "sha256-8ZIs6BpP0Hm1gbcg70/F8VK/l7POpegORD0V4P5fS38=";
    };
  };

  info = platformInfo.${system} or (throw "Unsupported platform: ${system}");

  src = fetchurl {
    url = "https://github.com/chiriapp/chiri/releases/download/app-v${version}/${info.asset}";
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
      description = "Cross-platform CalDAV task management app. (pre-built binary)";
      homepage = "https://github.com/chiriapp/chiri";
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
        mv $out/bin/Chiri $out/bin/chiri
      fi

      # Copy desktop file and icons if present
      if [ -d "usr/share" ]; then
        cp -r usr/share $out/
      fi

      runHook postInstall
    '';

    # Wrap to set required environment variables
    postFixup = ''
      if [ -f "$out/bin/chiri" ]; then
        wrapProgram $out/bin/chiri \
          --set GIO_EXTRA_MODULES "${glib-networking}/lib/gio/modules" \
          --prefix LD_LIBRARY_PATH : "${lib.makeLibraryPath [ libayatana-appindicator ]}"
      fi

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

    meta = {
      description = "Cross-platform CalDAV task management app. (pre-built binary)";
      homepage = "https://github.com/chiriapp/chiri";
      license = lib.licenses.zlib;
      maintainers = with lib.maintainers; [ SapphoSys ];
      mainProgram = "chiri";
      platforms = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      sourceProvenance = with lib.sourceTypes; [ binaryNativeCode ];
    };
  }
