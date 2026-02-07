#!/bin/bash

echo "🔍 Starting Vercel build process..."

# Exit on error but allow some commands to fail
set -e

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=prod

# Generate Prisma Client  
echo "🔄 Generating Prisma Client..."
npx prisma generate || echo "⚠️ Prisma generate had issues but continuing..."

# Build Next.js (skip migration on build for safety)
echo "🏗️ Building Next.js application..."
npm run build

echo "✅ Build completed!"
