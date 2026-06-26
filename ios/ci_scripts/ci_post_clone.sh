#!/bin/sh

set -e

export PATH="/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin:$PATH"

# Node est installé via brew, s'assurer que le PATH inclut brew
eval "$(/usr/local/bin/brew shellenv)"

cd $CI_PRIMARY_REPOSITORY_PATH

# Install Node dependencies
npm install

# Install pods
cd ios
pod install
