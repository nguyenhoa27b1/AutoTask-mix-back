/**
 * Email Configuration Diagnostic Tool
 * 
 * Checks if email system is properly configured and can send emails
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('\n📧 ============================================');
console.log('   EMAIL CONFIGURATION DIAGNOSTIC');
console.log('============================================\n');

// Step 1: Check environment variables
console.log('📝 Step 1: Checking Environment Variables...\n');

const USE_REAL_EMAIL = process.env.USE_REAL_EMAIL === 'true';
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

console.log('   USE_REAL_EMAIL:', USE_REAL_EMAIL);
console.log('   GMAIL_USER:', GMAIL_USER || '❌ NOT SET');
console.log('   GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? '✅ SET (length: ' + GMAIL_APP_PASSWORD.length + ')' : '❌ NOT SET');

if (!USE_REAL_EMAIL) {
  console.log('\n⚠️  WARNING: USE_REAL_EMAIL is set to false');
  console.log('   Emails will only be logged to console (mock mode)');
  console.log('   Set USE_REAL_EMAIL=true in .env to enable real emails\n');
  process.exit(0);
}

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.log('\n❌ ERROR: Gmail credentials not configured');
  console.log('   Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file\n');
  process.exit(1);
}

console.log('\n✅ Environment variables configured correctly\n');

// Step 2: Create transporter
console.log('📝 Step 2: Creating Email Transporter...\n');

let transporter;
try {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
  console.log('✅ Transporter created successfully\n');
} catch (error) {
  console.log('❌ Failed to create transporter:', error.message, '\n');
  process.exit(1);
}

// Step 3: Verify connection
console.log('📝 Step 3: Verifying SMTP Connection...\n');

transporter.verify()
  .then(() => {
    console.log('✅ SMTP connection verified successfully\n');
    
    // Step 4: Send test email
    console.log('📝 Step 4: Sending Test Email...\n');
    
    const testEmail = {
      from: GMAIL_USER,
      to: GMAIL_USER, // Send to self for testing
      subject: '[TEST] AutoTask Email System Verification',
      html: `
        <h2>✅ Email System Working!</h2>
        <p>This is a test email from your AutoTask application.</p>
        <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>From:</strong> ${GMAIL_USER}</p>
        <hr>
        <p style="color: green;">If you receive this email, your email notification system is configured correctly!</p>
      `
    };
    
    return transporter.sendMail(testEmail);
  })
  .then((info) => {
    console.log('✅ Test email sent successfully!\n');
    console.log('   To:', GMAIL_USER);
    console.log('   Subject: [TEST] AutoTask Email System Verification');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    
    console.log('\n📧 ============================================');
    console.log('   ✅ ALL CHECKS PASSED!');
    console.log('   Email system is working correctly.');
    console.log('   Check your inbox:', GMAIL_USER);
    console.log('============================================\n');
    
    process.exit(0);
  })
  .catch((error) => {
    console.log('❌ Email verification failed:\n');
    console.log('   Error Type:', error.code || 'Unknown');
    console.log('   Error Message:', error.message);
    
    console.log('\n🔍 Common Issues:\n');
    
    if (error.code === 'EAUTH') {
      console.log('   ❌ Authentication Failed');
      console.log('   - Check if GMAIL_APP_PASSWORD is correct');
      console.log('   - Generate new App Password at: https://myaccount.google.com/apppasswords');
      console.log('   - Make sure 2-Step Verification is enabled on your Google account');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log('   ❌ Connection Failed');
      console.log('   - Check your internet connection');
      console.log('   - Firewall may be blocking port 587 or 465');
      console.log('   - Check if Gmail SMTP is accessible from your network');
    } else if (error.responseCode === 535) {
      console.log('   ❌ Invalid Credentials');
      console.log('   - App Password may be incorrect or expired');
      console.log('   - Generate a new App Password');
    } else {
      console.log('   ❌ Unknown Error');
      console.log('   - Check server logs for more details');
      console.log('   - Verify Gmail settings and quotas');
    }
    
    console.log('\n📧 ============================================\n');
    
    process.exit(1);
  });
