# Radicale test server. Python CalDAV/CardDAV with flat per-user URL structure
#
# defaults:
#   - port 5233 (so it doesn't collide with xandikos on 5232)
#   - htpasswd auth with one user: unit-tests / unit-tests
#   - data dir $XDG_DATA_HOME or ~/.local/share/chiri-caldav-test/radicale
#
# override with CALDAV_DATA_DIR, CALDAV_PORT, CALDAV_USERNAME, CALDAV_PASSWORD
#
# URL pattern: http://localhost:5233/{username}/
# (Radicale provisions the user collection on first authenticated request)

{ pkgs }:

let
  script = pkgs.writeShellApplication {
    name = "caldav-radicale";
    runtimeInputs = [
      pkgs.radicale
      pkgs.apacheHttpd # provides htpasswd
    ];
    text = ''
      DATA_DIR="''${CALDAV_DATA_DIR:-$HOME/.local/share/chiri-caldav-test/radicale}"
      PORT="''${CALDAV_PORT:-5233}"
      USERNAME="''${CALDAV_USERNAME:-unit-tests}"
      PASSWORD="''${CALDAV_PASSWORD:-unit-tests}"

      mkdir -p "$DATA_DIR"

      # htpasswd file with the configured credentials. Regenerate on every run
      # so password changes pick up automatically.
      HTPASSWD="$DATA_DIR/htpasswd"
      # -B = bcrypt (matches radicale's htpasswd_encryption setting below)
      htpasswd -Bbc "$HTPASSWD" "$USERNAME" "$PASSWORD" > /dev/null 2>&1

      CONFIG=$(mktemp)
      cat > "$CONFIG" <<EOF
      [server]
      hosts = 127.0.0.1:$PORT

      [auth]
      type = htpasswd
      htpasswd_filename = $HTPASSWD
      htpasswd_encryption = bcrypt

      [storage]
      type = multifilesystem
      filesystem_folder = $DATA_DIR/collections
      EOF
      trap 'rm -f "$CONFIG"' EXIT

      echo "Radicale CalDAV test server"
      echo "  Principal URL: http://localhost:$PORT/$USERNAME/"
      echo "  Credentials:   $USERNAME / $PASSWORD"
      echo "  Data:          $DATA_DIR"
      echo ""
      echo "Press Ctrl+C to stop."
      echo ""

      exec radicale --config "$CONFIG"
    '';
  };
in
{
  type = "app";
  program = "${script}/bin/caldav-radicale";
}
