#!/usr/bin/env bash
# Free the dev ports before starting, so a forgotten `npm run dev:all` (often left
# running in the background by an agent) doesn't block the restart.
#
# Only kills processes that (a) LISTEN on exactly these ports and (b) look like this
# project's dev servers (node/next/ts-node-dev). Anything else is reported, not killed —
# other apps do grab these ports.
set -uo pipefail

PORTS="${DEV_PORTS:-3002 3456}"
# extend with DEV_KILL_PATTERN if a dev process is named something else
PATTERN="${DEV_KILL_PATTERN:-node|next|ts-node|nodemon}"

for port in $PORTS; do
  pids=$(lsof -ti "tcp:${port}" -sTCP:LISTEN 2>/dev/null || true)
  [ -z "$pids" ] && continue

  targets=""
  for pid in $pids; do
    cmd=$(ps -p "$pid" -o comm= 2>/dev/null | xargs || echo '?')
    if echo "$cmd" | grep -Eqi "$PATTERN"; then
      echo "[kill-dev] port ${port} ← pid ${pid} (${cmd##*/})"
      targets="$targets $pid"
    else
      echo "[kill-dev] ⚠️  port ${port} đang bị pid ${pid} (${cmd##*/}) giữ — KHÔNG phải dev server, bỏ qua."
      echo "[kill-dev]    tự tắt nó, hoặc: DEV_KILL_PATTERN='${cmd##*/}' npm run kill-dev"
    fi
  done
  [ -z "$targets" ] && continue

  kill $targets 2>/dev/null || true
  # give it a moment to shut down cleanly, then force
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    sleep 0.3
    alive=$(ps -p ${targets// /,} -o pid= 2>/dev/null | xargs || true)
    [ -z "$alive" ] && break
  done
  alive=$(ps -p ${targets// /,} -o pid= 2>/dev/null | xargs || true)
  if [ -n "$alive" ]; then
    echo "[kill-dev] pid ${alive} vẫn sống → SIGKILL"
    kill -9 $alive 2>/dev/null || true
  fi
done

exit 0
