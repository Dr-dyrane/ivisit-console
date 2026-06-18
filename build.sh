#!/bin/bash
set -e

echo "🔧 Installing dependencies with legacy peer deps..."
cd frontend
npm install --legacy-peer-deps

echo "🏗️  Building React app..."
npm run build

echo "✅ Build complete!"
