# Nextcloud test server. Full PHP groupware stack with CalDAV/CardDAV
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
        "nextcloud35"
        "nextcloud34"
        "nextcloud33"
        "nextcloud32"
        "nextcloud31"
      ];

  nextcloud = pkgs.${nextcloudPackageName}.overrideAttrs (old: {
    meta = old.meta // {
      # The derivation is just the upstream PHP source tree. It is useful for
      # local test servers on Darwin too, even though the NixOS service is
      # Linux-only.
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

  script = pkgs.writeShellApplication {
    name = "caldav-nextcloud";
    runtimeInputs = [
      php
      pkgs.rsync
    ];
    text = ''
      DATA_DIR="''${CALDAV_DATA_DIR:-$HOME/.local/share/chiri-caldav-test/nextcloud}"
      PORT="''${CALDAV_PORT:-8081}"
      USERNAME="''${CALDAV_USERNAME:-unit-tests}"
      PASSWORD="''${CALDAV_PASSWORD:-unit-tests}"
      INSTALL_DIR="$DATA_DIR/server"
      CONFIG_DIR="$INSTALL_DIR/config"
      NEXTCLOUD_DATA_DIR="$DATA_DIR/data"
      PHP_STATE_DIR="$DATA_DIR/php"

      mkdir -p "$DATA_DIR" "$PHP_STATE_DIR/tmp" "$PHP_STATE_DIR/sessions"

      # Copy Nextcloud into a writable location on first run (or refresh source
      # on package upgrade). config/ and data/ hold per-install state and MUST
      # persist across runs.
      if [ ! -d "$INSTALL_DIR" ]; then
        echo "First run: copying Nextcloud source to $INSTALL_DIR ..."
        mkdir -p "$INSTALL_DIR"
        rsync -a "${nextcloud}/" "$INSTALL_DIR/"
      else
        rsync -a --exclude=config --exclude=data "${nextcloud}/" "$INSTALL_DIR/"
      fi
      chmod -R u+w "$INSTALL_DIR"
      mkdir -p "$CONFIG_DIR" "$NEXTCLOUD_DATA_DIR"

      export NEXTCLOUD_CONFIG_DIR="$CONFIG_DIR"
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

        # Give CalDAV discovery something useful immediately. Ignore failure in
        # case a future Nextcloud version creates it during installation.
        occ dav:create-calendar "$USERNAME" default || true
      fi

      ROUTER="$DATA_DIR/router.php"
      cat > "$ROUTER" <<'EOF'
      <?php
      $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

      if ($path === '/.well-known/caldav' || $path === '/.well-known/carddav') {
          header('Location: /remote.php/dav/', true, 301);
          return true;
      }

      if ($path === '/remote.php' || str_starts_with($path, '/remote.php/')) {
          $_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/server/remote.php';
          $_SERVER['SCRIPT_NAME'] = '/remote.php';
          $_SERVER['PHP_SELF'] = $path;
          $_SERVER['PATH_INFO'] = substr($path, strlen('/remote.php'));
          require __DIR__ . '/server/remote.php';
          return true;
      }

      $file = __DIR__ . '/server' . $path;
      if ($path !== '/' && is_file($file)) {
          return false;
      }

      $_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/server/index.php';
      $_SERVER['SCRIPT_NAME'] = '/index.php';
      $_SERVER['PHP_SELF'] = '/index.php';
      require __DIR__ . '/server/index.php';
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
  type = "app";
  program = "${script}/bin/caldav-nextcloud";
}
