#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DERIVED_DATA="${DRAGONMODE_DERIVED_DATA:-$PROJECT_ROOT/artifacts/simulator-derived-data}"
SCREENSHOT_DIR="$PROJECT_ROOT/artifacts/simulator"
BUNDLE_ID="app.dragonmode.mobile"

cd "$PROJECT_ROOT"
DRAGONMODE_DERIVED_DATA="$DERIVED_DATA" bash scripts/ios-build.sh

SIMULATOR_UDID="${DRAGONMODE_SIMULATOR_UDID:-$(xcrun simctl list devices available -j | node scripts/select-ios-simulator.mjs)}"
mkdir -p "$SCREENSHOT_DIR"
xcrun simctl boot "$SIMULATOR_UDID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$SIMULATOR_UDID" -b
xcrun simctl uninstall "$SIMULATOR_UDID" "$BUNDLE_ID" >/dev/null 2>&1 || true
xcrun simctl install "$SIMULATOR_UDID" "$DERIVED_DATA/Build/Products/Debug-iphonesimulator/DragonMode.app"
xcrun simctl launch "$SIMULATOR_UDID" "$BUNDLE_ID"
sleep 3
xcrun simctl io "$SIMULATOR_UDID" screenshot "$SCREENSHOT_DIR/01-fresh-install.png"
xcrun simctl terminate "$SIMULATOR_UDID" "$BUNDLE_ID"
xcrun simctl launch "$SIMULATOR_UDID" "$BUNDLE_ID"
sleep 2
xcrun simctl io "$SIMULATOR_UDID" screenshot "$SCREENSHOT_DIR/02-relaunch.png"

printf 'Fresh-install and relaunch certification passed on simulator %s.\n' "$SIMULATOR_UDID"
