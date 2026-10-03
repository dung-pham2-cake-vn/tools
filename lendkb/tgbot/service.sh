#!/bin/bash
# Manage the launchd background service for the Telegram bridge.
#   ./service.sh install | uninstall | status | logs | restart
set -euo pipefail

LABEL="com.lendkb.tgbot"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"

cmd_install() {
  [ -f "$DIR/.env" ] || { echo "Chưa có $DIR/.env — copy từ .env.example rồi điền token."; exit 1; }

  # nvm puts node under a version-specific path, so resolve it now and bake the
  # absolute path into the plist. launchd starts with a minimal PATH and would
  # not find node otherwise.
  NODE="$(command -v node)"
  [ -x "$NODE" ] || { echo "Không tìm thấy node trong PATH."; exit 1; }

  mkdir -p "$DIR/logs" "$HOME/Library/LaunchAgents"

  cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>

  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>--env-file=$DIR/.env</string>
    <string>$DIR/src/index.js</string>
  </array>

  <key>WorkingDirectory</key>
  <string>$DIR</string>

  <key>RunAtLoad</key>
  <true/>

  <!-- Restart if the process dies (network blip, unhandled error). -->
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>

  <!-- Back off 10s between restarts so a crash loop does not spin the CPU. -->
  <key>ThrottleInterval</key>
  <integer>10</integer>

  <key>StandardOutPath</key>
  <string>$DIR/logs/stdout.log</string>
  <key>StandardErrorPath</key>
  <string>$DIR/logs/stderr.log</string>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$(dirname "$NODE"):/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key>
    <string>$HOME</string>
  </dict>
</dict>
</plist>
PLIST_EOF

  launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
  launchctl bootstrap "$DOMAIN" "$PLIST"
  launchctl enable "$DOMAIN/$LABEL"
  echo "Đã cài. node: $NODE"
  echo "Log: $DIR/logs/stdout.log"
}

cmd_uninstall() {
  launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Đã gỡ."
}

cmd_restart() {
  launchctl kickstart -k "$DOMAIN/$LABEL"
  echo "Đã restart."
}

cmd_status() {
  if launchctl print "$DOMAIN/$LABEL" >/dev/null 2>&1; then
    launchctl print "$DOMAIN/$LABEL" | grep -E '^\s+(state|pid|last exit code) ' || true
  else
    echo "Service chưa được cài."
  fi
}

cmd_logs() { tail -n 50 -f "$DIR/logs/stdout.log" "$DIR/logs/stderr.log"; }

case "${1:-}" in
  install)   cmd_install ;;
  uninstall) cmd_uninstall ;;
  restart)   cmd_restart ;;
  status)    cmd_status ;;
  logs)      cmd_logs ;;
  *) echo "Dùng: $0 {install|uninstall|restart|status|logs}"; exit 1 ;;
esac
