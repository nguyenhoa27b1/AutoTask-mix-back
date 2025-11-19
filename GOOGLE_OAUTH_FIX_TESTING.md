# Google OAuth White Screen Fix - Testing Guide

## Problem Fixed
**Issue:** White screen after successful Google OAuth login
**Root Cause:** Frontend `api.loginWithGoogle()` expected `User` object but backend returned `{ user, token }`
**Impact:** Token was not saved, causing "Not authenticated" errors on subsequent API calls

## Changes Made

### 1. Backend (server-wrapper.cjs) ✅
- Already returns correct format: `{ user, token }` from `/api/login/google`
- No changes needed

### 2. Frontend (services/api.ts) ✅
```typescript
// BEFORE (Bug):
const user = await fetchFromBackend<User>('/login/google', ...);
loggedInUser = user;
return user;

// AFTER (Fixed):
const resp = await fetchFromBackend<{ user: User; token: string }>('/login/google', ...);
loggedInUser = resp.user;
authToken = resp.token || null;  // ← TOKEN NOW SAVED!
return resp.user;
```

### 3. Comprehensive Logging Added

**Login.tsx - handleCredentialResponse():**
```
🔵 [GOOGLE LOGIN] Credential response received
🔵 Response object keys
🔵 Has credential
⏳ Calling onGoogleLogin
✅/❌ Result
🏁 Process completed
```

**App.tsx - handleGoogleLogin():**
```
🟢 [APP] handleGoogleLogin called
🟢 Credential response
🟢 Decoded JWT profile
🟢 Profile valid, calling attemptLogin
```

**services/api.ts - loginWithGoogle():**
```
🔵 [API] Sending profile to backend
🔵 Backend response
🔵 User
🔵 Token present/MISSING
✅ Success! User + Token stored
```

## Testing Instructions

### Prerequisites
1. Restart backend server to load latest code
2. Clear browser cache and reload frontend
3. Open Browser DevTools Console (F12)

### Test Case 1: Gmail Account Login (nguyenhoa27b1@gmail.com)
**Expected:** Auto-admin access + whitelisted

**Steps:**
1. Navigate to login page
2. Click "Sign in with Google" button
3. Select `nguyenhoa27b1@gmail.com` account

**Console Logs to Check:**
```
🔵 [GOOGLE LOGIN] Credential response received
🟢 [APP] handleGoogleLogin called
🟢 [APP] Decoded JWT profile: { email: "nguyenhoa27b1@gmail.com", ... }
🔵 [API] loginWithGoogle - Sending profile to backend
🔵 [API] loginWithGoogle - Backend response: { user: {...}, token: "token-..." }
🔵 [API] loginWithGoogle - Token: present ✓
✅ [API] loginWithGoogle - Success! User: nguyenhoa27b1@gmail.com Token stored: true
👤 [APP] User received from api.login
✓ [APP] User is valid, setting current user
📊 [APP] Fetching app data
✅ [APP] Login complete - returning true
```

**Backend Console:**
```
🔑 [ADMIN ACCESS] Auto-granted admin role and whitelisted: nguyenhoa27b1@gmail.com
```

**Expected Result:**
- ✅ Login successful
- ✅ Redirect to Dashboard
- ✅ User role: Admin
- ✅ Can create tasks without "Not authenticated" error

### Test Case 2: Non-Whitelisted Gmail Account
**Expected:** Blocked with error message

**Steps:**
1. Login with different Gmail account (not whitelisted)

**Console Logs:**
```
🚫 [WHITELIST] Gmail user not whitelisted: other@gmail.com
❌ [API] loginWithGoogle - Error: Gmail account not authorized
💥 [GOOGLE LOGIN] Exception caught
```

**Expected Result:**
- ❌ Login blocked
- Error message: "Gmail account not authorized. Please contact admin to be added to whitelist."

### Test Case 3: Non-Gmail Account (e.g., @example.com)
**Expected:** Auto-create user

**Console Logs:**
```
✅ [API] loginWithGoogle - Success! User: user@company.com Token stored: true
```

**Expected Result:**
- ✅ Login successful
- User auto-created with USER role

### Test Case 4: Task Creation After Login
**Purpose:** Verify token authentication works

**Steps:**
1. Login via Google (Test Case 1)
2. Navigate to Dashboard
3. Click "Create Task" button
4. Fill in task details
5. Assign to a user from same domain
6. Click Save

**Expected Result:**
- ✅ Task created successfully
- ✅ NO "Not authenticated" error
- ✅ Email notification sent (if USE_REAL_EMAIL=true)

**Console Logs:**
```
[API] -> POST http://localhost:4000/api/tasks
[API] Headers include: Authorization: Bearer token-...
[API] <- 200 (task created)
```

## Common Issues & Solutions

### Issue: "Token: MISSING" in console
**Cause:** Backend not returning token
**Fix:** Restart backend server with latest code

### Issue: Still getting "Not authenticated"
**Cause:** Old token in memory, frontend not sending Authorization header
**Fix:** 
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear localStorage
3. Re-login

### Issue: White screen with no console logs
**Cause:** JavaScript error before logging
**Fix:** Check Browser Console for red error messages

### Issue: "Cross-domain interaction denied"
**Cause:** Trying to assign task to user from different email domain
**Fix:** Assign tasks only to users with same email domain (@gmail.com → @gmail.com, @example.com → @example.com)

## Verification Checklist

After testing, verify:
- [ ] Google login works without white screen
- [ ] Token is saved and shown in console logs
- [ ] Dashboard loads after login
- [ ] Can create tasks without authentication errors
- [ ] Can submit tasks
- [ ] Can view user list (filtered by domain)
- [ ] Can view task list (filtered by domain)
- [ ] Email notifications sent (if configured)

## Rollback Plan (if issues persist)

If white screen still occurs:
1. Check browser console for specific error
2. Check backend server logs
3. Verify `.env` file has correct settings
4. Try with different browser
5. Contact developer with console logs

## Code Commit

**Commit:** `a6e7829`
**Message:** "Fix: Google OAuth white screen - proper token handling and comprehensive logging"
**Files changed:**
- services/api.ts (token handling fix)
- components/Login.tsx (logging)
- App.tsx (logging)

## Additional Notes

- All logging is prefixed with emojis for easy filtering
- Logging is comprehensive but not excessive
- Production builds may want to reduce/remove console.log statements
- Token is stored in memory only (not localStorage) for security
