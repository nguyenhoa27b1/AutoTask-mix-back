/**
 * Test Scoring Logic Fix
 * 
 * Scenario:
 * 1. Admin (nguyenhoa27b1@gmail.com) logs in
 * 2. Admin creates a task and assigns it to a regular User (user@example.com)
 * 3. Regular User logs in and submits the task (on time = +1 point)
 * 4. Verify: User score increases by +1, Admin score remains 0
 * 
 * Expected behavior:
 * - Only the ASSIGNEE (user@example.com) should receive points
 * - The CREATOR/ADMIN (nguyenhoa27b1@gmail.com) should NOT receive points for this task
 */

const http = require('http');

const BASE_URL = 'http://localhost:4000';

// Helper function to make HTTP requests with file upload support
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    // Check if this is a file upload request
    const isFileUpload = data && data._isFileUpload;
    let boundary, body;
    
    if (isFileUpload) {
      // Create multipart form data
      boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const parts = [];
      
      // Add file part
      parts.push(`--${boundary}\r\n`);
      parts.push(`Content-Disposition: form-data; name="file"; filename="test-submission.txt"\r\n`);
      parts.push(`Content-Type: text/plain\r\n\r\n`);
      parts.push(`This is a test submission file for scoring logic verification.\r\n`);
      parts.push(`--${boundary}--\r\n`);
      
      body = parts.join('');
    }
    
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: isFileUpload ? {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body),
      } : {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        try {
          const parsed = responseBody ? JSON.parse(responseBody) : {};
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', reject);
    
    if (isFileUpload) {
      req.write(body);
    } else if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTest() {
  console.log('🧪 Starting Scoring Logic Fix Test\n');

  try {
    // Step 1: Admin logs in
    console.log('📝 Step 1: Admin login...');
    const adminLogin = await makeRequest('POST', '/api/login/google', {
      email: 'nguyenhoa27b1@gmail.com',
      name: 'Nguyen Hoa',
      picture: 'https://example.com/pic.jpg',
    });

    if (adminLogin.status !== 200 || !adminLogin.data.token) {
      console.error('❌ Admin login failed:', adminLogin);
      return;
    }

    const adminToken = adminLogin.data.token;
    const adminUser = adminLogin.data.user;
    console.log(`✅ Admin logged in: ${adminUser.email} (role=${adminUser.role}, id=${adminUser.user_id})\n`);

    // Step 2: Get all users to find the regular user
    console.log('📝 Step 2: Fetching all users...');
    const usersResponse = await makeRequest('GET', '/api/users', null, adminToken);
    
    if (usersResponse.status !== 200) {
      console.error('❌ Failed to fetch users:', usersResponse);
      return;
    }

    let regularUser = usersResponse.data.find(u => u.email === 'testuser@gmail.com');
    if (!regularUser) {
      console.log('⚠️  Regular user not found, creating one...');
      
      // Create a regular user in the same domain as admin (gmail.com)
      const createUserResponse = await makeRequest('POST', '/api/users', {
        email: 'testuser@gmail.com',
        password: 'password123',
        name: 'Test User',
        role: 'user',
      }, adminToken);
      
      if (createUserResponse.status !== 200) {
        console.error('❌ Failed to create user:', createUserResponse);
        return;
      }
      
      regularUser = createUserResponse.data;
      console.log(`✅ Created regular user: ${regularUser.email} (id=${regularUser.user_id})`);
    } else {
      console.log(`✅ Found existing regular user: ${regularUser.email} (id=${regularUser.user_id})`);
    }
    console.log();

    // Step 3: Get initial tasks and calculate initial scores
    console.log('📝 Step 3: Calculating initial scores...');
    const tasksResponse = await makeRequest('GET', '/api/tasks', null, adminToken);
    
    if (tasksResponse.status !== 200) {
      console.error('❌ Failed to fetch tasks:', tasksResponse);
      return;
    }

    const initialTasks = tasksResponse.data;
    
    // Calculate Admin's initial score (only tasks where Admin is assignee)
    const adminInitialScore = initialTasks
      .filter(t => t.assignee_id === adminUser.user_id && t.status === 'Completed' && typeof t.score === 'number')
      .reduce((sum, t) => sum + t.score, 0);
    
    // Calculate User's initial score (only tasks where User is assignee)
    const userInitialScore = initialTasks
      .filter(t => t.assignee_id === regularUser.user_id && t.status === 'Completed' && typeof t.score === 'number')
      .reduce((sum, t) => sum + t.score, 0);

    console.log(`   Admin initial score: ${adminInitialScore}`);
    console.log(`   User initial score: ${userInitialScore}\n`);

    // Step 4: Admin creates a task and assigns it to the regular user
    console.log('📝 Step 4: Admin creates task for User (due tomorrow, so submission will be on time = +1 point)...');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const taskData = {
      title: 'Scoring Test Task',
      description: 'This task tests the scoring logic fix',
      assignee_id: regularUser.user_id,
      priority: 2,
      deadline: tomorrow.toISOString(),
    };

    const createTaskResponse = await makeRequest('POST', '/api/tasks', taskData, adminToken);
    
    if (createTaskResponse.status !== 200) {
      console.error('❌ Failed to create task:', createTaskResponse);
      return;
    }

    const createdTask = createTaskResponse.data;
    console.log(`✅ Task created: id=${createdTask.id_task}, assignee_id=${createdTask.assignee_id}, assigner_id=${createdTask.assigner_id}\n`);

    // Step 5: Regular user logs in
    console.log('📝 Step 5: Regular user login...');
    const userLogin = await makeRequest('POST', '/api/login/google', {
      email: 'testuser@gmail.com',
      name: 'Test User',
      picture: 'https://example.com/test.jpg',
    });

    if (userLogin.status !== 200 || !userLogin.data.token) {
      console.error('❌ User login failed:', userLogin);
      return;
    }

    const userToken = userLogin.data.token;
    console.log(`✅ User logged in: ${regularUser.email}\n`);

    // Step 6: User submits the task (on time)
    console.log('📝 Step 6: User submitting task (on time)...');
    
    const submitResponse = await makeRequest('POST', `/api/tasks/${createdTask.id_task}/submit`, { _isFileUpload: true }, userToken);
    
    if (submitResponse.status !== 200) {
      console.error('❌ Failed to submit task:', submitResponse);
      return;
    }

    const submittedTask = submitResponse.data;
    console.log(`✅ Task submitted:`);
    console.log(`   Status: ${submittedTask.status}`);
    console.log(`   Score: ${submittedTask.score}`);
    console.log(`   Expected score: +1 (on time)\n`);

    // Step 7: Calculate final scores
    console.log('📝 Step 7: Calculating final scores...');
    
    const finalTasksResponse = await makeRequest('GET', '/api/tasks', null, adminToken);
    if (finalTasksResponse.status !== 200) {
      console.error('❌ Failed to fetch final tasks:', finalTasksResponse);
      return;
    }

    const finalTasks = finalTasksResponse.data;
    
    // Calculate Admin's final score (only tasks where Admin is assignee)
    const adminFinalScore = finalTasks
      .filter(t => t.assignee_id === adminUser.user_id && t.status === 'Completed' && typeof t.score === 'number')
      .reduce((sum, t) => sum + t.score, 0);
    
    // Calculate User's final score (only tasks where User is assignee)
    const userFinalScore = finalTasks
      .filter(t => t.assignee_id === regularUser.user_id && t.status === 'Completed' && typeof t.score === 'number')
      .reduce((sum, t) => sum + t.score, 0);

    console.log(`   Admin final score: ${adminFinalScore}`);
    console.log(`   User final score: ${userFinalScore}\n`);

    // Step 8: Verify results
    console.log('📝 Step 8: Verifying results...\n');
    
    const adminScoreDiff = adminFinalScore - adminInitialScore;
    const userScoreDiff = userFinalScore - userInitialScore;

    console.log('═══════════════════════════════════════════════════════');
    console.log('                    TEST RESULTS                       ');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`📊 Admin Score Change: ${adminInitialScore} → ${adminFinalScore} (${adminScoreDiff >= 0 ? '+' : ''}${adminScoreDiff})`);
    console.log(`📊 User Score Change:  ${userInitialScore} → ${userFinalScore} (${userScoreDiff >= 0 ? '+' : ''}${userScoreDiff})\n`);

    let testPassed = true;
    
    // Verify Admin score did NOT increase
    if (adminScoreDiff === 0) {
      console.log('✅ PASS: Admin score unchanged (correct - Admin only created the task)');
    } else {
      console.log(`❌ FAIL: Admin score changed by ${adminScoreDiff} (should be 0)`);
      testPassed = false;
    }

    // Verify User score increased by +1
    if (userScoreDiff === 1) {
      console.log('✅ PASS: User score increased by +1 (correct - User completed task on time)');
    } else {
      console.log(`❌ FAIL: User score changed by ${userScoreDiff} (should be +1)`);
      testPassed = false;
    }

    console.log('\n═══════════════════════════════════════════════════════');
    
    if (testPassed) {
      console.log('🎉 ALL TESTS PASSED! Scoring logic is fixed correctly.');
      console.log('✅ Only the assignee receives points, not the creator.');
    } else {
      console.log('❌ TEST FAILED! Scoring logic still has issues.');
    }
    
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
runTest();
