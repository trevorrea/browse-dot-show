#!/usr/bin/env node

/**
 * This script checks if pnpm is installed and outputs instructions if it's not.
 */

const { execSync } = require('child_process');

try {
  const pnpmVersion = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
  console.log(`✅ pnpm is installed (version ${pnpmVersion})`);
  
  // Check the major version
  const majorVersion = parseInt(pnpmVersion.split('.')[0], 10);
  if (majorVersion < 8) {
    console.warn(`⚠️  Warning: You're using pnpm v${pnpmVersion}, but v8.0.0 or later is required.`);
    console.log('You can update pnpm with: npm install -g pnpm@latest');
    process.exit(1);
  }
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ pnpm is not installed or not available in PATH');
  console.log('\nPlease install pnpm to use this project:');
  console.log('\nUsing npm:');
  console.log('  npm install -g pnpm@latest');
  console.log('\nUsing Homebrew (macOS):');
  console.log('  brew install pnpm');
  console.log('\nFor more installation options, visit: https://pnpm.io/installation\n');
  process.exit(1);
} 