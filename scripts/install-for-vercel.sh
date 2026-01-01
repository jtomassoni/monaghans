#!/bin/bash
# Install script for Vercel that handles optional dependencies gracefully

set -e

echo "Installing dependencies (excluding optional canvas)..."
npm install --legacy-peer-deps --ignore-scripts

echo "Attempting to install canvas (optional, will continue if it fails)..."
npm install --legacy-peer-deps canvas 2>&1 || echo "⚠️  Canvas installation failed (expected in Vercel) - continuing..."

echo "✅ Installation complete"

