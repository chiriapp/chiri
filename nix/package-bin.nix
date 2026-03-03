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
  version ? "0.6.3",
}:

let
  inherit (stdenvNoCC.hostPlatform) system;

  # Map Nix system to release asset info
  platformInfo = {
    "x86_64-linux" = {
      asset = "caldav-tasks_${version}_amd64.deb";
      hash = "sha256-Y36AF/V6fde3WfvXiVyP+aqYUGhHQ1rooVjmWBeLpGI=";
    };
    "aarch64-linux" = {
      asset = "caldav-tasks_${version}_arm64.deb";
      hash = "sha256-jgWZfx9AjyjnlSCQUuzivQIwaLAXxzzcrHE6QfLXuJc=";
    };
    "x86_64-darwin" = {
      asset = "caldav-tasks_${version}_x64.dmg";
      hash = "sha256-xFtE2vQCy8BempChY4mZx4mf4VP6R5Tc4lK/i6YA9PY=";
    };
    "aarch64-darwin" = {
      asset = "caldav-tasks_${version}_aarch64.dmg";
      hash = "sha256-WAg1fgsgveJFuf1HHSLEmjlEDYbF6eFFKjt3PADEpVM=";
    };
  };

  info = platformInfo.${system} or (throw "Unsupported platform: ${system}");

  src = fetchurl {
    url = "https://github.com/SapphoSys/caldav-tasks/releases/download/app-v${version}/${info.asset}";
    hash = info.hash;
  };
in
if stdenvNoCC.isDarwin then
  # macOS: extract from DMG
  stdenvNoCC.mkDerivation {
    pname = "caldav-tasks-bin";
    inherit version src;

    nativeBuildInputs = [
      undmg
      makeWrapper
    ];

    sourceRoot = ".";

    installPhase = ''
      runHook preInstall

      mkdir -p $out/Applications
      cp -r "caldav-tasks.app" $out/Applications/

      # Create wrapper script in bin
      mkdir -p $out/bin
      makeWrapper "$out/Applications/caldav-tasks.app/Contents/MacOS/caldav-tasks" "$out/bin/caldav-tasks"

      runHook postInstall
    '';

    meta = {
      description = "A cross-platform CalDAV task management app (pre-built binary)";
      homepage = "https://github.com/SapphoSys/caldav-tasks";
      license = lib.licenses.zlib;
      maintainers = with lib.maintainers; [ SapphoSys ];
      mainProgram = "caldav-tasks";
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
    pname = "caldav-tasks-bin";
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

      # Ensure the binary is in bin/
      if [ -f "$out/bin/caldav-tasks" ]; then
        chmod +x $out/bin/caldav-tasks
      fi

      # Copy desktop file and icons if present
      if [ -d "usr/share" ]; then
        cp -r usr/share $out/
      fi

      runHook postInstall
    '';

    # Wrap to set required environment variables
    postFixup = ''
      wrapProgram $out/bin/caldav-tasks \
        --set GIO_EXTRA_MODULES "${glib-networking}/lib/gio/modules" \
        --prefix LD_LIBRARY_PATH : "${lib.makeLibraryPath [ libayatana-appindicator ]}"
    '';

    meta = {
      description = "A cross-platform CalDAV task management app (pre-built binary)";
      homepage = "https://github.com/SapphoSys/caldav-tasks";
      license = lib.licenses.zlib;
      maintainers = with lib.maintainers; [ SapphoSys ];
      mainProgram = "caldav-tasks";
      platforms = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      sourceProvenance = with lib.sourceTypes; [ binaryNativeCode ];
    };
  }
