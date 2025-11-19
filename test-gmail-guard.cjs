// Test script for Gmail interaction guard and admin access
const API_BASE = 'http://localhost:4000/api';

async function testAdminAccess() {
  console.log('\n🔑 TEST 1: Admin Access for nguyenhoa27b1@gmail.com');
  console.log('='.repeat(60));
  
  // Simulate Google login with nguyenhoa27b1@gmail.com
  const response = await fetch(`${API_BASE}/login/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nguyenhoa27b1@gmail.com',
      name: 'Nguyen Hoa',
      picture: null
    })
  });
  
  const user = await response.json();
  console.log('Response:', JSON.stringify(user, null, 2));
  
  if (user.role === 'admin' && user.isAdmin === true) {
    console.log('✅ PASS: Admin role granted correctly');
    console.log(`   - role: ${user.role}`);
    console.log(`   - isAdmin: ${user.isAdmin}`);
  } else {
    console.log('❌ FAIL: Admin role NOT granted');
    console.log(`   - Expected: role='admin', isAdmin=true`);
    console.log(`   - Got: role='${user.role}', isAdmin=${user.isAdmin}`);
  }
  
  return user;
}

async function testInteractionBlock() {
  console.log('\n\n🚫 TEST 2: Block @example.com → @gmail.com interaction');
  console.log('='.repeat(60));
  
  // Step 1: Login as admin@example.com
  console.log('\nStep 1: Login as admin@example.com...');
  let response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'adminpassword'
    })
  });
  
  const loginData = await response.json();
  console.log('✅ Logged in as:', loginData.user.email);
  
  // Step 2: Get user list to find Gmail user ID
  console.log('\nStep 2: Fetching users list...');
  response = await fetch(`${API_BASE}/users`);
  const users = await response.json();
  const gmailUser = users.find(u => u.email === 'nguyenhoa27b1@gmail.com');
  
  if (!gmailUser) {
    console.log('❌ Gmail user not found. Run Test 1 first!');
    return;
  }
  
  console.log(`✅ Found Gmail user: ${gmailUser.email} (ID: ${gmailUser.user_id})`);
  
  // Step 3: Try to create task assigned to Gmail user
  console.log('\nStep 3: Attempting to assign task to Gmail user...');
  response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Test Task',
      description: 'This should be blocked',
      assignee_id: gmailUser.user_id,
      assigner_id: loginData.user.user_id,
      priority: 2,
      deadline: '2025-12-31',
      status: 'Pending'
    })
  });
  
  const result = await response.json();
  console.log(`Response Status: ${response.status}`);
  console.log('Response Body:', JSON.stringify(result, null, 2));
  
  if (response.status === 403 && result.error === 'Interaction denied for @gmail.com users.') {
    console.log('\n✅ PASS: Interaction correctly blocked!');
    console.log('   - Status: 403 Forbidden');
    console.log('   - Error message: "Interaction denied for @gmail.com users."');
  } else {
    console.log('\n❌ FAIL: Interaction was NOT blocked');
    console.log(`   - Expected: 403 with error message`);
    console.log(`   - Got: ${response.status}`);
  }
}

async function testGmailToExampleInteraction() {
  console.log('\n\n✅ TEST 3: Allow @gmail.com → @example.com interaction');
  console.log('='.repeat(60));
  
  // Step 1: Login as nguyenhoa27b1@gmail.com (admin)
  console.log('\nStep 1: Login as nguyenhoa27b1@gmail.com...');
  let response = await fetch(`${API_BASE}/login/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nguyenhoa27b1@gmail.com',
      name: 'Nguyen Hoa',
      picture: null
    })
  });
  
  const gmailUser = await response.json();
  console.log('✅ Logged in as:', gmailUser.email, '(Admin)');
  
  // Step 2: Get example.com user
  console.log('\nStep 2: Fetching users list...');
  response = await fetch(`${API_BASE}/users`);
  const users = await response.json();
  const exampleUser = users.find(u => u.email === 'user@example.com');
  
  console.log(`✅ Found example.com user: ${exampleUser.email} (ID: ${exampleUser.user_id})`);
  
  // Step 3: Try to create task assigned to example.com user (should succeed)
  console.log('\nStep 3: Attempting to assign task to example.com user...');
  response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Task from Gmail Admin',
      description: 'This should work',
      assignee_id: exampleUser.user_id,
      assigner_id: gmailUser.user_id,
      priority: 2,
      deadline: '2025-12-31',
      status: 'Pending'
    })
  });
  
  const result = await response.json();
  console.log(`Response Status: ${response.status}`);
  
  if (response.status === 200 && (result.task_id || result.id_task)) {
    console.log('\n✅ PASS: Gmail user CAN assign tasks to example.com users');
    console.log(`   - Task created: ID ${result.task_id || result.id_task}`);
  } else {
    console.log('\n❌ FAIL: Task creation failed unexpectedly');
    console.log('Response:', JSON.stringify(result, null, 2));
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   Gmail Interaction Guard & Admin Access - Test Suite     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    await testAdminAccess();
    await testInteractionBlock();
    await testGmailToExampleInteraction();
    
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                     TESTS COMPLETED                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n💥 Test Error:', error.message);
    console.error(error.stack);
  }
}

// Run tests
runTests();
