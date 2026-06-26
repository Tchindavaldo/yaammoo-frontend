#!/bin/sh

set -e

# Fix PATH for Xcode Cloud
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
export PATH="/Users/local/Library/mise/shims:$PATH"

cd $CI_PRIMARY_REPOSITORY_PATH

# Install Node dependencies
npm install

# Install pods
cd ios
pod install
