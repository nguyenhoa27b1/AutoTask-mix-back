/**
 * Smoke Test: Google OAuth Login
 * 
 * Test để đảm bảo:
 * 1. Backend trả về User object với đầy đủ fields
 * 2. name và picture luôn là string (không phải null/undefined)
 * 3. Token được trả về thành công
 */

const BASE_URL = 'http://localhost:4000/api';

// Mock Google profile (giống như Google OAuth trả về)
const mockGoogleProfile = {
  email: 'nguyenhoa27b1@gmail.com',
  name: 'Nguyen Hoa',
  given_name: 'Hoa',
  family_name: 'Nguyen',
  picture: 'https://lh3.googleusercontent.com/a/default-user',
  email_verified: true,
  sub: '1234567890'
};

// Test với profile không có name và picture
const mockGoogleProfileNoNamePicture = {
  email: 'test@example.com',
  email_verified: true,
  sub: '0987654321'
};

async function testGoogleOAuth(profile, testName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 TEST: ${testName}`);
  console.log(`${'='.repeat(60)}`);
  console.log('📤 Sending profile:', JSON.stringify(profile, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}/login/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });
    
    console.log(`📊 Response status: ${response.status}`);
    
    if (!response.ok) {
      const error = await response.json();
      console.error(`❌ FAILED: ${error.error}`);
      return false;
    }
    
    const data = await response.json();
    console.log('📥 Response data:', JSON.stringify(data, null, 2));
    
    // Validation checks
    const checks = [
      { name: 'Has user object', condition: !!data.user, value: !!data.user },
      { name: 'Has token', condition: !!data.token, value: data.token ? '✓ present' : '✗ missing' },
      { name: 'User has email', condition: !!data.user?.email, value: data.user?.email },
      { name: 'User has name', condition: !!data.user?.name, value: data.user?.name },
      { name: 'name is string', condition: typeof data.user?.name === 'string', value: typeof data.user?.name },
      { name: 'User has picture', condition: data.user?.picture !== null && data.user?.picture !== undefined, value: data.user?.picture || '(empty string)' },
      { name: 'picture is string', condition: typeof data.user?.picture === 'string', value: typeof data.user?.picture },
      { name: 'User has role', condition: !!data.user?.role, value: data.user?.role },
      { name: 'User has user_id', condition: typeof data.user?.user_id === 'number', value: data.user?.user_id },
    ];
    
    console.log('\n🔍 Validation Results:');
    let allPassed = true;
    checks.forEach(check => {
      const status = check.condition ? '✅' : '❌';
      console.log(`${status} ${check.name}: ${check.value}`);
      if (!check.condition) allPassed = false;
    });
    
    // Test split() operations (what frontend will do)
    console.log('\n🧪 Testing Frontend Operations:');
    try {
      const username = data.user.email.split('@')[0];
      console.log(`✅ email.split('@')[0]: "${username}"`);
    } catch (error) {
      console.error(`❌ email.split('@')[0] FAILED:`, error.message);
      allPassed = false;
    }
    
    try {
      const displayName = data.user.name || data.user.email.split('@')[0];
      console.log(`✅ name fallback: "${displayName}"`);
    } catch (error) {
      console.error(`❌ name fallback FAILED:`, error.message);
      allPassed = false;
    }
    
    if (allPassed) {
      console.log('\n🎉 TEST PASSED!');
      return true;
    } else {
      console.log('\n💥 TEST FAILED - Some checks did not pass');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

async function runSmokeTests() {
  console.log('🚀 Starting Google OAuth Smoke Tests...');
  console.log(`📍 Backend URL: ${BASE_URL}`);
  console.log(`⏰ Time: ${new Date().toISOString()}\n`);
  
  // Test 1: Full profile with name and picture
  const test1 = await testGoogleOAuth(mockGoogleProfile, 'Google OAuth with Full Profile (Admin Email)');
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test 2: Profile without name and picture (edge case)
  const test2 = await testGoogleOAuth(mockGoogleProfileNoNamePicture, 'Google OAuth with Minimal Profile (No name/picture)');
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Test 1 (Full Profile): ${test1 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Test 2 (Minimal Profile): ${test2 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`\nOverall: ${test1 && test2 ? '🎉 ALL TESTS PASSED' : '💥 SOME TESTS FAILED'}`);
  
  process.exit(test1 && test2 ? 0 : 1);
}

// Run tests
runSmokeTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
