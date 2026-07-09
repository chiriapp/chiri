# Xandikos test server. Lightweight Python CalDAV/CardDAV
# storage: dulwich (a pure-Python git backend, writes to data dir)
# auth: none. anyone can read/write the principal collection
#
# defaults:
#   - port 5232
#   - principal /test/
#   - data dir $XDG_DATA_HOME or ~/.local/share/chiri-caldav-test/xandikos
#
# override with CALDAV_DATA_DIR, CALDAV_PORT, CALDAV_PRINCIPAL

{ pkgs }:

let
  customXandikos = pkgs.xandikos.overridePythonAttrs (old: {
    version = "master";
    src = pkgs.fetchFromGitHub {
      owner = "jelmer";
      repo = "xandikos";
      rev = "master";
      sha256 = "sha256-zb3IKecoCVjVksxj9xto3CwlkPfINn9ARHjKUb848zo=";
    };
    postPatch = ''
      sed -i 's/if ssl_context is None:/if False:/' xandikos/web.py
    '';
    dependencies = old.dependencies ++ (with pkgs.python3Packages; [
      pywebpush
      py-vapid
      bcrypt
    ]);
  });

  package = pkgs.writeShellApplication {
    name = "caldav-xandikos";
    runtimeInputs = [
      customXandikos
      pkgs.apacheHttpd
    ];
    text = ''
      DATA_DIR="''${CALDAV_DATA_DIR:-$HOME/.local/share/chiri-caldav-test/xandikos}"
      PORT="''${CALDAV_PORT:-5232}"
      PRINCIPAL="''${CALDAV_PRINCIPAL:-test}"
      USERNAME="''${CALDAV_USERNAME:-test}"
      PASSWORD="''${CALDAV_PASSWORD:-test}"

      mkdir -p "$DATA_DIR"

      HTPASSWD="$DATA_DIR/htpasswd"
      htpasswd -Bbc "$HTPASSWD" "$USERNAME" "$PASSWORD" > /dev/null 2>&1

      echo "Xandikos CalDAV test server"
      echo "  Principal URL: http://localhost:$PORT/$PRINCIPAL/"
      echo "  Credentials:   $USERNAME / $PASSWORD"
      echo "  Data:          $DATA_DIR"
      echo ""
      echo "Press Ctrl+C to stop."
      echo ""

      # dulwich (xandikos's git backend) reads ~/.gitconfig and will try to
      # invoke commit-signing helpers (op-ssh-sign etc.) on every write
      # override with a throwaway gitconfig that disables signing
      GITCONFIG_OVERRIDE=$(mktemp)
      printf '[commit]\n\tgpgsign = false\n[user]\n\tname = xandikos-test\n\temail = test@localhost\n' > "$GITCONFIG_OVERRIDE"
      export GIT_CONFIG_GLOBAL="$GITCONFIG_OVERRIDE"
      trap 'rm -f "$GITCONFIG_OVERRIDE"' EXIT

      exec xandikos serve \
        -d "$DATA_DIR" \
        -l 127.0.0.1 \
        -p "$PORT" \
        --current-user-principal "/$PRINCIPAL/" \
        --webdav-push \
        --htpasswd "$HTPASSWD" \
        --defaults
    '';
  };
in
{
  inherit package;

  app = {
    type = "app";
    program = "${package}/bin/caldav-xandikos";
  };
}
