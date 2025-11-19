# 🔍 Email Notification Troubleshooting Guide

## ✅ Local Environment Status
**Email system is working perfectly on localhost!**
- SMTP connection: ✅ Verified
- Test email sent: ✅ Success
- Credentials: ✅ Valid

## ❌ Production (Render) Issues

### **Most Common Causes:**

### 1. **Environment Variables Not Set on Render** ⚠️
**Likelihood: 95%** - This is the MOST COMMON issue!

**Problem**: `.env` file is NOT deployed to Render (it's in `.gitignore`)

**Solution**:
1. Go to Render Dashboard → Your Service
2. Navigate to **"Environment"** tab
3. Add these variables:

```
USE_REAL_EMAIL=true
GMAIL_USER=nguyenhoa27b1@gmail.com
GMAIL_APP_PASSWORD=hsetttfgpkgcoehh
```

4. Click **"Save Changes"**
5. Render will automatically redeploy

**Verification**:
- Check Render logs for: `[EMAIL SENT]` messages
- If you see `(MOCK MODE)`, env vars are NOT set

---

### 2. **Frontend URL Hardcoded as localhost** 🔗
**Likelihood: 70%**

**Problem**: Email links point to `http://localhost:3000` instead of production URL

**Files affected**:
- `server-wrapper.cjs` lines 98, 110, 137, 154

**Current code**:
```javascript
<p>👉 <a href="http://localhost:3000">Link tới Task</a></p>
```

**Solution**: Use environment variable for frontend URL

---

### 3. **Render Firewall/Network Restrictions** 🔥
**Likelihood: 10%**

**Problem**: Render may block outbound SMTP connections

**Check**:
- Look for `ECONNECTION` or `ETIMEDOUT` errors in Render logs
- Gmail SMTP uses ports 587 (TLS) or 465 (SSL)

**Solution**:
- Contact Render support if ports are blocked
- Use alternative email service (SendGrid, Mailgun) if needed

---

### 4. **Google Security Blocking Render Server** 🛡️
**Likelihood: 5%**

**Problem**: Google may block login attempts from Render's IP address

**Check**:
- Check your Gmail for "Security Alert" emails
- Visit: https://myaccount.google.com/notifications

**Solution**:
- Regenerate App Password
- Add Render's IP to Google's allowed list

---

## 🔧 How to Diagnose on Render

### Step 1: Check Environment Variables
Add this temporary diagnostic endpoint to `server-wrapper.cjs`:

```javascript
app.get('/api/debug/email-config', (req, res) => {
  res.json({
    USE_REAL_EMAIL: process.env.USE_REAL_EMAIL,
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ? 'SET' : 'NOT SET',
  });
});
```

Then visit: `https://your-app.onrender.com/api/debug/email-config`

### Step 2: Check Render Logs
In Render Dashboard → Logs, search for:
- `[EMAIL SENT]` - Email sent successfully
- `[EMAIL SENT] (MOCK MODE)` - Environment vars NOT set
- `[EMAIL ERROR]` - Email sending failed

### Step 3: Test Email Sending from Production
Create a test endpoint:

```javascript
app.get('/api/debug/test-email', async (req, res) => {
  try {
    const testResult = await emailService.sendEmail(
      'nguyenhoa27b1@gmail.com',
      '[TEST] Production Email Test',
      '<h1>Test from Render Production</h1>'
    );
    res.json({ success: true, result: testResult });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});
```

---

## 📋 Quick Fix Checklist

### For Render Production:

- [ ] **Set environment variables on Render**
  - `USE_REAL_EMAIL=true`
  - `GMAIL_USER=nguyenhoa27b1@gmail.com`
  - `GMAIL_APP_PASSWORD=hsetttfgpkgcoehh`

- [ ] **Verify deployment**
  - Check Render logs for successful deployment
  - Look for environment variable loading messages

- [ ] **Test email functionality**
  - Create a task and assign to user
  - Check if assignee receives email
  - Submit task and check if admin receives email

- [ ] **Check Render logs**
  - Look for `[EMAIL SENT]` success messages
  - Look for `[EMAIL ERROR]` error messages
  - Verify no `(MOCK MODE)` indicators

- [ ] **Update frontend URLs** (optional but recommended)
  - Replace `http://localhost:3000` with production URL
  - Use environment variable: `process.env.FRONTEND_URL || 'http://localhost:3000'`

---

## 🎯 Expected Behavior After Fix

### When task is created:
```
[EMAIL SENT] =====================================
✅ Real email sent successfully!
To: assignee@gmail.com
Subject: [Giao Việc Mới] Task ...
Message ID: <...@gmail.com>
=====================================================
```

### When task is submitted:
```
[EMAIL SENT] =====================================
✅ Real email sent successfully!
To: nguyenhoa27b1@gmail.com
Subject: [Hoàn thành] Task ...
Message ID: <...@gmail.com>
=====================================================
```

---

## 💡 Prevention for Future

### Add to `server-wrapper.cjs` startup:
```javascript
// Email configuration check on startup
if (process.env.USE_REAL_EMAIL === 'true') {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ ERROR: Gmail credentials not configured!');
    console.error('   Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables');
  } else {
    console.log('✅ Email system enabled with real Gmail SMTP');
    console.log('   Using account:', process.env.GMAIL_USER);
  }
} else {
  console.log('⚠️  Email system in MOCK MODE (console only)');
}
```

This will immediately show if env vars are missing when server starts!

---

## 📞 Contact Information

If issues persist after setting environment variables:
1. Check Render logs for specific error messages
2. Verify Gmail App Password is still valid
3. Check Google account security settings
4. Consider using dedicated email service (SendGrid/Mailgun) for production

---

**Most Likely Solution**: Set the 3 environment variables on Render! 🎯
