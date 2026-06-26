#!/bin/sh

set -e

cd $CI_PRIMARY_REPOSITORY_PATH

# Install Node dependencies
npm install

# Install CocoaPods
cd ios
pod install
