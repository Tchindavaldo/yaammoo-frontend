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

# Lu ICI, avant le `cd ios` ci-dessous : depuis ios/, `require('./app.json')`
# ne resout plus (MODULE_NOT_FOUND). Utilise plus bas pour l'OTA.
RUNTIME_VERSION="$(node -p "require('./app.json').expo.runtimeVersion")"

echo "[ci] Versioning natif → version=$APP_VERSION build=$BUILD_NUMBER"

cd ios
# agvtool écrit dans le projet Xcode (VERSIONING_SYSTEM = apple-generic présent).
xcrun agvtool new-marketing-version "$APP_VERSION"
xcrun agvtool new-version -all "$BUILD_NUMBER"

# ─── runtimeVersion + canal OTA (expo-updates) ───────────────────────────────
# Même raison que ci-dessus : Xcode Cloud ne lit ni app.json ni eas.json. Les
# deux valeurs OTA sont donc posées ICI, à chaque build :
#
#   - EXUpdatesRuntimeVersion ← app.json `expo.runtimeVersion` (source unique).
#     Sans cela le binaire embarquerait un runtimeVersion périmé et ne recevrait
#     AUCUN update après un bump.
#   - expo-channel-name ← "production". Les builds EAS le posent via le `channel`
#     de leur profil (eas.json) ; Xcode Cloud, lui, ne le connaît pas. Le poser
#     ici évite de le figer dans le plist versionné, que le prebuild EAS écrase
#     à chaque build local.
PLIST="yaammoo/Supporting/Expo.plist"
/usr/libexec/PlistBuddy -c "Set :EXUpdatesRuntimeVersion $RUNTIME_VERSION" "$PLIST"
/usr/libexec/PlistBuddy -c "Delete :EXUpdatesRequestHeaders" "$PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :EXUpdatesRequestHeaders dict" "$PLIST"
/usr/libexec/PlistBuddy -c "Add :EXUpdatesRequestHeaders:expo-channel-name string production" "$PLIST"
echo "[ci] runtimeVersion OTA → $RUNTIME_VERSION (canal production)"

pod install
