/**
 * Test script for email and Cloudinary integration
 * Run with: node test-email-cloudinary.cjs
 */

require('dotenv').config();
const { 
  sendTaskAssignedEmail, 
  sendDeadlineReminderEmail,
  sendTaskScoredEmail,
  sendTaskDeletedEmail,
  testEmailConfiguration 
} = require('./services/emailService.cjs');

const { 
  testCloudinaryConnection 
} = require('./services/cloudinaryService.cjs');

async function runTests() {
  console.log('🧪 Starting Email & Cloudinary Integration Tests...\n');
  
  // Test 1: Cloudinary Connection
  console.log('═══════════════════════════════════════');
  console.log('TEST 1: Cloudinary Connection');
  console.log('═══════════════════════════════════════');
  const cloudinaryResult = await testCloudinaryConnection();
  if (cloudinaryResult.success) {
    console.log('✅ Cloudinary connection successful!\n');
  } else {
    console.error('❌ Cloudinary connection failed:', cloudinaryResult.error, '\n');
  }
  
  // Test 2: Email Configuration
  console.log('═══════════════════════════════════════');
  console.log('TEST 2: Email Configuration');
  console.log('═══════════════════════════════════════');
  const emailResult = await testEmailConfiguration();
  if (emailResult.success) {
    console.log('✅ Email configuration successful!\n');
  } else {
    console.error('❌ Email configuration failed:', emailResult.error, '\n');
  }
  
  // Test 3: Task Assigned Email (with Cloudinary file links)
  console.log('═══════════════════════════════════════');
  console.log('TEST 3: Task Assigned Email');
  console.log('═══════════════════════════════════════');
  
  const mockTask = {
    id_task: 1,
    title: 'Complete Project Documentation',
    description: 'Write comprehensive documentation for the AutoTask project including user guide and API documentation.',
    priority: 2,
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    date_created: new Date().toISOString()
  };
  
  const mockFileUrls = [
    'https://res.cloudinary.com/demo/image/upload/sample.pdf',
    'https://res.cloudinary.com/demo/image/upload/documentation.docx'
  ];
  
  const assignedResult = await sendTaskAssignedEmail(
    process.env.SENDGRID_FROM_EMAIL, // Send to yourself for testing
    'Test User',
    mockTask,
    'Admin User',
    mockFileUrls
  );
  
  if (assignedResult.success) {
    console.log('✅ Task assigned email sent successfully!\n');
  } else {
    console.error('❌ Failed to send task assigned email:', assignedResult.error, '\n');
  }
  
  // Test 4: Deadline Reminder Email
  console.log('═══════════════════════════════════════');
  console.log('TEST 4: Deadline Reminder Email');
  console.log('═══════════════════════════════════════');
  
  const urgentTask = {
    ...mockTask,
    deadline: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString() // 18 hours from now
  };
  
  const reminderResult = await sendDeadlineReminderEmail(
    process.env.SENDGRID_FROM_EMAIL,
    'Test User',
    urgentTask,
    mockFileUrls
  );
  
  if (reminderResult.success) {
    console.log('✅ Deadline reminder email sent successfully!\n');
  } else {
    console.error('❌ Failed to send deadline reminder:', reminderResult.error, '\n');
  }
  
  // Test 5: Task Scored Email
  console.log('═══════════════════════════════════════');
  console.log('TEST 5: Task Scored Email');
  console.log('═══════════════════════════════════════');
  
  const completedTask = {
    ...mockTask,
    date_submit: new Date().toISOString()
  };
  
  const scoredResult = await sendTaskScoredEmail(
    process.env.SENDGRID_FROM_EMAIL,
    'Test User',
    completedTask,
    85,
    'Admin User'
  );
  
  if (scoredResult.success) {
    console.log('✅ Task scored email sent successfully!\n');
  } else {
    console.error('❌ Failed to send task scored email:', scoredResult.error, '\n');
  }
  
  // Test 6: Task Deleted Email
  console.log('═══════════════════════════════════════');
  console.log('TEST 6: Task Deleted Email');
  console.log('═══════════════════════════════════════');
  
  const deletedResult = await sendTaskDeletedEmail(
    process.env.SENDGRID_FROM_EMAIL,
    'Test User',
    mockTask,
    'Admin User'
  );
  
  if (deletedResult.success) {
    console.log('✅ Task deleted email sent successfully!\n');
  } else {
    console.error('❌ Failed to send task deleted email:', deletedResult.error, '\n');
  }
  
  // Summary
  console.log('═══════════════════════════════════════');
  console.log('TEST SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log('Check your email inbox:', process.env.SENDGRID_FROM_EMAIL);
  console.log('You should have received 5 test emails:');
  console.log('  1. Configuration test');
  console.log('  2. Task assigned notification');
  console.log('  3. Deadline reminder');
  console.log('  4. Task scored notification');
  console.log('  5. Task deleted notification');
  console.log('\n✅ All tests completed!');
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
