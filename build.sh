#!/bin/bash
set -e

echo "🔍 Starting Vercel build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma Client
echo "🔄 Generating Prisma Client..."
npx prisma generate

# Check database connection
echo "🔗 Testing database connection..."
if ! npx prisma db execute --stdin << 'EOF'
SELECT 1
EOF
then
  echo "⚠️  Warning: Database connection test failed, but continuing..."
fi

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma db push --skip-generate || {
  echo "⚠️  Database migration failed, trying with --accept-data-loss..."
  npx prisma db push --skip-generate --accept-data-loss
}

# Build Next.js
echo "🏗️ Building Next.js application..."
npm run build

echo "✅ Build process completed successfully!"
