# Stalwart test server. Modern Rust mail/groupware server with CalDAV/CardDAV/WebDAV support.
#
# defaults:
#   - port 8082
#   - data dir $XDG_DATA_HOME or ~/.local/share/chiri-caldav-test/stalwart
#   - test user: unit-tests / unit-tests
#
# override with CALDAV_DATA_DIR, CALDAV_PORT, CALDAV_USERNAME, CALDAV_PASSWORD
#
# auto-seeded on first run: starts Stalwart in recovery mode, provisions an
# internal domain, HTTP listener, test account, and a CalDAV-capable role via
# the management API, then exits recovery mode and starts the server normally.
#
# URL pattern (v0.16+):
#   http://localhost:8082/dav/pal/{username}@example.test/
#   http://localhost:8082/dav/cal/{username}@example.test/

{ pkgs }:

let
  package = pkgs.writeShellApplication {
    name = "caldav-stalwart";
    runtimeInputs = [
      pkgs.stalwart_0_16
      pkgs.stalwart-cli
      pkgs.python3
    ];
    text = ''
      DATA_DIR="''${CALDAV_DATA_DIR:-$HOME/.local/share/chiri-caldav-test/stalwart}"
      PORT="''${CALDAV_PORT:-8082}"
      USERNAME="''${CALDAV_USERNAME:-unit-tests}"
      PASSWORD="''${CALDAV_PASSWORD:-unit-tests}"
      export STALWART_PUBLIC_URL="''${STALWART_PUBLIC_URL:-http://localhost:$PORT}"
      RECOVERY_PORT=$((PORT + 10000))

      if [ "$RECOVERY_PORT" -gt 65535 ]; then
        echo "error: recovery port $RECOVERY_PORT is out of range; use a CALDAV_PORT below 55535" >&2
        exit 1
      fi

      mkdir -p "$DATA_DIR"

      cat > "$DATA_DIR/config.json" <<EOF
      {"@type": "RocksDb", "path": "$DATA_DIR/db", "blobSize": 4096}
      EOF

      # Seed the datastore on first run. Recovery mode exposes the management API
      # on a separate port so we can declaratively provision the domain, listener,
      # role, and test account without going through the WebUI bootstrap wizard.
      if [ ! -f "$DATA_DIR/.seeded" ] || [ ! -d "$DATA_DIR/db" ]; then
        python3 - "$DATA_DIR" "$PORT" "$RECOVERY_PORT" "$USERNAME" "$PASSWORD" <<'PY'
      import json
      import os
      import shutil
      import subprocess
      import sys
      import time
      import urllib.request

      data_dir = sys.argv[1]
      port = int(sys.argv[2])
      recovery_port = int(sys.argv[3])
      username = sys.argv[4]
      password = sys.argv[5]

      stalwart_bin = shutil.which("stalwart") or "stalwart"
      cli_bin = shutil.which("stalwart-cli") or "stalwart-cli"
      config_path = os.path.join(data_dir, "config.json")
      db_dir = os.path.join(data_dir, "db")

      # Start from a clean data dir each time we re-seed.
      shutil.rmtree(db_dir, ignore_errors=True)
      os.makedirs(db_dir, exist_ok=True)

      # Permission set covering CalDAV/CardDAV/WebDAV discovery and task use.
      dav_permissions = [
          "authenticate",
          "authenticateWithAlias",
          "davSyncCollection",
          "davExpandProperty",
          "davPrincipalAcl",
          "davPrincipalList",
          "davPrincipalMatch",
          "davPrincipalSearch",
          "davPrincipalSearchPropSet",
          "davFilePropFind",
          "davFilePropPatch",
          "davFileGet",
          "davFileMkCol",
          "davFileDelete",
          "davFilePut",
          "davFileCopy",
          "davFileMove",
          "davFileLock",
          "davFileAcl",
          "davCardPropFind",
          "davCardPropPatch",
          "davCardGet",
          "davCardMkCol",
          "davCardDelete",
          "davCardPut",
          "davCardCopy",
          "davCardMove",
          "davCardLock",
          "davCardAcl",
          "davCardQuery",
          "davCardMultiGet",
          "davCalPropFind",
          "davCalPropPatch",
          "davCalGet",
          "davCalMkCol",
          "davCalDelete",
          "davCalPut",
          "davCalCopy",
          "davCalMove",
          "davCalLock",
          "davCalAcl",
          "davCalQuery",
          "davCalMultiGet",
          "davCalFreeBusyQuery",
          "calendarAlarmsSend",
          "calendarSchedulingSend",
          "calendarSchedulingReceive",
      ]
      enabled_perms = {p: True for p in dav_permissions}

      plan = [
          {
              "@type": "create",
              "object": "Domain",
              "value": {
                  "example.test": {
                      "@type": "Domain",
                      "name": "example.test",
                  }
              },
          },
          {
              "@type": "update",
              "object": "SystemSettings",
              "value": {
                  "@type": "SystemSettings",
                  "defaultDomainId": "#example.test",
                  "defaultHostname": "local.test",
              },
          },
          {
              "@type": "create",
              "object": "NetworkListener",
              "value": {
                  "http": {
                      "@type": "NetworkListener",
                      "name": "http",
                      "protocol": "http",
                      "bind": {f"0.0.0.0:{port}": True},
                      "useTls": False,
                      "tlsImplicit": False,
                  }
              },
          },
          {
              "@type": "create",
              "object": "Role",
              "value": {
                  "chiri-test-user": {
                      "@type": "Role",
                      "description": "CalDAV test user role",
                      "enabledPermissions": enabled_perms,
                  }
              },
          },
          {
              "@type": "create",
              "object": "Account",
              "value": {
                  username: {
                      "@type": "User",
                      "name": username,
                      "domainId": "#example.test",
                      "credentials": {
                          "0": {"@type": "Password", "secret": password}
                      },
                      "roles": {
                          "@type": "Custom",
                          "roleIds": {"#chiri-test-user": True},
                      },
                  }
              },
          },
      ]

      plan_path = os.path.join(data_dir, "seed.json")
      with open(plan_path, "w") as f:
          for op in plan:
              f.write(json.dumps(op) + "\n")

      env = os.environ.copy()
      env["STALWART_RECOVERY_MODE"] = "1"
      env["STALWART_RECOVERY_ADMIN"] = "admin:adminpass"
      env["STALWART_RECOVERY_MODE_PORT"] = str(recovery_port)
      proc = subprocess.Popen(
          [stalwart_bin, f"--config={config_path}"],
          stdout=subprocess.PIPE,
          stderr=subprocess.STDOUT,
          text=True,
          env=env,
          cwd=data_dir,
      )

      try:
          for _ in range(120):
              if proc.poll() is not None:
                  raise RuntimeError(
                      f"stalwart recovery mode exited early (code {proc.returncode})"
                  )
              try:
                  req = urllib.request.Request(
                      f"http://127.0.0.1:{recovery_port}/.well-known/jmap",
                      method="GET",
                  )
                  with urllib.request.urlopen(req, timeout=2) as resp:
                      if resp.status == 200:
                          break
              except Exception:
                  pass
              time.sleep(1)
          else:
              raise RuntimeError("timeout waiting for stalwart recovery mode")

          result = subprocess.run(
              [
                  cli_bin,
                  "--url", f"http://127.0.0.1:{recovery_port}",
                  "--user", "admin",
                  "--password", "adminpass",
                  "apply",
                  "--file", plan_path,
              ],
              capture_output=True,
              text=True,
              timeout=120,
          )
          if result.returncode != 0:
              raise RuntimeError(f"stalwart-cli apply failed:\n{result.stderr}")
      finally:
          proc.terminate()
          try:
              proc.wait(timeout=10)
          except subprocess.TimeoutExpired:
              proc.kill()
              proc.wait()

      with open(os.path.join(data_dir, ".seeded"), "w") as f:
          f.write("")
      print("Stalwart seeded successfully")
      PY
      fi

      echo "Stalwart CalDAV test server"
      echo "  CalDAV root:   http://localhost:$PORT/dav/"
      echo "  Test user:     $USERNAME / $PASSWORD"
      echo "  Principal URL: http://localhost:$PORT/dav/pal/$USERNAME@example.test/"
      echo "  Data:          $DATA_DIR"
      echo ""
      echo "Press Ctrl+C to stop."
      echo ""

      exec stalwart --config="$DATA_DIR/config.json"
    '';
  };
in
{
  inherit package;

  app = {
    type = "app";
    program = "${package}/bin/caldav-stalwart";
  };
}
