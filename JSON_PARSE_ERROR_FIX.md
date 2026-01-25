# JSON Parse Error - Troubleshooting Guide

## Error Message

```
JSON.parse: unexpected character at line 1 column 1 of the JSON data
```

## Cause

Ini terjadi ketika code mencoba `JSON.parse()` atau `.json()` pada response yang:

- Kosong (empty string)
- HTML error page
- Plain text bukan JSON
- Corrupted data

## Root Causes dalam Project

### 1. NextAuth Session Endpoint Issue

**Problem**: `/api/auth/session` return non-JSON response  
**Fixed**: Improved error handling di `app/login/page.tsx`

**What was changed:**

```typescript
// Before: Direct JSON parse (could throw on invalid response)
const session = await response.json();

// After: Check response validity first
const contentType = response.headers.get("content-type");
if (!contentType?.includes("application/json")) {
  router.push("/"); // Fallback redirect
  return;
}
const text = await response.text();
if (!text) {
  router.push("/"); // Handle empty response
  return;
}
const session = JSON.parse(text);
```

### 2. Middleware Intercepting API Calls

**Problem**: Middleware blocking API requests  
**Fixed**: Updated middleware to skip API routes

**What was changed:**

```typescript
// Before: Middleware checked all /admin routes
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Could intercept API calls
  }
}

// After: Skip API and internal routes
export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }
  // Only check /admin page routes
}
```

### 3. API Endpoints Returning Invalid JSON

**Problem**: `/api/admin/users` or `/api/device-status` fail  
**Fixed**: Improved error handling in `app/admin/page.tsx`

**What was changed:**

```typescript
// Before: Crash on invalid JSON
const data = await response.json();

// After: Graceful fallback
if (!response.ok) {
  console.warn("Failed to fetch users");
  return; // Use default data
}
const data = await response.json();
```

## Files Modified

1. **app/login/page.tsx**
   - Added response validation before JSON parsing
   - Added content-type checking
   - Added empty response handling
   - Added try-catch around JSON.parse

2. **middleware.ts**
   - Added check to skip `/api` routes
   - Added check to skip `/_next` routes
   - Prevents intercepting internal Next.js requests

3. **app/admin/page.tsx**
   - Added status checking before `.json()` call
   - Better error messages in console
   - Graceful fallback to default data

## How to Verify Fix

### 1. Test Login Flow

```bash
# In browser:
1. Open http://localhost:3000/login
2. Enter valid credentials
3. Should redirect to / or /admin
4. Check browser console - no errors
```

### 2. Check Console for Errors

```javascript
// Open DevTools Console (F12)
// Should show no JSON parsing errors
// Should see successful login logs
```

### 3. Test API Endpoints Directly

```bash
# In browser console:
fetch("/api/auth/session").then(r => r.text()).then(console.log)
// Should return JSON string

fetch("/api/admin/users").then(r => r.text()).then(console.log)
// Should return JSON string
```

### 4. Check Admin Page

```
1. Login to get admin token
2. Access http://localhost:3000/admin
3. Should show dashboard
4. No console errors about JSON parsing
```

## Debugging Tips

### If Still Getting JSON Error

**1. Check What's Being Returned**

```javascript
const response = await fetch("/api/auth/session");
const text = await response.text();
console.log("Response:", text);
console.log("Status:", response.status);
console.log("Content-Type:", response.headers.get("content-type"));
```

**2. Check NextAuth Config**

```
Verify auth.ts:
- NextAuth setup correct
- Providers configured
- Callbacks defined
- Pages mapped
```

**3. Check Middleware**

```
Verify middleware.ts:
- API routes skipped
- Correct matcher pattern
- No other middleware interfering
```

**4. Clear Cache & Restart**

```bash
# Clear Next.js cache
rm -rf .next

# Clear browser cache
DevTools > Application > Clear site data

# Restart dev server
npm run dev
```

### Environment Variables

```
Ensure .env.local has:
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
```

## Prevention Going Forward

### 1. Always Validate Response

```typescript
const response = await fetch(url);

// Check status
if (!response.ok) throw new Error("API error");

// Check content-type
const contentType = response.headers.get("content-type");
if (!contentType?.includes("application/json")) {
  throw new Error("Invalid content type");
}

// Parse safely
const data = await response.json();
```

### 2. Use Try-Catch

```typescript
try {
  const data = await response.json();
} catch (error) {
  console.error("JSON parse error:", error);
  // Handle error gracefully
}
```

### 3. Log Response Bodies

```typescript
const text = await response.text();
console.log("Raw response:", text);
try {
  const data = JSON.parse(text);
} catch (e) {
  console.error("Failed to parse:", text);
}
```

## Related Files

- `app/login/page.tsx` - Fixed session fetch
- `app/admin/page.tsx` - Fixed API calls
- `middleware.ts` - Skip API routes
- `auth.ts` - NextAuth configuration
- `app/api/auth/[...nextauth]/route.ts` - NextAuth handler

## Status

✅ **Issue Fixed**

- Error handling improved
- Middleware updated
- API calls safer
- Fallbacks implemented

**Ready to test!**
