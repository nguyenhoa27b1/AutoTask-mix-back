/**
 * Test Task Creation
 * Debug task creation issues
 */

const http = require('http');

const BASE_URL = 'http://localhost:4000';
let token = null;
let currentUser = null;

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function login(email, password) {
  console.log(`\n🔐 Logging in as: ${email}`);
  const response = await makeRequest('POST', '/api/login', { email, password });
  
  if (response.status === 200) {
    token = response.data.token;
    currentUser = response.data.user;
    console.log(`✅ Logged in as: ${currentUser.name} (${currentUser.email})`);
    console.log(`   Role: ${currentUser.role}`);
    console.log(`   User ID: ${currentUser.user_id}`);
    return true;
  } else {
    console.log(`❌ Login failed:`, response.data);
    return false;
  }
}

async function getUsers() {
  console.log(`\n👥 Fetching users list...`);
  const response = await makeRequest('GET', '/api/users', null, token);
  
  if (response.status === 200) {
    console.log(`✅ Found ${response.data.length} users:`);
    response.data.forEach(u => {
      console.log(`   - ${u.name || u.email} (${u.email}) [ID: ${u.user_id}, Role: ${u.role}]`);
    });
    return response.data;
  } else {
    console.log(`❌ Failed to fetch users:`, response.data);
    return [];
  }
}

async function createTask(taskData) {
  console.log(`\n📝 Creating task...`);
  console.log(`   Title: ${taskData.title}`);
  console.log(`   Assignee ID: ${taskData.assignee_id}`);
  console.log(`   Assigner ID: ${taskData.assigner_id}`);
  
  const response = await makeRequest('POST', '/api/tasks', taskData, token);
  
  console.log(`\n📬 Response Status: ${response.status}`);
  console.log(`📬 Response Data:`, JSON.stringify(response.data, null, 2));
  
  if (response.status === 200) {
    console.log(`\n✅ Task created successfully!`);
    console.log(`   Task ID: ${response.data.id_task}`);
    return response.data;
  } else {
    console.log(`\n❌ Task creation FAILED!`);
    if (response.status === 403) {
      console.log(`   🚫 403 Forbidden - Possible causes:`);
      console.log(`      1. Cross-domain interaction blocked (checkDomainIsolation)`);
      console.log(`      2. Trying to assign task to user from different email domain`);
      console.log(`      3. Check server console for: 🚫 [DOMAIN ISOLATION] messages`);
    } else if (response.status === 401) {
      console.log(`   🔒 401 Unauthorized - Not logged in or invalid token`);
    } else if (response.status === 400) {
      console.log(`   ⚠️ 400 Bad Request - Invalid data format`);
    }
    return null;
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Task Creation Debug Test                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Test 1: Login as admin@example.com
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: Admin creates task for same-domain user');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const loggedIn = await login('admin@example.com', 'adminpassword');
    if (!loggedIn) {
      console.error('\n❌ Cannot proceed without login');
      process.exit(1);
    }

    const users = await getUsers();
    if (users.length === 0) {
      console.error('\n❌ No users found');
      process.exit(1);
    }

    // Find a user from same domain
    const sameDomainUser = users.find(u => u.email.includes('@example.com') && u.user_id !== currentUser.user_id);
    
    if (sameDomainUser) {
      console.log(`\n✅ Found same-domain user: ${sameDomainUser.email}`);
      
      const taskData = {
        title: 'Test Task - Same Domain',
        description: 'This is a test task created by admin for same-domain user',
        assignee_id: sameDomainUser.user_id,
        assigner_id: currentUser.user_id,
        priority: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Pending'
      };
      
      await createTask(taskData);
    } else {
      console.log(`\n⚠️ No same-domain user found for testing`);
    }

    // Test 2: Try cross-domain task creation
    const differentDomainUser = users.find(u => !u.email.includes('@example.com'));
    
    if (differentDomainUser) {
      console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('TEST 2: Admin tries to create task for different-domain user');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`\n⚠️ Found different-domain user: ${differentDomainUser.email}`);
      console.log(`   Expected result: 403 Forbidden (Domain isolation)`);
      
      const crossDomainTaskData = {
        title: 'Test Task - Cross Domain (Should Fail)',
        description: 'This should be blocked by domain isolation',
        assignee_id: differentDomainUser.user_id,
        assigner_id: currentUser.user_id,
        priority: 2,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Pending'
      };
      
      await createTask(crossDomainTaskData);
    }

    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  TESTS COMPLETED                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    console.error(error.stack);
  }
}

runTests();
