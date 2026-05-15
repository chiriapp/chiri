# Xandikos test server. Lightweight Python CalDAV/CardDAV
# Storage: dulwich (a pure-Python git backend, writes to data dir)
# Auth: none. anyone can read/write the principal collection
#
# defaults:
#   - port 5232
#   - principal /test/
#   - data dir $XDG_DATA_HOME or ~/.local/share/chiri-caldav-test/xandikos
#
# override with CALDAV_DATA_DIR, CALDAV_PORT, CALDAV_PRINCIPAL

{ pkgs }:

let
  script = pkgs.writeShellApplication {
    name = "caldav-xandikos";
    runtimeInputs = [ pkgs.xandikos ];
    text = ''
      DATA_DIR="''${CALDAV_DATA_DIR:-$HOME/.local/share/chiri-caldav-test/xandikos}"
      PORT="''${CALDAV_PORT:-5232}"
      PRINCIPAL="''${CALDAV_PRINCIPAL:-test}"

      mkdir -p "$DATA_DIR"

      echo "Xandikos CalDAV test server (no auth)"
      echo "  Principal URL: http://localhost:$PORT/$PRINCIPAL/"
      echo "  Data:          $DATA_DIR"
      echo ""
      echo "Press Ctrl+C to stop."
      echo ""

      # dulwich (xandikos's git backend) reads ~/.gitconfig and will try to
      # invoke commit-signing helpers (op-ssh-sign etc.) on every write.
      # Override with a throwaway gitconfig that disables signing.
      GITCONFIG_OVERRIDE=$(mktemp)
      printf '[commit]\n\tgpgsign = false\n[user]\n\tname = xandikos-test\n\temail = test@localhost\n' > "$GITCONFIG_OVERRIDE"
      export GIT_CONFIG_GLOBAL="$GITCONFIG_OVERRIDE"
      trap 'rm -f "$GITCONFIG_OVERRIDE"' EXIT

      exec xandikos serve \
        -d "$DATA_DIR" \
        -l 127.0.0.1 \
        -p "$PORT" \
        --current-user-principal "/$PRINCIPAL/" \
        --defaults
    '';
  };
in
{
  type = "app";
  program = "${script}/bin/caldav-xandikos";
}
