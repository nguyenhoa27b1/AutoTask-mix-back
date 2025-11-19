/**
 * Test Script: Conditional Gmail Login
 * 
 * Tests:
 * 1. Gmail user NOT whitelisted → Login blocked (401)
 * 2. Gmail user whitelisted → Login successful + Name auto-updated
 * 3. Gmail user tries password login → Blocked (403)
 * 4. Non-Gmail user → Normal login works
 */

const http = require('http');

const BASE_URL = 'http://localhost:4000';
let adminToken = null;

// Helper: Make HTTP request
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
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
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

// Helper: Login as admin
async function loginAsAdmin() {
  console.log('🔑 Logging in as admin...');
  const response = await makeRequest('POST', '/api/login', {
    email: 'admin@example.com',
    password: 'adminpassword'
  });

  if (response.status === 200 && response.data.token) {
    adminToken = response.data.token;
    console.log('✅ Admin login successful');
    return true;
  } else {
    console.error('❌ Admin login failed:', response.data);
    return false;
  }
}

// Helper: Add Gmail user to whitelist (via admin)
async function addGmailUserToWhitelist(email, name) {
  console.log(`\n➕ Admin adding Gmail user to whitelist: ${email}`);
  
  const response = await makeRequest('POST', '/api/users', {
    email: email,
    name: name,
    role: 'user',
    password: '' // Gmail users don't use password
  }, adminToken);

  if (response.status === 200) {
    console.log(`✅ Gmail user added and whitelisted: ${email}`);
    return true;
  } else {
    console.log(`⚠️ Failed to add user (may already exist): ${response.data.error || 'unknown'}`);
    return false;
  }
}

// Test 1: Gmail user NOT whitelisted → Login blocked
async function testNonWhitelistedGmailBlocked() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST 1: Non-Whitelisted Gmail User Login (Should Block)  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testEmail = 'notwhitelisted@gmail.com';
  const googleProfile = {
    email: testEmail,
    name: 'Not Whitelisted User',
    picture: 'https://example.com/photo.jpg'
  };

  console.log(`Attempting Google OAuth login: ${testEmail}`);
  const response = await makeRequest('POST', '/api/login/google', googleProfile);

  console.log(`Response Status: ${response.status}`);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 401 && response.data.error.includes('not authorized')) {
    console.log('\n✅ PASS: Non-whitelisted Gmail user login blocked correctly!');
    return true;
  } else {
    console.log('\n❌ FAIL: Non-whitelisted Gmail user should be blocked with 401!');
    return false;
  }
}

// Test 2: Gmail user whitelisted → Login successful + Name updated
async function testWhitelistedGmailLoginAndNameUpdate() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST 2: Whitelisted Gmail User Login + Name Auto-Update  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testEmail = 'whitelisted@gmail.com';
  
  // Step 1: Admin adds Gmail user to whitelist
  await addGmailUserToWhitelist(testEmail, 'Initial Name');

  // Step 2: Gmail user logs in with DIFFERENT name from Google
  const googleProfile = {
    email: testEmail,
    name: 'Updated Name from Google',
    picture: 'https://example.com/photo.jpg'
  };

  console.log(`\n🔐 Attempting Google OAuth login: ${testEmail}`);
  console.log(`   Expected name update: "Initial Name" → "Updated Name from Google"`);
  
  const loginResponse = await makeRequest('POST', '/api/login/google', googleProfile);

  console.log(`Response Status: ${loginResponse.status}`);
  console.log('Response:', JSON.stringify(loginResponse.data, null, 2));

  if (loginResponse.status === 200) {
    console.log('\n✅ Login successful!');
    
    // Verify name was updated
    if (loginResponse.data.name === 'Updated Name from Google') {
      console.log('✅ PASS: Name auto-updated from Google profile!');
      return true;
    } else {
      console.log(`❌ FAIL: Name not updated. Expected "Updated Name from Google", got "${loginResponse.data.name}"`);
      return false;
    }
  } else {
    console.log('\n❌ FAIL: Whitelisted Gmail user should login successfully!');
    return false;
  }
}

// Test 3: Gmail user tries password login → Blocked
async function testGmailPasswordLoginBlocked() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST 3: Gmail User Password Login (Should Block)         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testEmail = 'whitelisted@gmail.com';
  
  console.log(`Attempting password login for Gmail user: ${testEmail}`);
  const response = await makeRequest('POST', '/api/login', {
    email: testEmail,
    password: 'somepassword'
  });

  console.log(`Response Status: ${response.status}`);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 403 && response.data.error.includes('must login via Google OAuth')) {
    console.log('\n✅ PASS: Gmail user password login blocked correctly!');
    return true;
  } else {
    console.log('\n❌ FAIL: Gmail user should not be able to login with password!');
    return false;
  }
}

// Test 4: Non-Gmail user normal login works
async function testNonGmailLoginWorks() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  TEST 4: Non-Gmail User Password Login (Should Work)      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const testEmail = 'user@example.com';
  
  console.log(`Attempting password login for non-Gmail user: ${testEmail}`);
  const response = await makeRequest('POST', '/api/login', {
    email: testEmail,
    password: 'userpassword'
  });

  console.log(`Response Status: ${response.status}`);
  console.log('Response:', JSON.stringify(response.data, null, 2));

  if (response.status === 200 && response.data.user) {
    console.log('\n✅ PASS: Non-Gmail user password login works correctly!');
    return true;
  } else {
    console.log('\n❌ FAIL: Non-Gmail user should be able to login with password!');
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      Conditional Gmail Login - Test Suite                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Login as admin first
    const adminLoggedIn = await loginAsAdmin();
    if (!adminLoggedIn) {
      console.error('\n❌ Cannot proceed without admin login. Exiting.');
      process.exit(1);
    }

    // Run all tests
    const results = {
      test1: await testNonWhitelistedGmailBlocked(),
      test2: await testWhitelistedGmailLoginAndNameUpdate(),
      test3: await testGmailPasswordLoginBlocked(),
      test4: await testNonGmailLoginWorks(),
    };

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                     TESTS COMPLETED                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const passedTests = Object.values(results).filter(r => r === true).length;
    const totalTests = Object.keys(results).length;

    console.log(`Test 1 (Non-whitelisted Gmail blocked):    ${results.test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 2 (Whitelisted Gmail + name update):  ${results.test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 3 (Gmail password login blocked):     ${results.test3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test 4 (Non-Gmail password login works):   ${results.test4 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`\n📊 Results: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! Conditional Gmail Login works perfectly!');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the implementation.');
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests();
