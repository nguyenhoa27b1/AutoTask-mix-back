// Simple smoke test for mock API
(async () => {
  const baseUrl = 'http://localhost:4000';
  
  try {
    console.log('Testing Mock Backend API...\n');
    
    // Test 1: GET /api/users
    console.log('1. GET /api/users');
    let res = await fetch(`${baseUrl}/api/users`);
    let data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
    
    // Test 2: GET /api/tasks
    console.log('2. GET /api/tasks');
    res = await fetch(`${baseUrl}/api/tasks`);
    data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
    
    // Test 3: GET /api/files
    console.log('3. GET /api/files');
    res = await fetch(`${baseUrl}/api/files`);
    data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
    
    // Test 4: POST /api/login (admin)
    console.log('4. POST /api/login (admin@example.com)');
    res = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'adminpassword' })
    });
    data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
    
    // Test 5: POST /api/login (user)
    console.log('5. POST /api/login (user@example.com)');
    res = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'userpassword' })
    });
    data = await res.json();
    console.log(`   Status: ${res.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
    
    console.log('✓ All smoke tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    process.exit(1);
  }
})();
