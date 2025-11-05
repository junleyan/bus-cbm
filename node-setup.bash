#!/usr/bin/env bash
set -euo pipefail

# Install NVM
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi

# Install and use latest LTS Node
nvm install --lts
nvm use --lts

echo "Node version:"
node -v

# Go to reader-ui, install deps and build
cd reader-ui
npm install
npm run build

echo "Build complete."
