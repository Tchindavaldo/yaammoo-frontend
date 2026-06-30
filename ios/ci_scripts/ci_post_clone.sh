#!/bin/sh

set -e

# Init Homebrew
eval "$(/usr/local/bin/brew shellenv 2>/dev/null || /opt/homebrew/bin/brew shellenv)"

# Install Node if missing
if ! command -v node >/dev/null 2>&1; then
  brew install node
fi

# Install CocoaPods if missing
if ! command -v pod >/dev/null 2>&1; then
  brew install cocoapods
fi

cd "$CI_PRIMARY_REPOSITORY_PATH"

npm install

# ─── Versioning automatique (Xcode Cloud) ────────────────────────────────────
# Xcode Cloud build le projet natif et ne lit PAS app.json. On synchronise donc
# les versions natives ICI, avant le build :
#   - version marketing (CFBundleShortVersionString)  ← app.json (source unique)
#   - build number       (CFBundleVersion)            ← $CI_BUILD_NUMBER (unique,
#                                                         toujours croissant)
# Cela évite les rejets App Store 90186 / 90062 (version déjà utilisée).
APP_VERSION="$(node -p "require('./app.json').expo.version")"
BUILD_NUMBER="${CI_BUILD_NUMBER:-1}"

echo "[ci] Versioning natif → version=$APP_VERSION build=$BUILD_NUMBER"

cd ios
# agvtool écrit dans le projet Xcode (VERSIONING_SYSTEM = apple-generic présent).
xcrun agvtool new-marketing-version "$APP_VERSION"
xcrun agvtool new-version -all "$BUILD_NUMBER"

pod install
