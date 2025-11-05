#!/bin/sh
set -e

# Install NVM
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | sh

# Load NVM (assuming your shell rc config loads it)
# Change path if your nvm install directory differs
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Install and use latest LTS Node
nvm install --lts
nvm use --lts

echo "Node version:"
node -v

# Go to reader-ui, install deps, and build
cd reader-ui
npm install
npm run build

echo "Build complete."
