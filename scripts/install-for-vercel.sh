#!/bin/bash
# Install script for Vercel that handles optional dependencies gracefully

set -e

echo "Installing dependencies..."
# Install all dependencies first (canvas will fail but npm should continue)
npm install --legacy-peer-deps || {
  echo "⚠️  Some dependencies failed to install (likely canvas) - checking if critical deps are present..."
  # Check if critical dependencies are installed
  if [ ! -d "node_modules/sharp" ]; then
    echo "❌ Critical dependency 'sharp' is missing!"
    exit 1
  fi
  echo "✅ Critical dependencies are present, continuing..."
}

echo "✅ Installation complete"

