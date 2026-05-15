# RustiCal test server. Modern Rust CalDAV/CardDAV with SQLite storage
#
# defaults:
#   - port 4000 (RustiCal's upstream default)
#   - data dir $XDG_DATA_HOME or ~/.local/share/chiri-caldav-test/rustical
#   - test user: unit-tests / unit-tests
#
# override with CALDAV_DATA_DIR, CALDAV_PORT, CALDAV_USERNAME, CALDAV_PASSWORD
#
# auto-seeded on every run: the configured principal gets a frontend password,
# an app token with the same value for CalDAV/CardDAV Basic auth, and a default
# calendar that supports VTODO
#
# URL pattern:
#   http://localhost:4000/caldav/principal/{username}/
#   http://localhost:4000/caldav/principal/{username}/default/

{ pkgs }:

let
  script = pkgs.writeShellApplication {
    name = "caldav-rustical";
    runtimeInputs = [
      pkgs.rustical
      pkgs.python3
    ];
    text = ''
      DATA_DIR="''${CALDAV_DATA_DIR:-$HOME/.local/share/chiri-caldav-test/rustical}"
      PORT="''${CALDAV_PORT:-4000}"
      USERNAME="''${CALDAV_USERNAME:-unit-tests}"
      PASSWORD="''${CALDAV_PASSWORD:-unit-tests}"
      CONFIG="$DATA_DIR/config.toml"
      DB_FILE="$DATA_DIR/db.sqlite3"

      mkdir -p "$DATA_DIR"

      cat > "$CONFIG" <<EOF
      [data_store.sqlite]
      db_url = "$DB_FILE"
      run_repairs = true
      skip_broken = true

      [http]
      host = "127.0.0.1"
      port = $PORT
      session_cookie_samesite_strict = false
      payload_limit_mb = 4

      [frontend]
      enabled = true
      allow_password_login = true

      [dav_push]
      enabled = false

      [nextcloud_login]
      enabled = true
      EOF

      # Create or refresh the principal. The hidden flag is intentionally used
      # by RustiCal itself for integration-test setups like this one.
      rustical --config-file "$CONFIG" principals edit "$USERNAME" \
        --name "$USERNAME" \
        --for-testing-password-from-arg "$PASSWORD" \
        > /dev/null 2>&1 \
        || rustical --config-file "$CONFIG" principals create "$USERNAME" \
          --name "$USERNAME" \
          --for-testing-password-from-arg "$PASSWORD" \
          > /dev/null

      export CHIRI_RUSTICAL_TEST_DB_FILE="$DB_FILE"
      export CHIRI_RUSTICAL_TEST_USERNAME="$USERNAME"
      export CHIRI_RUSTICAL_TEST_PASSWORD="$PASSWORD"

      python3 <<'PY'
      import base64
      import hashlib
      import os
      import sqlite3

      db_file = os.environ["CHIRI_RUSTICAL_TEST_DB_FILE"]
      username = os.environ["CHIRI_RUSTICAL_TEST_USERNAME"]
      password = os.environ["CHIRI_RUSTICAL_TEST_PASSWORD"]

      def phc_base64(raw):
          return base64.b64encode(raw).decode("ascii").rstrip("=")

      salt = os.urandom(16)
      digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 2, dklen=32)
      token_hash = (
          "$pbkdf2-sha256$i=2,l=32$"
          + phc_base64(salt)
          + "$"
          + phc_base64(digest)
      )

      with sqlite3.connect(db_file) as db:
          db.execute(
              """
              INSERT INTO app_tokens (id, principal, token, displayname)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                  principal = excluded.principal,
                  token = excluded.token,
                  displayname = excluded.displayname
              """,
              ("chiri-default-token", username, token_hash, "Chiri test client"),
          )
          db.execute(
              """
              INSERT INTO calendars
                  (principal, id, displayname, description, "order", color,
                   subscription_url, timezone_id, push_topic, comp_event,
                   comp_todo, comp_journal)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(principal, id) DO UPDATE SET
                  displayname = excluded.displayname,
                  description = excluded.description,
                  "order" = excluded."order",
                  color = excluded.color,
                  subscription_url = excluded.subscription_url,
                  timezone_id = excluded.timezone_id,
                  push_topic = excluded.push_topic,
                  comp_event = excluded.comp_event,
                  comp_todo = excluded.comp_todo,
                  comp_journal = excluded.comp_journal
              """,
              (
                  username,
                  "default",
                  "Default",
                  "Default calendar",
                  0,
                  "#0091e2",
                  None,
                  None,
                  f"chiri-{username}-default",
                  1,
                  1,
                  0,
              ),
          )
      PY

      echo "RustiCal CalDAV test server"
      echo "  Web UI:        http://localhost:$PORT/frontend/"
      echo "  CalDAV root:   http://localhost:$PORT/caldav/"
      echo "  Test user:     $USERNAME / $PASSWORD"
      echo "  Principal URL: http://localhost:$PORT/caldav/principal/$USERNAME/"
      echo "  Calendar URL:  http://localhost:$PORT/caldav/principal/$USERNAME/default/"
      echo "  Data:          $DATA_DIR"
      echo ""
      echo "Press Ctrl+C to stop."
      echo ""

      exec rustical --config-file "$CONFIG"
    '';
  };
in
{
  type = "app";
  program = "${script}/bin/caldav-rustical";
}
