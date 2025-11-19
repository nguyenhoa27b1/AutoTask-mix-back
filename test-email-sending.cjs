/**
 * Test Email Sending
 * Test if Gmail SMTP is working correctly
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const USE_REAL_EMAIL = process.env.USE_REAL_EMAIL === 'true';
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║              Email System Test                             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('Configuration:');
console.log('  USE_REAL_EMAIL:', USE_REAL_EMAIL);
console.log('  GMAIL_USER:', GMAIL_USER);
console.log('  GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? '***' + GMAIL_APP_PASSWORD.slice(-4) : 'NOT SET');
console.log('');

if (!USE_REAL_EMAIL) {
  console.log('❌ USE_REAL_EMAIL is false - emails will only be logged to console');
  console.log('   Set USE_REAL_EMAIL=true in .env to send real emails\n');
  process.exit(1);
}

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.log('❌ Gmail credentials not configured!');
  console.log('   Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env\n');
  process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD
  }
});

// Test email
async function testEmail() {
  console.log('📧 Sending test email to:', GMAIL_USER);
  console.log('   (Sending to yourself for testing)\n');

  const testMessage = {
    from: `"TaskFlow Test" <${GMAIL_USER}>`,
    to: GMAIL_USER,
    subject: '[TEST] Email Notification System',
    html: `
      <h2>✅ Email System Test</h2>
      <p>This is a test email from TaskFlow Backend.</p>
      <p><strong>Date:</strong> ${new Date().toLocaleString('vi-VN')}</p>
      <p>If you received this email, your Gmail SMTP configuration is working correctly!</p>
      <hr>
      <p style="color: gray; font-size: 12px;">
        Sent from: ${GMAIL_USER}<br>
        Time: ${new Date().toISOString()}
      </p>
    `
  };

  try {
    console.log('⏳ Sending email...');
    const info = await transporter.sendMail(testMessage);
    
    console.log('\n✅ EMAIL SENT SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📬 Check your inbox:', GMAIL_USER);
    console.log('   The test email should arrive within 1-2 minutes.\n');
    
  } catch (error) {
    console.log('\n❌ EMAIL SENDING FAILED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Error:', error.message);
    console.log('Code:', error.code);
    console.log('Command:', error.command);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (error.code === 'EAUTH') {
      console.log('💡 AUTHENTICATION ERROR - Possible causes:');
      console.log('   1. Invalid Gmail App Password');
      console.log('   2. App Password has expired');
      console.log('   3. 2-Step Verification not enabled on Gmail account');
      console.log('');
      console.log('🔧 How to fix:');
      console.log('   1. Go to: https://myaccount.google.com/apppasswords');
      console.log('   2. Generate a NEW App Password');
      console.log('   3. Update GMAIL_APP_PASSWORD in .env file');
      console.log('   4. Restart the server\n');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log('💡 CONNECTION ERROR - Possible causes:');
      console.log('   1. No internet connection');
      console.log('   2. Firewall blocking SMTP port (587/465)');
      console.log('   3. Gmail SMTP servers temporarily unavailable\n');
    } else {
      console.log('💡 Check the error details above for more information.\n');
    }
    
    process.exit(1);
  }
}

// Run test
testEmail();
