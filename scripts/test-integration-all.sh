#!/usr/bin/env bash
# run the integration test suite against every local nix CalDAV server in turn
#
# for each server:
#   1. Boot the nix app in the background
#   2. Wait for it to become reachable
#   3. Write the matching credentials to .env.local
#   4. Run `pnpm test:integration`
#   5. Kill the server
#
# preserves the original .env.local across the run (restored on exit). Failures
# in one server don't stop the rest; final exit status is the OR of all servers

set -uo pipefail
cd "$(dirname "$0")/.." || exit

REPO_ROOT=$(pwd -P)
READY_TIMEOUT="${CHIRI_TEST_READY_TIMEOUT:-180}"
DATA_ROOT="${CHIRI_TEST_DATA_ROOT:-}"
DATA_ROOT_IS_TEMP=0

if [ -z "$DATA_ROOT" ]; then
  mkdir -p "$REPO_ROOT/tmp"
  DATA_ROOT=$(mktemp -d "$REPO_ROOT/tmp/caldav-integration.XXXXXX")
  DATA_ROOT_IS_TEMP=1
else
  mkdir -p "$DATA_ROOT"
  DATA_ROOT=$(cd "$DATA_ROOT" && pwd -P)
fi

# restore .env.local on exit, regardless of how we got here
ENV_BACKUP=""
if [ -f .env.local ]; then
  ENV_BACKUP=$(mktemp)
  cp .env.local "$ENV_BACKUP"
fi

# shellcheck disable=SC2329 # invoked by trap
cleanup() {
  if [ -n "${SERVER_PID:-}" ]; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
  if [ -n "$ENV_BACKUP" ]; then
    cp "$ENV_BACKUP" .env.local
    rm -f "$ENV_BACKUP"
  fi
  if [ "$DATA_ROOT_IS_TEMP" -eq 1 ] && [ "${CHIRI_TEST_KEEP_DATA:-0}" != "1" ]; then
    chmod -R u+w "$DATA_ROOT" 2>/dev/null || true
    rm -rf "$DATA_ROOT"
  fi
}
trap cleanup EXIT INT TERM

# wait for an HTTP endpoint to return a useful status code
wait_for_ready() {
  local url="$1"
  local auth="${2:-}"
  for _ in $(seq 1 "$READY_TIMEOUT"); do
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

RESULT_NAMES=()
RESULT_STATUSES=()
RESULT_DURATIONS=()
RESULT_DETAILS=()
SERVER_PACKAGES=(
  caldav-xandikos
  caldav-radicale
  caldav-baikal
  caldav-nextcloud
  caldav-rustical
)
SERVER_BINARIES=()

record_result() {
  local name="$1" status="$2" duration="$3" detail="$4"

  RESULT_NAMES+=("$name")
  RESULT_STATUSES+=("$status")
  RESULT_DURATIONS+=("$duration")
  RESULT_DETAILS+=("$detail")
}

markdown_escape_cell() {
  local value="$1"

  printf '%s' "$value" | tr '\n' ' ' | sed 's/|/\\|/g'
}

strip_ansi() {
  sed -E $'s|\x1b\\[[0-?]*[ -/]*[@-~]||g'
}

vitest_line() {
  local label="$1" log="$2"

  strip_ansi < "$log" \
    | grep -E "^[[:space:]]*${label}[[:space:]]+" \
    | tail -n 1 \
    | sed -E "s/^[[:space:]]*${label}[[:space:]]+//"
}

vitest_summary() {
  local log="$1" files tests other detail

  files=$(vitest_line "Test Files" "$log")
  tests=$(vitest_line "Tests" "$log")
  other=$(vitest_line "Other" "$log")

  detail=""
  if [ -n "$files" ]; then
    detail="files: $files"
  fi
  if [ -n "$tests" ]; then
    detail="${detail:+$detail; }tests: $tests"
  fi
  if [ -n "$other" ]; then
    detail="${detail:+$detail; }other: $other"
  fi

  printf '%s' "${detail:-no Vitest summary found}"
}

print_summary() {
  echo ""
  echo "Integration summary"
  printf '  %-10s %-6s %8s  %s\n' "server" "status" "duration" "details"
  printf '  %-10s %-6s %8s  %s\n' "----------" "------" "--------" "-------"

  for i in "${!RESULT_NAMES[@]}"; do
    printf '  %-10s %-6s %8ss  %s\n' \
      "${RESULT_NAMES[$i]}" \
      "${RESULT_STATUSES[$i]}" \
      "${RESULT_DURATIONS[$i]}" \
      "${RESULT_DETAILS[$i]}"
  done

  if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    {
      echo "## CalDAV integration"
      echo ""
      echo "| Server | Status | Duration | Details |"
      echo "| --- | --- | ---: | --- |"
      for i in "${!RESULT_NAMES[@]}"; do
        echo "| ${RESULT_NAMES[$i]} | ${RESULT_STATUSES[$i]} | ${RESULT_DURATIONS[$i]}s | $(markdown_escape_cell "${RESULT_DETAILS[$i]}") |"
      done
    } >> "$GITHUB_STEP_SUMMARY"
  fi
}

resolve_server_binaries() {
  local package path binary paths index nix_log
  local refs=()

  echo "Resolving CalDAV server packages..."
  for package in "${SERVER_PACKAGES[@]}"; do
    refs+=(".#$package")
  done

  nix_log=$(mktemp)
  if ! paths=$(nix build --quiet --no-link --print-out-paths "${refs[@]}" 2> "$nix_log"); then
    cat "$nix_log" >&2
    rm -f "$nix_log"
    return 1
  fi
  rm -f "$nix_log"

  index=0
  while IFS= read -r path; do
    [ -n "$path" ] || continue

    if [ "$index" -ge "${#SERVER_PACKAGES[@]}" ]; then
      echo "nix returned more CalDAV package paths than expected"
      return 1
    fi

    package="${SERVER_PACKAGES[$index]}"
    binary="$path/bin/$package"
    if [ ! -x "$binary" ]; then
      echo "missing executable for $package: $binary"
      return 1
    fi
    SERVER_BINARIES+=("$binary")
    index=$((index + 1))
  done <<< "$paths"

  if [ "$index" -ne "${#SERVER_PACKAGES[@]}" ]; then
    echo "nix returned $index CalDAV package paths; expected ${#SERVER_PACKAGES[@]}"
    return 1
  fi
}

server_binary_for() {
  local package="$1" i

  for i in "${!SERVER_PACKAGES[@]}"; do
    if [ "${SERVER_PACKAGES[$i]}" = "$package" ]; then
      printf '%s\n' "${SERVER_BINARIES[$i]}"
      return 0
    fi
  done

  return 1
}

run_server() {
  local name="$1" server_package="$2" env_block="$3" ready_url="$4" ready_auth="$5"
  local start
  start=$(date +%s)
  local server_data_dir="$DATA_ROOT/$name"
  local server_binary
  server_binary=$(server_binary_for "$server_package") || {
    echo "missing resolved server binary for $server_package"
    record_result "$name" "FAIL" 0 "server binary not resolved"
    return 1
  }

  if [ "${#RESULT_NAMES[@]}" -gt 0 ]; then
    echo ""
  fi
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $name"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # write env for this run
  printf '%s\n' "$env_block" > .env.local

  # boot server
  local log
  log=$(mktemp)
  CALDAV_DATA_DIR="$server_data_dir" "$server_binary" > "$log" 2>&1 &
  SERVER_PID=$!

  if ! wait_for_ready "$ready_url" "$ready_auth"; then
    local duration
    duration=$(($(date +%s) - start))
    echo "  ✗ $name failed to start (see $log)"
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
    SERVER_PID=""
    record_result "$name" "FAIL" "$duration" "startup failed; log: $log"
    return 1
  fi

  # run the suite with GitHub's summary path hidden so Vitest doesn't append
  # one generic "Vitest Test Report" block per CalDAV server
  local test_log
  local status
  test_log=$(mktemp)
  set +e
  GITHUB_STEP_SUMMARY='' pnpm test:integration 2>&1 | tee "$test_log"
  status=${PIPESTATUS[0]}

  # tear down
  kill "$SERVER_PID" 2>/dev/null
  wait "$SERVER_PID" 2>/dev/null
  SERVER_PID=""
  rm -f "$log"

  local duration
  local detail
  duration=$(($(date +%s) - start))
  detail=$(vitest_summary "$test_log")
  rm -f "$test_log"

  if [ "$status" -eq 0 ]; then
    echo "  ✓ $name passed in ${duration}s"
    record_result "$name" "PASS" "$duration" "$detail"
  else
    echo "  ✗ $name failed in ${duration}s"
    record_result "$name" "FAIL" "$duration" "tests failed; $detail"
  fi

  return "$status"
}

FAIL=0

echo "Integration data root: $DATA_ROOT"
echo "Ready timeout: ${READY_TIMEOUT}s"

resolve_server_binaries || exit 1

run_server "xandikos" "caldav-xandikos" \
  "$(cat <<EOF
CHIRI_TEST_CALDAV_URL=http://localhost:5232
CHIRI_TEST_CALDAV_USERNAME=test
CHIRI_TEST_CALDAV_PASSWORD=test
CHIRI_TEST_CALDAV_TYPE=generic
CHIRI_TEST_CALDAV_HOME=http://localhost:5232/test/calendars
EOF
)" \
  "http://localhost:5232/test/" "test:test" || FAIL=1

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

print_summary

if [ "$FAIL" -eq 0 ]; then
  echo "all servers passed ✓"
else
  echo "at least one server failed ✗"
fi
exit "$FAIL"
