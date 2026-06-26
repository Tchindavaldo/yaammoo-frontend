#!/bin/sh

set -e

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Install CocoaPods via Homebrew (évite le problème de permissions gem)
brew install cocoapods

cd $CI_PRIMARY_REPOSITORY_PATH

# Install Node dependencies
npm install

# Install pods
cd ios
pod install
