// Test script for Domain-Based Privacy Control
const API_BASE = 'http://localhost:4000/api';

async function setupTestData() {
  console.log('\n📦 SETUP: Creating test users and tasks');
  console.log('='.repeat(60));
  
  // Login as admin to get admin user data
  let response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'adminpassword'
    })
  });
  
  const adminLogin = await response.json();
  console.log('✅ Logged in as:', adminLogin.user.email);
  
  // Create Gmail user
  response = await fetch(`${API_BASE}/login/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nguyenhoa27b1@gmail.com',
      name: 'Nguyen Hoa'
    })
  });
  
  const gmailUser = await response.json();
  console.log('✅ Created Gmail user:', gmailUser.email);
  
  // Login back as admin to create example.com task
  response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'adminpassword'
    })
  });
  
  // Get example.com users
  response = await fetch(`${API_BASE}/users`);
  const exampleUsers = await response.json();
  const exampleUser = exampleUsers.find(u => u.email === 'user@example.com');
  
  // Create task for example.com domain
  response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Example.com Task',
      description: 'For example.com users only',
      assignee_id: exampleUser.user_id,
      assigner_id: adminLogin.user.user_id,
      priority: 2,
      deadline: '2025-12-31',
      status: 'Pending'
    })
  });
  const exampleTask = await response.json();
  console.log('✅ Created example.com task:', exampleTask.id_task);
  
  // Login as gmail user to create gmail.com task
  response = await fetch(`${API_BASE}/login/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nguyenhoa27b1@gmail.com',
      name: 'Nguyen Hoa'
    })
  });
  const gmailUserLogin = await response.json();
  
  // Create task for gmail.com domain
  response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Gmail.com Task',
      description: 'For gmail.com users only',
      assignee_id: gmailUserLogin.user_id,
      assigner_id: gmailUserLogin.user_id,
      priority: 1,
      deadline: '2025-12-25',
      status: 'Pending'
    })
  });
  const gmailTask = await response.json();
  console.log('✅ Created gmail.com task:', gmailTask.id_task);
  
  console.log('\n✅ Test data setup complete!');
}

async function testDomainFilterUsers() {
  console.log('\n\n🔒 TEST 1: Domain Filtering for Users List');
  console.log('='.repeat(60));
  
  // Test 1a: example.com user
  console.log('\n--- Test 1a: example.com user views users ---');
  let response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'adminpassword'
    })
  });
  console.log('✅ Logged in as: admin@example.com');
  
  response = await fetch(`${API_BASE}/users`);
  const exampleUsers = await response.json();
  
  console.log(`📊 Returned ${exampleUsers.length} users:`);
  exampleUsers.forEach(u => console.log(`   - ${u.email}`));
  
  const onlyExample = exampleUsers.every(u => u.email.endsWith('@example.com'));
  if (onlyExample) {
    console.log('✅ PASS: Only @example.com users visible');
  } else {
    console.log('❌ FAIL: Found users from other domains');
  }
  
  // Test 1b: gmail.com user
  console.log('\n--- Test 1b: gmail.com user views users ---');
  response = await fetch(`${API_BASE}/login/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nguyenhoa27b1@gmail.com',
      name: 'Nguyen Hoa'
    })
  });
  console.log('✅ Logged in as: nguyenhoa27b1@gmail.com');
  
  response = await fetch(`${API_BASE}/users`);
  const gmailUsers = await response.json();
  
  console.log(`📊 Returned ${gmailUsers.length} users:`);
  gmailUsers.forEach(u => console.log(`   - ${u.email}`));
  
  const onlyGmail = gmailUsers.every(u => u.email.endsWith('@gmail.com'));
  if (onlyGmail) {
    console.log('✅ PASS: Only @gmail.com users visible');
  } else {
    console.log('❌ FAIL: Found users from other domains');
  }
}

async function testDomainFilterTasks() {
  console.log('\n\n📋 TEST 2: Domain Filtering for Tasks List');
  console.log('='.repeat(60));
  
  // Test 2a: example.com user
  console.log('\n--- Test 2a: example.com user views tasks ---');
  let response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'adminpassword'
    })
  });
  console.log('✅ Logged in as: admin@example.com');
  
  response = await fetch(`${API_BASE}/tasks`);
  const exampleTasks = await response.json();
  
  console.log(`📊 Returned ${exampleTasks.length} tasks`);
  
  if (exampleTasks.length > 0) {
    console.log('✅ PASS: Example.com user can see their tasks');
  } else {
    console.log('⚠️  WARNING: No tasks found');
  }
  
  // Test 2b: gmail.com user
  console.log('\n--- Test 2b: gmail.com user views tasks ---');
  response = await fetch(`${API_BASE}/login/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nguyenhoa27b1@gmail.com',
      name: 'Nguyen Hoa'
    })
  });
  console.log('✅ Logged in as: nguyenhoa27b1@gmail.com');
  
  response = await fetch(`${API_BASE}/tasks`);
  const gmailTasks = await response.json();
  
  console.log(`📊 Returned ${gmailTasks.length} tasks`);
  
  if (gmailTasks.length > 0) {
    console.log('✅ PASS: Gmail user can see their tasks');
  } else {
    console.log('⚠️  WARNING: No tasks found');
  }
}

async function testCrossDomainBlock() {
  console.log('\n\n🚫 TEST 3: Cross-Domain Interaction Blocking');
  console.log('='.repeat(60));
  
  // Login as example.com
  let response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'adminpassword'
    })
  });
  const admin = await response.json();
  console.log('✅ Logged in as:', admin.user.email);
  
  // Try to assign task to gmail user (ID 3)
  console.log('\nAttempting to assign task to Gmail user...');
  response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Cross-Domain Task',
      description: 'Should be blocked',
      assignee_id: 3, // Gmail user ID
      assigner_id: admin.user.user_id,
      priority: 2,
      deadline: '2025-12-31',
      status: 'Pending'
    })
  });
  
  const result = await response.json();
  console.log(`Response Status: ${response.status}`);
  console.log('Response:', JSON.stringify(result, null, 2));
  
  if (response.status === 403) {
    console.log('\n✅ PASS: Cross-domain interaction blocked!');
  } else {
    console.log('\n❌ FAIL: Cross-domain interaction NOT blocked');
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      Domain-Based Privacy Control - Test Suite            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  try {
    await setupTestData();
    await testDomainFilterUsers();
    await testDomainFilterTasks();
    await testCrossDomainBlock();
    
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                     TESTS COMPLETED                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n💥 Test Error:', error.message);
    console.error(error.stack);
  }
}

runTests();
