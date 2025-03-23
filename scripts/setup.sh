#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up listen-fair-play project...${NC}"

# Check if nvm is installed
if ! command -v nvm &> /dev/null; then
  echo -e "${RED}nvm is not installed or not available in PATH${NC}"
  echo -e "${YELLOW}Please install nvm from https://github.com/nvm-sh/nvm${NC}"
  echo -e "Run the following command:"
  echo -e "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
  exit 1
fi

# Check if the specified version is installed or install it
NODE_VERSION=$(cat .nvmrc)
echo -e "${GREEN}Using Node.js version ${NODE_VERSION}${NC}"

if ! nvm ls $NODE_VERSION &> /dev/null; then
  echo -e "${YELLOW}Node.js ${NODE_VERSION} is not installed. Installing now...${NC}"
  nvm install $NODE_VERSION
fi

# Use the specified Node version
nvm use $NODE_VERSION

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
  echo -e "${YELLOW}pnpm is not installed. Installing now...${NC}"
  npm install -g pnpm
fi

# Check pnpm version
PNPM_VERSION=$(pnpm --version)
PNPM_MAJOR_VERSION=${PNPM_VERSION%%.*}

if [ "$PNPM_MAJOR_VERSION" -lt 8 ]; then
  echo -e "${YELLOW}Updating pnpm to latest version...${NC}"
  npm install -g pnpm@latest
fi

# Install dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
pnpm install

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${GREEN}You can now run:${NC}"
echo -e "${YELLOW}pnpm dev:processing${NC} - To run the podcast feed processing"
echo -e "${YELLOW}pnpm run dev${NC} - To run the client application" 