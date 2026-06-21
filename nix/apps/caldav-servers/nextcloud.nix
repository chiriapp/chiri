# Nextcloud test server. Full PHP groupware stack with CalDAV/CardDAV
# and the DAV Push extension enabled for WebDAV Push integration tests
#
# defaults:
#   - port 8081 (so it doesn't collide with Baikal on 8080)
#   - data dir $XDG_DATA_HOME or ~/.local/share/chiri-caldav-test/nextcloud
#   - test/admin user: unit-tests / unit-tests
#
# override with CALDAV_DATA_DIR, CALDAV_PORT, CALDAV_USERNAME, CALDAV_PASSWORD
#
# auto-seeded on first run: Nextcloud is installed with SQLite, the configured
# user is created as admin, and a default DAV calendar is created
#
# URL pattern:
#   http://localhost:8081/remote.php/dav/principals/users/{username}/
#   http://localhost:8081/remote.php/dav/calendars/{username}/

{ pkgs }:

let
  nextcloudPackageName =
    pkgs.lib.findFirst (name: builtins.hasAttr name pkgs)
      (throw "No supported Nextcloud package found in nixpkgs")
      [
        "nextcloud33"
        "nextcloud32"
      ];

  nextcloud = pkgs.${nextcloudPackageName}.overrideAttrs (old: {
    meta = old.meta // {
      # the derivation is just the upstream PHP source tree. It is useful for
      # local test servers on Darwin too, even though the NixOS service is
      # Linux-only
      platforms = pkgs.lib.platforms.unix;
    };
  });

  php = pkgs.php.withExtensions (
    { enabled, all }:
    enabled
    ++ (with all; [
      bz2
      intl
      sodium
      sqlite3
      pdo_sqlite
    ])
  );

  davPushApp = pkgs.fetchurl {
    url = "https://github.com/bitfireAT/nc_ext_dav_push/releases/download/v1.0.1/dav_push.tar.gz";
    hash = "sha256-tSLsSgPHdpfcKPzJubwchBqQykLf9WV/mXfKKM2CSxs=";
  };

  nextcloudWithDavPush = pkgs.runCommand "${nextcloudPackageName}-with-dav-push" { } ''
    mkdir -p "$out"
    cp -R "${nextcloud}/." "$out/"
    chmod -R u+w "$out"

    rm -rf "$out/apps/dav_push"
    tar -xzf "${davPushApp}" -C "$out/apps"
  '';

  davPushTestCa = pkgs.writeText "chiri-dav-push-test-ca.pem" ''
    -----BEGIN CERTIFICATE-----
    MIIBMjCB2AIJAIRABrIYORE/MAoGCCqGSM49BAMCMCExHzAdBgNVBAMMFkNoaXJp
    IERBViBQdXNoIFRlc3QgQ0EwHhcNMjYwNTI2MTU0ODI0WhcNMzYwNTIzMTU0ODI0
    WjAhMR8wHQYDVQQDDBZDaGlyaSBEQVYgUHVzaCBUZXN0IENBMFkwEwYHKoZIzj0C
    AQYIKoZIzj0DAQcDQgAEUVmS2qVHAJLbTLnQ4+GnOBk3Da5rKfzzzR1pxf/DvwL+
    RdJWhc0/IoInaQ6/jUP57gZb4yI0LouI0AfGKudVSzAKBggqhkjOPQQDAgNJADBG
    AiEAvtv58XgOuNJYEbzcErRV7AwUoUklKadI7Z9akuZ99HECIQCJorop36ry147T
    N4L7KueS1wV8nDYw/NX4p4i/iI+IsQ==
    -----END CERTIFICATE-----
  '';

  package = pkgs.writeShellApplication {
    name = "caldav-nextcloud";
    runtimeInputs = [
      php
    ];
    text = ''
      DATA_DIR="''${CALDAV_DATA_DIR:-$HOME/.local/share/chiri-caldav-test/nextcloud}"
      PORT="''${CALDAV_PORT:-8081}"
      USERNAME="''${CALDAV_USERNAME:-unit-tests}"
      PASSWORD="''${CALDAV_PASSWORD:-unit-tests}"
      INSTALL_DIR="${nextcloudWithDavPush}"
      CONFIG_DIR="$DATA_DIR/config"
      NEXTCLOUD_DATA_DIR="$DATA_DIR/data"
      PHP_STATE_DIR="$DATA_DIR/php"

      mkdir -p "$DATA_DIR" "$CONFIG_DIR" "$NEXTCLOUD_DATA_DIR" "$PHP_STATE_DIR/tmp" "$PHP_STATE_DIR/sessions"

      export NEXTCLOUD_CONFIG_DIR="$CONFIG_DIR"
      export CHIRI_NEXTCLOUD_INSTALL_DIR="$INSTALL_DIR"
      export CI=1

      occ() {
        (cd "$INSTALL_DIR" && php \
          -d memory_limit=512M \
          -d sys_temp_dir="$PHP_STATE_DIR/tmp" \
          -d session.save_path="$PHP_STATE_DIR/sessions" \
          occ "$@")
      }

      if [ ! -f "$CONFIG_DIR/config.php" ]; then
        echo "Auto-seeding Nextcloud: $USERNAME/$PASSWORD with SQLite ..."

        occ maintenance:install \
          --database sqlite \
          --admin-user "$USERNAME" \
          --admin-pass "$PASSWORD" \
          --data-dir "$NEXTCLOUD_DATA_DIR"

        occ config:system:set trusted_domains 0 --value="localhost"
        occ config:system:set trusted_domains 1 --value="127.0.0.1"
        occ config:system:set trusted_domains 2 --value="localhost:$PORT"
        occ config:system:set trusted_domains 3 --value="127.0.0.1:$PORT"
        occ config:system:set overwrite.cli.url --value="http://localhost:$PORT"
        occ config:system:set maintenance_window_start --type=integer --value=1

        # give CalDAV discovery something useful immediately. Ignore failure in
        # case a future Nextcloud version creates it during installation
        occ dav:create-calendar "$USERNAME" default || true
      fi

      occ config:system:set allow_local_remote_servers --type=boolean --value=true
      occ config:system:set dns_pinning --type=boolean --value=false
      occ security:certificates:import "${davPushTestCa}" || true
      occ app:enable dav_push || true

      ROUTER="$DATA_DIR/router.php"
      cat > "$ROUTER" <<'EOF'
      <?php
      $installDir = getenv('CHIRI_NEXTCLOUD_INSTALL_DIR');
      $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

      if ($path === '/.well-known/caldav' || $path === '/.well-known/carddav') {
          header('Location: /remote.php/dav/', true, 301);
          return true;
      }

      if ($path === '/remote.php' || str_starts_with($path, '/remote.php/')) {
          $_SERVER['SCRIPT_FILENAME'] = $installDir . '/remote.php';
          $_SERVER['SCRIPT_NAME'] = '/remote.php';
          $_SERVER['PHP_SELF'] = $path;
          $_SERVER['PATH_INFO'] = substr($path, strlen('/remote.php'));
          require $installDir . '/remote.php';
          return true;
      }

      $file = $installDir . $path;
      if ($path !== '/' && is_file($file)) {
          return false;
      }

      $_SERVER['SCRIPT_FILENAME'] = $installDir . '/index.php';
      $_SERVER['SCRIPT_NAME'] = '/index.php';
      $_SERVER['PHP_SELF'] = '/index.php';
      require $installDir . '/index.php';
      return true;
      EOF

      echo "Nextcloud CalDAV test server (${nextcloudPackageName})"
      echo "  Web UI:        http://localhost:$PORT/"
      echo "  CalDAV root:   http://localhost:$PORT/remote.php/dav/"
      echo "  Test user:     $USERNAME / $PASSWORD"
      echo "  Principal URL: http://localhost:$PORT/remote.php/dav/principals/users/$USERNAME/"
      echo "  Data:          $DATA_DIR"
      echo ""
      echo "Press Ctrl+C to stop."
      echo ""

      exec php \
        -d memory_limit=512M \
        -d sys_temp_dir="$PHP_STATE_DIR/tmp" \
        -d session.save_path="$PHP_STATE_DIR/sessions" \
        -S "127.0.0.1:$PORT" \
        -t "$INSTALL_DIR" \
        "$ROUTER"
    '';
  };
in
{
  inherit package;

  app = {
    type = "app";
    program = "${package}/bin/caldav-nextcloud";
  };
}
