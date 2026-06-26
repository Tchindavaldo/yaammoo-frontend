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

cd ios
pod install
