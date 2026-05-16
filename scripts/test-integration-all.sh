#!/usr/bin/env bash
# Run the integration test suite against every local nix CalDAV server in turn.
#
# For each server:
#   1. Boot the nix app in the background
#   2. Wait for it to become reachable
#   3. Write the matching credentials to .env.local
#   4. Run `pnpm test:integration`
#   5. Kill the server
#
# Preserves the original .env.local across the run (restored on exit). Failures
# in one server don't stop the rest; final exit status is the OR of all servers.

set -uo pipefail
cd "$(dirname "$0")/.."

# Restore .env.local on exit, regardless of how we got here.
ENV_BACKUP=""
if [ -f .env.local ]; then
  ENV_BACKUP=$(mktemp)
  cp .env.local "$ENV_BACKUP"
fi

cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
  if [ -n "$ENV_BACKUP" ]; then
    cp "$ENV_BACKUP" .env.local
    rm -f "$ENV_BACKUP"
  fi
}
trap cleanup EXIT INT TERM

# Wait up to ~30s for an HTTP endpoint to return a useful status code.
wait_for_ready() {
  local url="$1"
  local auth="${2:-}"
  for _ in $(seq 1 30); do
    local code
    if [ -n "$auth" ]; then
      code=$(curl -s -o /dev/null -w "%{http_code}" -u "$auth" -X PROPFIND -H 'Depth: 0' "$url" 2>/dev/null)
    else
      code=$(curl -s -o /dev/null -w "%{http_code}" -X PROPFIND -H 'Depth: 0' "$url" 2>/dev/null)
    fi
    if echo "$code" | grep -qE "^(200|207|401)$"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

run_server() {
  local name="$1" nix_app="$2" env_block="$3" ready_url="$4" ready_auth="$5"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # write env for this run
  printf '%s\n' "$env_block" > .env.local

  # boot server
  local log
  log=$(mktemp)
  nix run ".#$nix_app" > "$log" 2>&1 &
  SERVER_PID=$!

  if ! wait_for_ready "$ready_url" "$ready_auth"; then
    echo "  ✗ $name failed to start (see $log)"
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
    SERVER_PID=""
    return 1
  fi

  # run the suite, capture status
  set +e
  pnpm test:integration
  local status=$?
  set -e

  # tear down
  kill "$SERVER_PID" 2>/dev/null
  wait "$SERVER_PID" 2>/dev/null
  SERVER_PID=""
  rm -f "$log"

  return $status
}

FAIL=0

run_server "xandikos" "caldav-xandikos" \
  "$(cat <<EOF
CHIRI_TEST_CALDAV_URL=http://localhost:5232
CHIRI_TEST_CALDAV_USERNAME=test
CHIRI_TEST_CALDAV_PASSWORD=ignored
CHIRI_TEST_CALDAV_TYPE=generic
CHIRI_TEST_CALDAV_HOME=http://localhost:5232/test/calendars
EOF
)" \
  "http://localhost:5232/test/" "" || FAIL=1

run_server "radicale" "caldav-radicale" \
  "$(cat <<EOF
CHIRI_TEST_CALDAV_URL=http://localhost:5233
CHIRI_TEST_CALDAV_USERNAME=unit-tests
CHIRI_TEST_CALDAV_PASSWORD=unit-tests
CHIRI_TEST_CALDAV_TYPE=radicale
EOF
)" \
  "http://localhost:5233/unit-tests/" "unit-tests:unit-tests" || FAIL=1

run_server "baikal" "caldav-baikal" \
  "$(cat <<EOF
CHIRI_TEST_CALDAV_URL=http://localhost:8080
CHIRI_TEST_CALDAV_USERNAME=unit-tests
CHIRI_TEST_CALDAV_PASSWORD=unit-tests
CHIRI_TEST_CALDAV_TYPE=baikal
EOF
)" \
  "http://localhost:8080/dav.php/principals/unit-tests/" "unit-tests:unit-tests" || FAIL=1

run_server "nextcloud" "caldav-nextcloud" \
  "$(cat <<EOF
CHIRI_TEST_CALDAV_URL=http://localhost:8081
CHIRI_TEST_CALDAV_USERNAME=unit-tests
CHIRI_TEST_CALDAV_PASSWORD=unit-tests
CHIRI_TEST_CALDAV_TYPE=nextcloud
EOF
)" \
  "http://localhost:8081/remote.php/dav/principals/users/unit-tests/" "unit-tests:unit-tests" || FAIL=1

run_server "rustical" "caldav-rustical" \
  "$(cat <<EOF
CHIRI_TEST_CALDAV_URL=http://localhost:4000
CHIRI_TEST_CALDAV_USERNAME=unit-tests
CHIRI_TEST_CALDAV_PASSWORD=unit-tests
CHIRI_TEST_CALDAV_TYPE=rustical
EOF
)" \
  "http://localhost:4000/caldav/principal/unit-tests/" "unit-tests:unit-tests" || FAIL=1

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "all servers passed ✓"
else
  echo "at least one server failed ✗"
fi
exit "$FAIL"
