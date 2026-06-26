#!/bin/sh

set -e

# Install Homebrew if needed
if ! command -v brew &> /dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Node via nvm or brew
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
else
  brew install node
fi

# Install CocoaPods
gem install cocoapods

cd $CI_PRIMARY_REPOSITORY_PATH

# Install Node dependencies
npm install

# Install pods
cd ios
pod install
