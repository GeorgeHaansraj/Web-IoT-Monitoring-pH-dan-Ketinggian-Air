#!/bin/bash

# Troubleshooting script for Vercel deployment

echo "🔍 Vercel Deployment Troubleshooting"
echo "=================================="

echo ""
echo "1️⃣  Checking environment variables..."
echo "DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "NEXTAUTH_URL: $NEXTAUTH_URL"
echo "NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:0:20}..."
echo "NODE_ENV: $NODE_ENV"

echo ""
echo "2️⃣  Checking Prisma installation..."
npx prisma version

echo ""
echo "3️⃣  Checking database connection..."
if npx prisma db execute --stdin << 'EOF'
SELECT version();
EOF
then
  echo "✅ Database connection OK"
else
  echo "❌ Database connection FAILED"
fi

echo ""
echo "4️⃣  Checking if Prisma Client is generated..."
if [ -d "node_modules/@prisma/client" ]; then
  echo "✅ Prisma Client found"
else
  echo "❌ Prisma Client NOT found - running npx prisma generate..."
  npx prisma generate
fi

echo ""
echo "5️⃣  Try build..."
npm run build
