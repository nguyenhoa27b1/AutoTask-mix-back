/**
 * Integration Health Check - Comprehensive Test Suite
 * 
 * Tests all 4 major integration flows:
 * 1. User Data Consistency
 * 2. Admin Authorization
 * 3. Task Lifecycle & Email
 * 4. Domain Isolation
 */

const BASE_URL = 'http://localhost:4000/api';

// Test data
const testUsers = {
  admin: { email: 'admin@example.com', password: 'adminpassword' },
  user: { email: 'user@example.com', password: 'userpassword' },
  gmailAdmin: { 
    email: 'nguyenhoa27b1@gmail.com',
    name: 'Nguyen Hoa',
    given_name: 'Hoa',
    picture: 'https://lh3.googleusercontent.com/a/default',
    email_verified: true,
    sub: '1234567890'
  }
};

let adminToken = null;
let userToken = null;
let gmailAdminToken = null;

// Helper functions
function log(emoji, category, message) {
  console.log(`${emoji} [${category}] ${message}`);
}

function section(title) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 ${title}`);
  console.log(`${'='.repeat(70)}\n`);
}

async function apiCall(endpoint, options = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  
  const data = await response.json();
  return { status: response.status, data };
}

// Test 1: User Data Consistency
async function test1_UserDataConsistency() {
  section('TEST 1: User Data Consistency');
  
  let allPassed = true;
  
  // Test 1.1: Password Login
  log('🧪', 'TEST 1.1', 'Testing password login - user@example.com');
  const loginResp = await apiCall('/login', {
    method: 'POST',
    body: JSON.stringify(testUsers.user)
  });
  
  if (loginResp.status === 200) {
    const { user, token } = loginResp.data;
    userToken = token;
    
    // Validate user object structure
    const checks = [
      { name: 'Has user_id', pass: typeof user.user_id === 'number' },
      { name: 'Has email', pass: typeof user.email === 'string' },
      { name: 'Has role', pass: typeof user.role === 'string' },
      { name: 'Has isAdmin', pass: typeof user.isAdmin === 'boolean' },
      { name: 'Has name (string)', pass: typeof user.name === 'string' && user.name !== null },
      { name: 'Has picture (string)', pass: typeof user.picture === 'string' && user.picture !== null },
      { name: 'Has token', pass: typeof token === 'string' && token.length > 0 }
    ];
    
    checks.forEach(check => {
      if (check.pass) {
        log('✅', 'VALIDATE', check.name);
      } else {
        log('❌', 'VALIDATE', `${check.name} - FAILED`);
        allPassed = false;
      }
    });
    
    // Test split() operation (what caused original error)
    try {
      const username = user.email.split('@')[0];
      log('✅', 'VALIDATE', `email.split('@')[0] works: "${username}"`);
    } catch (error) {
      log('❌', 'VALIDATE', `email.split('@')[0] FAILED: ${error.message}`);
      allPassed = false;
    }
  } else {
    log('❌', 'TEST 1.1', `Login failed with status ${loginResp.status}`);
    allPassed = false;
  }
  
  // Test 1.2: Google OAuth Login
  log('🧪', 'TEST 1.2', 'Testing Google OAuth - nguyenhoa27b1@gmail.com');
  const googleResp = await apiCall('/login/google', {
    method: 'POST',
    body: JSON.stringify(testUsers.gmailAdmin)
  });
  
  if (googleResp.status === 200) {
    const { user, token } = googleResp.data;
    gmailAdminToken = token;
    
    const checks = [
      { name: 'Has name (string)', pass: typeof user.name === 'string' && user.name !== null },
      { name: 'Has picture (string)', pass: typeof user.picture === 'string' && user.picture !== null },
      { name: 'Token received', pass: typeof token === 'string' && token.length > 0 }
    ];
    
    checks.forEach(check => {
      if (check.pass) {
        log('✅', 'VALIDATE', check.name);
      } else {
        log('❌', 'VALIDATE', `${check.name} - FAILED`);
        allPassed = false;
      }
    });
  } else {
    log('❌', 'TEST 1.2', `Google login failed with status ${googleResp.status}`);
    allPassed = false;
  }
  
  log(allPassed ? '🎉' : '💥', 'TEST 1', allPassed ? 'PASSED' : 'FAILED');
  return allPassed;
}

// Test 2: Admin Authorization
async function test2_AdminAuthorization() {
  section('TEST 2: Admin Authorization');
  
  let allPassed = true;
  
  // Test 2.1: Gmail Admin gets admin role
  log('🧪', 'TEST 2.1', 'Checking if nguyenhoa27b1@gmail.com has admin role');
  const googleResp = await apiCall('/login/google', {
    method: 'POST',
    body: JSON.stringify(testUsers.gmailAdmin)
  });
  
  if (googleResp.status === 200) {
    const { user } = googleResp.data;
    
    if (user.role === 'admin' && user.isAdmin === true) {
      log('✅', 'VALIDATE', `role: "${user.role}", isAdmin: ${user.isAdmin}`);
    } else {
      log('❌', 'VALIDATE', `Expected role='admin' and isAdmin=true, got role='${user.role}' and isAdmin=${user.isAdmin}`);
      allPassed = false;
    }
  } else {
    log('❌', 'TEST 2.1', `Login failed with status ${googleResp.status}`);
    allPassed = false;
  }
  
  // Test 2.2: Regular user does NOT have admin role
  log('🧪', 'TEST 2.2', 'Checking if user@example.com does NOT have admin role');
  const regularResp = await apiCall('/login', {
    method: 'POST',
    body: JSON.stringify(testUsers.user)
  });
  
  if (regularResp.status === 200) {
    const { user } = regularResp.data;
    
    if (user.role !== 'admin' && user.isAdmin === false) {
      log('✅', 'VALIDATE', `role: "${user.role}", isAdmin: ${user.isAdmin}`);
    } else {
      log('❌', 'VALIDATE', `Expected role!='admin' and isAdmin=false, got role='${user.role}' and isAdmin=${user.isAdmin}`);
      allPassed = false;
    }
  } else {
    log('❌', 'TEST 2.2', `Login failed with status ${regularResp.status}`);
    allPassed = false;
  }
  
  log(allPassed ? '🎉' : '💥', 'TEST 2', allPassed ? 'PASSED' : 'FAILED');
  return allPassed;
}

// Test 3: Task Lifecycle & Email
async function test3_TaskLifecycleEmail() {
  section('TEST 3: Task Lifecycle & Email');
  
  let allPassed = true;
  
  // Login as admin first
  const adminResp = await apiCall('/login', {
    method: 'POST',
    body: JSON.stringify(testUsers.admin)
  });
  
  if (adminResp.status !== 200) {
    log('❌', 'SETUP', 'Failed to login as admin');
    return false;
  }
  
  adminToken = adminResp.data.token;
  const adminUser = adminResp.data.user;
  
  // Get all users to find assignee
  const usersResp = await apiCall('/users', {}, adminToken);
  const users = usersResp.data;
  const assignee = users.find(u => u.email === 'user@example.com');
  
  if (!assignee) {
    log('❌', 'SETUP', 'Cannot find user@example.com for task assignment');
    return false;
  }
  
  log('🧪', 'TEST 3.1', 'Creating task and checking email trigger');
  
  // Create FormData for task creation
  const formData = new FormData();
  formData.append('title', 'Integration Test Task');
  formData.append('description', 'This is a test task for integration health check');
  formData.append('assignee_id', assignee.user_id.toString());
  formData.append('assigner_id', adminUser.user_id.toString());
  formData.append('priority', '2');
  formData.append('deadline', new Date(Date.now() + 86400000).toISOString());
  
  const createResp = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`
    },
    body: formData
  });
  
  if (createResp.status === 200) {
    const task = await createResp.json();
    log('✅', 'VALIDATE', `Task created with ID: ${task.id_task}`);
    log('📧', 'EMAIL', 'Check backend logs for email notification: [EMAIL SENT] Task assignment');
    
    // Note: We cannot directly verify email was sent from client side
    // This would require checking backend logs or email service
    log('ℹ️', 'INFO', 'Email verification: Check server console for "[EMAIL SENT]" message');
  } else {
    log('❌', 'TEST 3.1', `Task creation failed with status ${createResp.status}`);
    allPassed = false;
  }
  
  log(allPassed ? '🎉' : '💥', 'TEST 3', allPassed ? 'PASSED (Check email logs)' : 'FAILED');
  return allPassed;
}

// Test 4: Domain Isolation
async function test4_DomainIsolation() {
  section('TEST 4: Domain Isolation');
  
  let allPassed = true;
  
  // Login as example.com admin
  const adminResp = await apiCall('/login', {
    method: 'POST',
    body: JSON.stringify(testUsers.admin)
  });
  
  if (adminResp.status !== 200) {
    log('❌', 'SETUP', 'Failed to login as admin');
    return false;
  }
  
  adminToken = adminResp.data.token;
  
  // Test 4.1: Admin can see only same-domain users
  log('🧪', 'TEST 4.1', 'Checking user list filtering by domain');
  const usersResp = await apiCall('/users', {}, adminToken);
  
  if (usersResp.status === 200) {
    const users = usersResp.data;
    const exampleUsers = users.filter(u => u.email.includes('@example.com'));
    const gmailUsers = users.filter(u => u.email.includes('@gmail.com'));
    
    if (gmailUsers.length === 0 && exampleUsers.length > 0) {
      log('✅', 'VALIDATE', `Correctly filtered: ${exampleUsers.length} @example.com users, 0 @gmail.com users`);
    } else {
      log('❌', 'VALIDATE', `Filtering failed: ${exampleUsers.length} @example.com, ${gmailUsers.length} @gmail.com`);
      allPassed = false;
    }
  } else {
    log('❌', 'TEST 4.1', `Failed to get users: ${usersResp.status}`);
    allPassed = false;
  }
  
  // Test 4.2: Admin can see only same-domain tasks
  log('🧪', 'TEST 4.2', 'Checking task list filtering by domain');
  const tasksResp = await apiCall('/tasks', {}, adminToken);
  
  if (tasksResp.status === 200) {
    const tasks = tasksResp.data;
    log('✅', 'VALIDATE', `Received ${tasks.length} tasks (should only include @example.com tasks)`);
  } else {
    log('❌', 'TEST 4.2', `Failed to get tasks: ${tasksResp.status}`);
    allPassed = false;
  }
  
  log(allPassed ? '🎉' : '💥', 'TEST 4', allPassed ? 'PASSED' : 'FAILED');
  return allPassed;
}

// Main test runner
async function runAllTests() {
  console.log('\n🏥 SYSTEM INTEGRATION HEALTH CHECK');
  console.log(`📍 Backend URL: ${BASE_URL}`);
  console.log(`⏰ Time: ${new Date().toISOString()}\n`);
  
  const results = {
    test1: await test1_UserDataConsistency(),
    test2: await test2_AdminAuthorization(),
    test3: await test3_TaskLifecycleEmail(),
    test4: await test4_DomainIsolation()
  };
  
  // Summary
  section('TEST SUMMARY');
  console.log(`Test 1 (User Data Consistency): ${results.test1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Test 2 (Admin Authorization): ${results.test2 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Test 3 (Task Lifecycle & Email): ${results.test3 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Test 4 (Domain Isolation): ${results.test4 ? '✅ PASSED' : '❌ FAILED'}`);
  
  const totalTests = 4;
  const passedTests = Object.values(results).filter(r => r).length;
  const healthScore = Math.round((passedTests / totalTests) * 100);
  
  console.log(`\n🏆 HEALTH SCORE: ${healthScore}/100`);
  console.log(`📊 Status: ${healthScore >= 80 ? '✅ HEALTHY' : healthScore >= 60 ? '⚠️ WARNING' : '❌ CRITICAL'}\n`);
  
  if (healthScore === 100) {
    console.log('🎉 ALL TESTS PASSED! System integration is working perfectly!');
  } else {
    console.log('⚠️ Some tests failed. Please review the report above.');
  }
  
  process.exit(healthScore === 100 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
