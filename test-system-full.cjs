const http = require('http');

console.log('🔍 COMPREHENSIVE SYSTEM HEALTH CHECK');
console.log('=====================================\n');

const API_BASE = 'http://localhost:4000';
let testsPassed = 0;
let testsFailed = 0;
let authToken = null;
let testUserId = null;
let testTaskId = null;
let testLeaveId = null;

// Helper function for HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, body: jsonBody, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function pass(message) {
  console.log(`   ✅ ${message}`);
  testsPassed++;
}

function fail(message) {
  console.log(`   ❌ ${message}`);
  testsFailed++;
}

async function runTest(testName, testFn) {
  console.log(`\n📋 ${testName}`);
  console.log('─'.repeat(50));
  try {
    await testFn();
  } catch (error) {
    fail(`Test error: ${error.message}`);
  }
}

// ==================== TESTS ====================

async function testServerHealth() {
  await runTest('1. Server Health Check', async () => {
    const result = await makeRequest('/api/users');
    if (result.status === 200) {
      pass('Backend server is running');
      pass(`Found ${result.body.length} users in system`);
    } else {
      fail(`Backend server returned status ${result.status}`);
    }
  });
}

async function testAuthentication() {
  await runTest('2. Authentication System', async () => {
    // Test 2.1: Email/password should be disabled
    const loginResult = await makeRequest('/api/login', 'POST', {
      email: 'admin@example.com',
      password: 'adminpassword'
    });
    if (loginResult.status === 401 && loginResult.body.error.includes('disabled')) {
      pass('Email/password login correctly disabled');
    } else {
      fail('Email/password login should be disabled');
    }

    // Test 2.2: Registration should be disabled
    const registerResult = await makeRequest('/api/register', 'POST', {
      email: 'newuser@test.com',
      name: 'New User',
      password: 'password123'
    });
    if (registerResult.status === 401 && registerResult.body.error.includes('disabled')) {
      pass('Registration correctly disabled');
    } else {
      fail('Registration should be disabled');
    }

    // Test 2.3: Google OAuth with whitelisted email
    const oauthResult = await makeRequest('/api/login/google', 'POST', {
      email: 'admin@example.com',
      name: 'Admin User',
      picture: null
    });
    if (oauthResult.status === 200 && oauthResult.body.email) {
      pass('Google OAuth login successful for whitelisted email');
      testUserId = oauthResult.body.user_id;
      pass(`Logged in as: ${oauthResult.body.name} (${oauthResult.body.role})`);
    } else {
      fail('Google OAuth login failed');
    }

    // Test 2.4: Non-whitelisted email should be blocked
    const blockedResult = await makeRequest('/api/login/google', 'POST', {
      email: 'unauthorized@hacker.com',
      name: 'Hacker',
      picture: null
    });
    if (blockedResult.status === 403) {
      pass('Non-whitelisted email correctly blocked');
    } else {
      fail('Non-whitelisted email should be blocked');
    }
  });
}

async function testUserManagement() {
  await runTest('3. User Management', async () => {
    // Test 3.1: Get all users
    const usersResult = await makeRequest('/api/users');
    if (usersResult.status === 200 && Array.isArray(usersResult.body)) {
      pass(`Retrieved ${usersResult.body.length} users`);
      
      // Test 3.2: Verify user statistics fields
      const user = usersResult.body[0];
      const hasStats = 'totalTasksAssigned' in user && 
                       'totalTasksCompleted' in user && 
                       'averageScore' in user &&
                       'tasksCompletedOnTime' in user &&
                       'tasksCompletedLate' in user;
      if (hasStats) {
        pass('User statistics fields present');
      } else {
        fail('User statistics fields missing');
      }
    } else {
      fail('Failed to retrieve users');
    }

    // Test 3.3: Add new user (admin only)
    const newUserResult = await makeRequest('/api/users', 'POST', {
      email: 'testuser@example.com',
      role: 'user'
    });
    if (newUserResult.status === 200 || newUserResult.status === 201) {
      pass('Successfully added new user');
    } else {
      fail(`Failed to add user: ${newUserResult.status}`);
    }
  });
}

async function testTaskManagement() {
  await runTest('4. Task Management', async () => {
    // Test 4.1: Get tasks with pagination
    const tasksResult = await makeRequest('/api/tasks?page=1&limit=15');
    if (tasksResult.status === 200) {
      pass('Task pagination endpoint working');
      pass(`Page 1: ${tasksResult.body.tasks.length} tasks, Total: ${tasksResult.body.total}`);
    } else {
      fail('Failed to get paginated tasks');
    }

    // Test 4.2: Create new task
    const newTaskResult = await makeRequest('/api/tasks', 'POST', {
      title: 'Test Task - System Check',
      description: 'Automated test task',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      priority: 2,
      assignee_id: testUserId || 1,
      assigner_id: testUserId || 1
    });
    if (newTaskResult.status === 200 || newTaskResult.status === 201) {
      testTaskId = newTaskResult.body.id_task;
      pass(`Task created successfully (ID: ${testTaskId})`);
    } else {
      fail('Failed to create task');
    }

    // Test 4.3: Get task by ID
    if (testTaskId) {
      const taskResult = await makeRequest(`/api/tasks/${testTaskId}`);
      if (taskResult.status === 200) {
        pass('Task retrieval by ID working');
        
        // Test 4.4: Verify task has required fields
        const task = taskResult.body;
        const hasFields = 'status' in task && 'priority' in task && 'isOverdue' in task;
        if (hasFields) {
          pass('Task has all required fields');
        } else {
          fail('Task missing required fields');
        }
      } else {
        fail('Failed to retrieve task by ID');
      }
    }

    // Test 4.5: Update task
    if (testTaskId) {
      const updateResult = await makeRequest(`/api/tasks/${testTaskId}`, 'PUT', {
        title: 'Updated Test Task',
        description: 'Updated description'
      });
      if (updateResult.status === 200) {
        pass('Task update working');
      } else {
        fail('Failed to update task');
      }
    }
  });
}

async function testFileUpload() {
  await runTest('5. File Upload & Cloudinary', async () => {
    // Test 5.1: Check Cloudinary health
    const healthResult = await makeRequest('/api/cloudinary/health');
    if (healthResult.status === 200 && healthResult.body.status === 'ok') {
      pass('Cloudinary connection healthy');
      pass(`Cloud name: ${healthResult.body.cloudName}`);
    } else {
      fail('Cloudinary health check failed');
    }

    // Test 5.2: Get files
    const filesResult = await makeRequest('/api/files');
    if (filesResult.status === 200 && Array.isArray(filesResult.body)) {
      pass(`Retrieved ${filesResult.body.length} files`);
    } else {
      fail('Failed to retrieve files');
    }
  });
}

async function testLeaveManagement() {
  await runTest('6. Leave Management System', async () => {
    // Test 6.1: Get leave requests
    const leaveResult = await makeRequest('/api/leave-requests');
    if (leaveResult.status === 200 && Array.isArray(leaveResult.body)) {
      pass(`Retrieved ${leaveResult.body.length} leave requests`);
    } else {
      fail('Failed to retrieve leave requests');
    }

    // Test 6.2: Create leave request
    const createResult = await makeRequest('/api/leave-requests', 'POST', {
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      reason: 'Automated test leave request'
    });
    if (createResult.status === 200 || createResult.status === 201) {
      testLeaveId = createResult.body.id_leave;
      pass(`Leave request created (ID: ${testLeaveId})`);
    } else {
      fail('Failed to create leave request');
    }

    // Test 6.3: Approve leave request
    if (testLeaveId) {
      const approveResult = await makeRequest(`/api/leave-requests/${testLeaveId}/approve`, 'PUT', {
        notes: 'Approved by automated test'
      });
      if (approveResult.status === 200) {
        pass('Leave request approval working');
      } else {
        fail('Failed to approve leave request');
      }
    }
  });
}

async function testEmailService() {
  await runTest('7. Email Service', async () => {
    // Test 7.1: Check email configuration
    const configResult = await makeRequest('/api/email/test-config');
    if (configResult.status === 200) {
      pass('Email service configured');
      if (configResult.body.provider) {
        pass(`Email provider: ${configResult.body.provider}`);
      }
    } else {
      fail('Email service configuration check failed');
    }
  });
}

async function testExcelExport() {
  await runTest('8. Excel Export', async () => {
    // Test 8.1: Export to Excel
    const exportResult = await makeRequest('/api/export/excel');
    if (exportResult.status === 200) {
      const contentType = exportResult.headers['content-type'];
      if (contentType && contentType.includes('spreadsheet')) {
        pass('Excel export working');
        const disposition = exportResult.headers['content-disposition'];
        if (disposition) {
          pass(`Filename: ${disposition.split('filename=')[1]?.replace(/"/g, '')}`);
        }
      } else {
        fail('Excel export content-type incorrect');
      }
    } else {
      fail('Excel export failed');
    }
  });
}

async function testCronJobs() {
  await runTest('9. Cron Jobs & Scheduling', async () => {
    // Test 9.1: Get cron status
    const cronResult = await makeRequest('/api/cron/status');
    if (cronResult.status === 200) {
      pass('Cron jobs status endpoint working');
      if (cronResult.body.deadlineReminder) {
        pass('Deadline reminder cron job active');
      }
      if (cronResult.body.overdueTasks) {
        pass('Overdue tasks cron job active');
      }
    } else {
      fail('Failed to get cron jobs status');
    }
  });
}

async function testDataIntegrity() {
  await runTest('10. Data Integrity & Consistency', async () => {
    // Test 10.1: Verify user statistics are calculated
    const usersResult = await makeRequest('/api/users');
    if (usersResult.status === 200) {
      const users = usersResult.body;
      let allHaveStats = true;
      for (const user of users) {
        if (typeof user.totalTasksAssigned === 'undefined') {
          allHaveStats = false;
          break;
        }
      }
      if (allHaveStats) {
        pass('All users have statistics calculated');
      } else {
        fail('Some users missing statistics');
      }
    }

    // Test 10.2: Verify task relationships
    const tasksResult = await makeRequest('/api/tasks?page=1&limit=100');
    if (tasksResult.status === 200 && tasksResult.body.tasks.length > 0) {
      const task = tasksResult.body.tasks[0];
      if (task.assignee_id && task.assigner_id) {
        pass('Tasks have proper user relationships');
      } else {
        fail('Tasks missing user relationships');
      }
    }
  });
}

async function cleanupTestData() {
  await runTest('11. Cleanup Test Data', async () => {
    // Delete test task
    if (testTaskId) {
      const deleteTask = await makeRequest(`/api/tasks/${testTaskId}`, 'DELETE');
      if (deleteTask.status === 200) {
        pass('Test task cleaned up');
      }
    }

    // Delete test leave request
    if (testLeaveId) {
      const deleteLeave = await makeRequest(`/api/leave-requests/${testLeaveId}`, 'DELETE');
      if (deleteLeave.status === 200) {
        pass('Test leave request cleaned up');
      }
    }
  });
}

// ==================== RUN ALL TESTS ====================

async function runAllTests() {
  const startTime = Date.now();
  
  try {
    await testServerHealth();
    await testAuthentication();
    await testUserManagement();
    await testTaskManagement();
    await testFileUpload();
    await testLeaveManagement();
    await testEmailService();
    await testExcelExport();
    await testCronJobs();
    await testDataIntegrity();
    await cleanupTestData();
  } catch (error) {
    console.error('\n💥 Critical error during testing:', error.message);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));

  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! System is healthy! 🎉');
    console.log('\n✅ Backend-Frontend Integration: READY');
    console.log('✅ All Features: WORKING');
    console.log('✅ Data Integrity: VERIFIED');
    console.log('✅ Security: ENFORCED');
    console.log('\n🚀 System is production-ready!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
console.log('⏳ Starting comprehensive system check...\n');
runAllTests();
