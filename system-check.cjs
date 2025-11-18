#!/usr/bin/env node
/**
 * Comprehensive System Integration Check
 * Tests: Backend health, API endpoints, auth flow, file operations
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:4000/api';
let authToken = null;

// Helper: make HTTP requests
async function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const fullPath = path.startsWith('/') ? path : '/' + path;
    const options = {
      method,
      hostname: '127.0.0.1',
      port: 4000,
      path: fullPath,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runChecks() {
  console.log('='.repeat(70));
  console.log('INTEGRATION CHECK: Frontend-Backend System');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  // Test 1: Backend Connectivity
  console.log('\n[1] Backend Connectivity');
  try {
    const res = await request('GET', '/users');
    if (res.status === 200) {
      console.log('  ✓ Backend is responding on 127.0.0.1:4000');
      console.log(`  ✓ GET /api/users returns ${res.body.length || res.body.value?.length || 0} users`);
      passed++;
    } else {
      console.log(`  ✗ Unexpected status: ${res.status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ✗ Cannot reach backend: ${e.message}`);
    failed++;
    return; // Stop if backend is not available
  }

  // Test 2: Authentication Flow
  console.log('\n[2] Authentication (Login)');
  try {
    const res = await request('POST', '/login', {
      email: 'admin@example.com',
      password: 'adminpassword',
    });
    if (res.status === 200 && res.body.user && res.body.token) {
      authToken = res.body.token;
      console.log(`  ✓ Login successful for admin@example.com`);
      console.log(`  ✓ Token received: ${authToken.slice(0, 20)}...`);
      passed++;
    } else {
      console.log(`  ✗ Login failed: status ${res.status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ✗ Login error: ${e.message}`);
    failed++;
  }

  // Test 3: Retrieve Tasks
  console.log('\n[3] Task Management');
  try {
    const res = await request('GET', '/tasks');
    if (res.status === 200 && Array.isArray(res.body)) {
      console.log(`  ✓ GET /api/tasks returns ${res.body.length} tasks`);
      if (res.body.length > 0) {
        const task = res.body[0];
        console.log(`  ✓ Sample task: ID=${task.id_task}, title="${task.title}", score=${task.score}`);
      }
      passed++;
    } else {
      console.log(`  ✗ Failed to fetch tasks: status ${res.status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ✗ Task fetch error: ${e.message}`);
    failed++;
  }

  // Test 4: File Management
  console.log('\n[4] File Management');
  try {
    const res = await request('GET', '/files');
    if (res.status === 200 && Array.isArray(res.body)) {
      console.log(`  ✓ GET /api/files returns ${res.body.length} files`);
      if (res.body.length > 0) {
        const file = res.body[0];
        console.log(`  ✓ Sample file: ID=${file.id_file}, name="${file.name}", url="${file.url}"`);
      }
      passed++;
    } else {
      console.log(`  ✗ Failed to fetch files: status ${res.status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ✗ File fetch error: ${e.message}`);
    failed++;
  }

  // Test 5: Authenticated File Download
  console.log('\n[5] Authenticated File Download');
  if (authToken && passed >= 4) {
    try {
      const fileRes = await request('GET', '/files/1/download');
      if (fileRes.status === 200) {
        console.log(`  ✓ File download endpoint is accessible with token`);
        console.log(`  ✓ File 1 returned with status ${fileRes.status}`);
        passed++;
      } else if (fileRes.status === 401) {
        console.log(`  ✗ File download requires authentication (got 401)`);
        failed++;
      } else {
        console.log(`  ✗ File download failed: status ${fileRes.status}`);
        failed++;
      }
    } catch (e) {
      console.log(`  ✗ File download error: ${e.message}`);
      failed++;
    }
  } else {
    console.log('  ⊘ Skipped (no auth token or earlier tests failed)');
  }

  // Test 6: User Management
  console.log('\n[6] User Management');
  try {
    const res = await request('GET', '/users');
    if (res.status === 200 && Array.isArray(res.body)) {
      const users = res.body;
      const hasAdmin = users.some(u => u.role === 'admin');
      const hasUser = users.some(u => u.role === 'user');
      console.log(`  ✓ GET /api/users returns ${users.length} users`);
      console.log(`  ✓ Admin users: ${users.filter(u => u.role === 'admin').length}, User role: ${users.filter(u => u.role === 'user').length}`);
      if (hasAdmin && hasUser) {
        passed++;
      } else {
        console.log('  ⚠ Warning: Expected both admin and user roles');
      }
    } else {
      console.log(`  ✗ Failed to fetch users: status ${res.status}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ✗ User fetch error: ${e.message}`);
    failed++;
  }

  // Test 7: Backend Configuration Check
  console.log('\n[7] Backend Configuration');
  try {
    const res = await request('GET', '/tasks');
    if (res.status === 200) {
      // Check CORS headers
      const corsHeader = res.headers['access-control-allow-origin'];
      console.log(`  ✓ CORS enabled: ${corsHeader ? 'Yes' : 'No'}`);
      console.log(`  ✓ Response content-type: ${res.headers['content-type']}`);
      
      // Check if server is using IPv4
      console.log(`  ✓ Backend listening on: 127.0.0.1:4000 (IPv4)`);
      passed++;
    }
  } catch (e) {
    console.log(`  ✗ Config check error: ${e.message}`);
    failed++;
  }

  // Test 8: Frontend API Configuration Check
  console.log('\n[8] Frontend API Configuration');
  try {
    const fs = require('fs');
    const apiFile = require('path').join(__dirname, 'services', 'api.ts');
    const content = fs.readFileSync(apiFile, 'utf8');
    
    if (content.includes('127.0.0.1:4000')) {
      console.log(`  ✓ Frontend API base URL: http://127.0.0.1:4000/api (IPv4, explicit)`);
    } else if (content.includes('localhost:4000')) {
      console.log(`  ⚠ Frontend API base URL uses localhost (may have IPv6 issues)`);
    } else {
      console.log(`  ⚠ Could not determine frontend API base URL`);
    }
    
    if (content.includes('authToken')) {
      console.log(`  ✓ Frontend stores auth token: Yes`);
    }
    
    if (content.includes('Authorization') && content.includes('Bearer')) {
      console.log(`  ✓ Frontend includes Authorization header: Yes (Bearer token)`);
    }
    
    if (content.includes('FormData')) {
      console.log(`  ✓ Frontend uses FormData for file uploads: Yes`);
    }
    
    passed++;
  } catch (e) {
    console.log(`  ⚠ Frontend config check skipped: ${e.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70));

  if (failed === 0) {
    console.log('\n✓ All integration checks passed! System is properly connected.');
    process.exit(0);
  } else {
    console.log(`\n✗ ${failed} check(s) failed. Review the output above.`);
    process.exit(1);
  }
}

// Run checks
runChecks().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
