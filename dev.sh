#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"
CONTRACTS_DIR="$ROOT/packages/contracts"
LOG_DIR="$ROOT/.dev-logs"
PID_FILE="$LOG_DIR/run.pids"

API_PORT="${API_PORT:-3000}"
WEB_PORT="${WEB_PORT:-4200}"
API_READY_TIMEOUT="${API_READY_TIMEOUT:-120}"
WEB_READY_TIMEOUT="${WEB_READY_TIMEOUT:-180}"
SHUTDOWN_GRACE_SECONDS="${SHUTDOWN_GRACE_SECONDS:-8}"

RUN_API=1
RUN_WEB=1
FORCE_PACKAGES=0
SKIP_PACKAGES=0
RUN_MIGRATE=0
KILL_PORTS=0
LOG_TO_FILE=1
SHUTTING_DOWN=0

declare -a CHILD_PIDS=()

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  C_RESET=$'\033[0m' C_DIM=$'\033[2m' C_BOLD=$'\033[1m'
  C_API=$'\033[36m' C_WEB=$'\033[35m'
  C_OK=$'\033[32m' C_WARN=$'\033[33m' C_ERR=$'\033[31m'
else
  C_RESET='' C_DIM='' C_BOLD='' C_API='' C_WEB='' C_OK='' C_WARN='' C_ERR=''
fi

info() { printf '%s==>%s %s\n' "$C_DIM" "$C_RESET" "$*"; }
ok() { printf '%s ok %s %s\n' "$C_OK" "$C_RESET" "$*"; }
warn() { printf '%s !! %s %s\n' "$C_WARN" "$C_RESET" "$*" >&2; }
fail() { printf '%s xx %s %s\n' "$C_ERR" "$C_RESET" "$*" >&2; }

millis() { date +%s%3N; }

duration_since() {
  local ms=$(( $(millis) - $1 ))

  printf '%d.%ds' $((ms / 1000)) $(((ms % 1000) / 100))
}

usage() {
  cat <<'TEXT'
Pemakaian: ./dev.sh [opsi]

Menjalankan API (NestJS) dan Web (Angular) sekaligus dalam satu terminal dengan
keluaran berlabel [api] dan [web].

Opsi:
  --api-only          Hanya jalankan API
  --web-only          Hanya jalankan Web
  --force-packages    Selalu bangun ulang @kelas/contracts
  --skip-packages     Jangan sentuh @kelas/contracts sama sekali
  --migrate           Jalankan migrasi basis data sebelum menyalakan API
  --kill              Hentikan proses lain yang menahan port 3000/4200
  --no-log            Jangan simpan keluaran ke .dev-logs/
  --no-color          Matikan warna
  -h, --help          Tampilkan bantuan ini

Variabel lingkungan:
  API_PORT (3000), WEB_PORT (4200)
  API_READY_TIMEOUT (120), WEB_READY_TIMEOUT (180)
  SHUTDOWN_GRACE_SECONDS (8)

Contoh:
  ./dev.sh
  ./dev.sh --migrate
  ./dev.sh --api-only --kill
TEXT
}

command_exists() { command -v "$1" >/dev/null 2>&1; }

http_ok() { curl -fsS -o /dev/null --max-time 2 "$1" >/dev/null 2>&1; }

port_in_use() {
  local port="$1"

  if command_exists ss; then
    [[ -n "$(ss -Hltn "sport = :$port" 2>/dev/null)" ]]

    return
  fi

  (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null || return 1

  exec 3>&-

  return 0
}

port_holders() {
  local port="$1"

  command_exists ss || return 1

  ss -Hltnp "sport = :$port" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u
}

free_port() {
  local port="$1"
  local pids

  pids="$(port_holders "$port" || true)"

  if [[ -z "$pids" ]]; then
    warn "Port $port dipakai, tetapi pemiliknya tidak terbaca (perlu hak akses lebih)."

    return 1
  fi

  info "Menghentikan proses pada port $port: $(printf '%s ' $pids)"

  printf '%s\n' $pids | xargs -r kill -TERM 2>/dev/null || true

  local waited=0

  while port_in_use "$port" && ((waited < 30)); do
    sleep 0.2

    waited=$((waited + 1))
  done

  if port_in_use "$port"; then
    printf '%s\n' $pids | xargs -r kill -KILL 2>/dev/null || true

    sleep 0.3
  fi

  ! port_in_use "$port"
}

read_env_value() {
  local key="$1"
  local line

  [[ -f "$API_DIR/.env" ]] || return 1

  line="$(grep -E "^${key}=" "$API_DIR/.env" | tail -n 1 || true)"

  [[ -n "$line" ]] || return 1

  printf '%s' "${line#*=}"
}

database_reachable() {
  node --input-type=module -e '
    import net from "node:net";

    const target = new URL(process.argv[1]);
    const socket = net.connect({
      host: target.hostname,
      port: Number(target.port || 5432),
      timeout: 1500,
    });

    socket.once("connect", () => {
      socket.destroy();
      process.exit(0);
    });
    socket.once("timeout", () => {
      socket.destroy();
      process.exit(1);
    });
    socket.once("error", () => process.exit(1));
  ' "$1" >/dev/null 2>&1
}

database_label() {
  node --input-type=module -e '
    const target = new URL(process.argv[1]);

    process.stdout.write(`${target.hostname}:${target.port || 5432}${target.pathname}`);
  ' "$1" 2>/dev/null || printf 'basis data'
}

contracts_fresh() {
  local marker="$CONTRACTS_DIR/dist/index.js"
  local newer

  [[ -f "$marker" ]] || return 1

  newer="$(find "$CONTRACTS_DIR/src" -name '*.ts' -newer "$marker" -print -quit 2>/dev/null)"

  [[ -z "$newer" ]]
}

ensure_env_file() {
  [[ -f "$API_DIR/.env" ]] && return 0

  warn "$API_DIR/.env tidak ada, menyalin dari .env.example"

  cp "$API_DIR/.env.example" "$API_DIR/.env"

  warn "Sesuaikan DATABASE_URL dan APP_SECRET di $API_DIR/.env"
}

report_database() {
  local url start

  url="$(read_env_value DATABASE_URL || true)"

  if [[ -z "$url" ]]; then
    warn "DATABASE_URL kosong. API tetap hidup, tetapi permintaan data akan gagal."

    return 0
  fi

  start="$(millis)"

  if database_reachable "$url"; then
    ok "Basis data $(database_label "$url") terjangkau ($(duration_since "$start"))."

    return 0
  fi

  warn "Basis data $(database_label "$url") tidak terjangkau. Data akan gagal dimuat."
}

run_migrations() {
  local log="$LOG_DIR/migrate.log"

  info "Menjalankan migrasi basis data"

  if ! (cd "$ROOT" && pnpm --filter "@kelas/api" db:migrate >"$log" 2>&1); then
    fail "Migrasi gagal, lihat $log"

    tail -n 30 "$log" >&2

    return 1
  fi

  ok "Migrasi selesai."
}

ensure_packages() {
  local start log

  if ((SKIP_PACKAGES)); then
    warn "@kelas/contracts dilewati (--skip-packages)."

    return 0
  fi

  if ((FORCE_PACKAGES == 0)) && contracts_fresh; then
    ok "@kelas/contracts masih segar, pembangunan dilewati."

    return 0
  fi

  start="$(millis)"
  log="$LOG_DIR/packages.log"

  info "Membangun @kelas/contracts"

  if ! (cd "$ROOT" && pnpm --filter "@kelas/contracts" build >"$log" 2>&1); then
    fail "Pembangunan @kelas/contracts gagal, lihat $log"

    tail -n 25 "$log" >&2

    return 1
  fi

  ok "@kelas/contracts siap dalam $(duration_since "$start")."
}

assert_port_ready() {
  local port="$1"

  port_in_use "$port" || return 0

  if ((KILL_PORTS)); then
    free_port "$port" || return 1

    ok "Port $port dibebaskan."

    return 0
  fi

  fail "Port $port sudah dipakai proses lain. Ulangi dengan --kill untuk membebaskannya."

  return 1
}

belongs_to_repo() {
  local cwd

  cwd="$(readlink -f "/proc/$1/cwd" 2>/dev/null || true)"

  [[ -n "$cwd" && "$cwd" == "$ROOT"* ]]
}

reap_previous_run() {
  local pid reaped=0

  [[ -f "$PID_FILE" ]] || return 0

  while read -r pid; do
    [[ -n "$pid" ]] || continue

    service_alive "$pid" || continue

    belongs_to_repo "$pid" || continue

    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true

    reaped=$((reaped + 1))
  done <"$PID_FILE"

  if ((reaped > 0)); then
    warn "Menghentikan $reaped proses sisa dari sesi sebelumnya."

    sleep 1
  fi

  : >"$PID_FILE"
}

tagged_stream() {
  awk -v tag="$1" -v color="$2" -v reset="$C_RESET" -v dim="$C_DIM" '
    {
      sub(/\r$/, "")

      if (length($0) == 0) next

      printf "%s%s%s[%s]%s %s\n", color, dim, color, tag, reset, $0
      fflush()
    }
  '
}

start_service() {
  local name="$1"
  local color="$2"
  local dir="$3"
  local log_file="$LOG_DIR/$1.log"

  shift 3

  if ((LOG_TO_FILE)); then
    : >"$log_file"

    setsid bash -c 'cd "$1" && shift && exec "$@"' _ "$dir" "$@" \
      > >(tee "$log_file" | tagged_stream "$name" "$color") 2>&1 &
  else
    setsid bash -c 'cd "$1" && shift && exec "$@"' _ "$dir" "$@" \
      > >(tagged_stream "$name" "$color") 2>&1 &
  fi

  CHILD_PIDS+=("$!")

  printf '%s\n' "${CHILD_PIDS[-1]}" >>"$PID_FILE"
}

service_alive() { kill -0 "$1" 2>/dev/null; }

wait_for_api() {
  local start="$1"
  local pid="$2"

  while (($(millis) - start < API_READY_TIMEOUT * 1000)); do
    service_alive "$pid" || return 2

    http_ok "http://127.0.0.1:$API_PORT/health" && return 0

    sleep 0.25
  done

  return 1
}

wait_for_web() {
  local start="$1"
  local pid="$2"

  while (($(millis) - start < WEB_READY_TIMEOUT * 1000)); do
    service_alive "$pid" || return 2

    http_ok "http://localhost:$WEB_PORT/" && return 0

    sleep 0.3
  done

  return 1
}

stop_children() {
  local pid alive waited=0

  for pid in "${CHILD_PIDS[@]}"; do
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  done

  while ((waited < SHUTDOWN_GRACE_SECONDS * 10)); do
    alive=0

    for pid in "${CHILD_PIDS[@]}"; do
      service_alive "$pid" && alive=1
    done

    ((alive == 0)) && return 0

    sleep 0.1

    waited=$((waited + 1))
  done

  for pid in "${CHILD_PIDS[@]}"; do
    kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
  done
}

on_signal() {
  ((SHUTTING_DOWN)) && return 0

  SHUTTING_DOWN=1

  printf '\n'

  info "Menghentikan semua layanan"

  stop_children

  ok "Bersih."
}

on_exit() {
  local code=$?

  if ((SHUTTING_DOWN == 0)) && ((${#CHILD_PIDS[@]} > 0)); then
    stop_children
  fi

  exit "$code"
}

parse_args() {
  while (($# > 0)); do
    case "$1" in
      --api-only) RUN_WEB=0 ;;
      --web-only) RUN_API=0 ;;
      --force-packages) FORCE_PACKAGES=1 ;;
      --skip-packages) SKIP_PACKAGES=1 ;;
      --migrate) RUN_MIGRATE=1 ;;
      --kill) KILL_PORTS=1 ;;
      --no-log) LOG_TO_FILE=0 ;;
      --no-color) C_RESET='' C_DIM='' C_BOLD='' C_API='' C_WEB='' C_OK='' C_WARN='' C_ERR='' ;;
      -h | --help) usage; exit 0 ;;
      *) fail "Opsi tidak dikenal: $1"; usage; exit 2 ;;
    esac

    shift
  done
}

main() {
  local api_started=0 web_started=0 api_pid='' web_pid='' status=0

  parse_args "$@"

  mkdir -p "$LOG_DIR"

  trap on_signal INT TERM
  trap on_exit EXIT

  printf '%sKelas XI PPLG 1 — lingkungan pengembangan%s\n\n' "$C_BOLD" "$C_RESET"

  ensure_env_file

  ((KILL_PORTS)) && reap_previous_run

  assert_port_ready "$API_PORT" || exit 1

  if ((RUN_WEB)); then
    assert_port_ready "$WEB_PORT" || exit 1
  fi

  report_database

  if ((RUN_MIGRATE)); then
    run_migrations || exit 1
  fi

  ensure_packages || exit 1

  if ((RUN_API)); then
    api_started="$(millis)"

    start_service api "$C_API" "$API_DIR" pnpm dev

    api_pid="${CHILD_PIDS[-1]}"
  fi

  if ((RUN_WEB)); then
    web_started="$(millis)"

    start_service web "$C_WEB" "$WEB_DIR" pnpm dev

    web_pid="${CHILD_PIDS[-1]}"
  fi

  if ((RUN_API)); then
    wait_for_api "$api_started" "$api_pid" || status=$?

    ((status == 1)) && fail "API tidak siap dalam ${API_READY_TIMEOUT}s." && exit 1
    ((status == 2)) && fail "API berhenti sebelum siap." && exit 1

    ok "API siap di http://127.0.0.1:$API_PORT dalam $(duration_since "$api_started")."
  fi

  if ((RUN_WEB)); then
    status=0

    wait_for_web "$web_started" "$web_pid" || status=$?

    ((status == 1)) && fail "Web tidak siap dalam ${WEB_READY_TIMEOUT}s." && exit 1
    ((status == 2)) && fail "Web berhenti sebelum siap." && exit 1

    ok "Web siap di http://localhost:$WEB_PORT dalam $(duration_since "$web_started")."
  fi

  printf '\n%sCtrl+C untuk menghentikan keduanya.%s\n' "$C_DIM" "$C_RESET"

  if ((LOG_TO_FILE)); then
    printf '%sLog mentah tersimpan di .dev-logs/%s\n' "$C_DIM" "$C_RESET"
  fi

  printf '\n'

  wait -n || true

  ((SHUTTING_DOWN)) || { fail "Salah satu layanan berhenti tak terduga."; exit 1; }
}

main "$@"