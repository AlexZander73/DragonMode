#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DERIVED_DATA="${DRAGONMODE_DERIVED_DATA:-$PROJECT_ROOT/artifacts/ios-derived-data}"

cd "$PROJECT_ROOT"
if [[ ! -f mobile-dist/index.html ]]; then
  npm run mobile:build
fi
./node_modules/.bin/cap sync ios
xcodebuild \
  -project ios/App/App.xcodeproj \
  -scheme DragonMode \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$DERIVED_DATA" \
  CODE_SIGNING_ALLOWED=NO \
  build

printf 'Unsigned simulator app: %s\n' "$DERIVED_DATA/Build/Products/Debug-iphonesimulator/DragonMode.app"
