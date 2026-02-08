@echo off
npx tsx test-auth.ts > test-results.log 2>&1
type test-results.log
