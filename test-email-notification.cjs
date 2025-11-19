// Smoke test script for email notifications
const http = require('http');

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const options = {
      hostname: '127.0.0.1',
      port: 4000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runSmokeTest() {
  console.log('\n========================================');
  console.log('🧪 SMOKE TEST: Email Notification System');
  console.log('========================================\n');

  try {
    // Test 1: Create a new task (should trigger "Task Assigned" email)
    console.log('Test 1: Creating new task...');
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 2); // 2 days from now
    
    const newTask = await makeRequest('POST', '/api/tasks', {
      title: 'Email Notification Test Task',
      description: 'This is a smoke test to verify email notifications',
      assignee_id: 2, // User (user@example.com)
      assigner_id: 1, // Admin (admin@example.com)
      priority: 2,
      deadline: deadline.toISOString(),
      status: 'Pending'
    });

    console.log('✅ Task created:', newTask.title);
    console.log('   Task ID:', newTask.id_task);
    console.log('   Check console above for [EMAIL SENT] log\n');

    // Wait a moment for email to be logged
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n========================================');
    console.log('✅ Smoke test completed successfully!');
    console.log('========================================\n');
    console.log('Expected output: You should see [EMAIL SENT] logs above');
    console.log('Email type: "Task được giao mới" (New Task Assigned)');
    console.log('Recipient: user@example.com');
    console.log('\nNote: To test task submission, use the frontend or API');
    console.log('to submit the task with ID:', newTask.id_task);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nMake sure the backend server is running on port 4000');
    console.error('Run: node server-wrapper.cjs');
  }
}

runSmokeTest();
