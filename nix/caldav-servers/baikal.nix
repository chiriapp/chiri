# Baikal test server. PHP CalDAV/CardDAV built on SabreDAV
#
# defaults:
#   - port 8080
#   - data dir $XDG_DATA_HOME or ~/.local/share/chiri-caldav-test/baikal
#   - admin user: admin / admin
#   - test user:  unit-tests / unit-tests (override with CALDAV_USERNAME/PASSWORD)
#
# override with CALDAV_DATA_DIR, CALDAV_PORT, CALDAV_USERNAME, CALDAV_PASSWORD
#
# auto-seeded on first run: the install wizard is skipped. config + SQLite DB
# are pre-generated with admin + test user records. to force a clean re-seed,
# `rm -rf $CALDAV_DATA_DIR` and run again
#
# URL pattern:
#   http://localhost:8080/dav.php/principals/{username}/
#   http://localhost:8080/dav.php/calendars/{username}/

{ pkgs }:

let
  baikalSrc = "${pkgs.baikal}/share/php/baikal";

  script = pkgs.writeShellApplication {
    name = "caldav-baikal";
    runtimeInputs = [
      pkgs.php
      pkgs.rsync
      pkgs.sqlite
    ];
    text = ''
      DATA_DIR="''${CALDAV_DATA_DIR:-$HOME/.local/share/chiri-caldav-test/baikal}"
      PORT="''${CALDAV_PORT:-8080}"
      USERNAME="''${CALDAV_USERNAME:-unit-tests}"
      PASSWORD="''${CALDAV_PASSWORD:-unit-tests}"
      INSTALL_DIR="$DATA_DIR/baikal"
      DB_FILE="$INSTALL_DIR/Specific/db/db.sqlite"

      # Copy baikal source into a writable location on first run (or refresh
      # source on package upgrade). Specific/ + config/ hold per-install state
      # and MUST persist across runs.
      if [ ! -d "$INSTALL_DIR" ]; then
        echo "First run: copying Baikal source to $INSTALL_DIR ..."
        mkdir -p "$INSTALL_DIR"
        rsync -a "${baikalSrc}/" "$INSTALL_DIR/"
      else
        rsync -a --exclude=Specific --exclude=config "${baikalSrc}/" "$INSTALL_DIR/"
      fi
      chmod -R u+w "$INSTALL_DIR/Specific" "$INSTALL_DIR/config"

      # Auto-seed: write config + SQLite DB if not present. Skips the install
      # wizard so the server is ready for tests immediately.
      if [ ! -f "$DB_FILE" ]; then
        echo "Auto-seeding Baikal: admin/admin + $USERNAME/$PASSWORD ..."

        # Digest auth hash: md5("$user:$realm:$pass") — Baikal default realm is BaikalDAV.
        ADMIN_HASH=$(printf '%s' "admin:BaikalDAV:admin" | md5sum | awk '{print $1}')
        USER_HASH=$(printf '%s' "$USERNAME:BaikalDAV:$PASSWORD" | md5sum | awk '{print $1}')

        cat > "$INSTALL_DIR/config/baikal.yaml" <<EOF
      system:
          configured_version: '0.11.1'
          timezone: 'UTC'
          card_enabled: true
          cal_enabled: true
          invite_from: 'noreply@localhost'
          dav_auth_type: 'Basic'
          admin_passwordhash: '$ADMIN_HASH'
          failed_access_message: 'user %u authentication failure for Baikal'
          auth_realm: BaikalDAV
          base_uri: '''
      database:
          backend: 'sqlite'
          sqlite_file: '$DB_FILE'
      EOF

        # Build the SQLite DB from the schema + seed the admin and test user.
        sqlite3 "$DB_FILE" < "$INSTALL_DIR/Core/Resources/Db/SQLite/db.sql"
        sqlite3 "$DB_FILE" <<EOF
      INSERT INTO principals (uri, displayname, email) VALUES
          ('principals/admin', 'Administrator', 'admin@localhost'),
          ('principals/$USERNAME', '$USERNAME', '$USERNAME@localhost');
      INSERT INTO users (username, digesta1) VALUES
          ('admin', '$ADMIN_HASH'),
          ('$USERNAME', '$USER_HASH');
      -- Seed a default calendar for the test user so chiri's discovery sees it.
      INSERT INTO calendars (synctoken, components) VALUES (1, 'VEVENT,VTODO');
      INSERT INTO calendarinstances
          (calendarid, principaluri, access, displayname, uri, description,
           calendarorder, calendarcolor, transparent)
      VALUES
          (last_insert_rowid(), 'principals/$USERNAME', 1, 'Default',
           'default', 'Default calendar', 0, '#0091e2', 0);
      EOF
      fi

      echo "Baikal CalDAV test server"
      echo "  Admin:         http://localhost:$PORT/admin/  (admin / admin)"
      echo "  CalDAV root:   http://localhost:$PORT/dav.php/"
      echo "  Test user:     $USERNAME / $PASSWORD"
      echo "  Principal URL: http://localhost:$PORT/dav.php/principals/$USERNAME/"
      echo "  Data:          $DATA_DIR"
      echo ""
      echo "Press Ctrl+C to stop."
      echo ""

      exec php -S "127.0.0.1:$PORT" -t "$INSTALL_DIR/html"
    '';
  };
in
{
  type = "app";
  program = "${script}/bin/caldav-baikal";
}
