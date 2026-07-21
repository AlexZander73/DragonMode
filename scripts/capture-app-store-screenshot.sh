#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="${1:-}"
if [[ -z "$LABEL" || ! "$LABEL" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  printf 'Usage: npm run screenshots:capture -- <lowercase-shot-name>\n' >&2
  exit 2
fi

SIMULATOR_UDID="${DRAGONMODE_SIMULATOR_UDID:-$(xcrun simctl list devices available -j | node "$PROJECT_ROOT/scripts/select-ios-simulator.mjs")}"
OUTPUT_DIR="$PROJECT_ROOT/artifacts/app-store/screenshots"
mkdir -p "$OUTPUT_DIR"
xcrun simctl bootstatus "$SIMULATOR_UDID" -b
xcrun simctl io "$SIMULATOR_UDID" screenshot "$OUTPUT_DIR/$LABEL.png"
printf 'Captured %s\n' "$OUTPUT_DIR/$LABEL.png"
