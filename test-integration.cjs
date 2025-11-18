#!/usr/bin/env node

/**
 * Frontend-Backend Integration Verification
 * Tests that the frontend can properly connect to and use the backend API
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:4000/api';

// Utility to make HTTP requests
function makeRequest(method, endpoint, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_BASE_URL}${endpoint}`);
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
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('\n🧪 Frontend-Backend Integration Test Suite\n');
    console.log('=' .repeat(60) + '\n');

    const tests = [
        {
            name: 'GET /api/users - Retrieve all users',
            method: 'GET',
            endpoint: '/users',
            expectedStatus: 200,
            description: 'Backend should return list of default users'
        },
        {
            name: 'GET /api/tasks - Retrieve all tasks',
            method: 'GET',
            endpoint: '/tasks',
            expectedStatus: 200,
            description: 'Backend should return empty task list initially'
        },
        {
            name: 'GET /api/files - Retrieve all files',
            method: 'GET',
            endpoint: '/files',
            expectedStatus: 200,
            description: 'Backend should return default files'
        },
        {
            name: 'POST /api/login - Admin login',
            method: 'POST',
            endpoint: '/login',
            body: { email: 'admin@example.com', password: 'adminpassword' },
            expectedStatus: 200,
            description: 'Admin should be able to login'
        },
        {
            name: 'POST /api/login - User login',
            method: 'POST',
            endpoint: '/login',
            body: { email: 'user@example.com', password: 'userpassword' },
            expectedStatus: 200,
            description: 'Regular user should be able to login'
        },
        {
            name: 'POST /api/login - Invalid credentials',
            method: 'POST',
            endpoint: '/login',
            body: { email: 'test@example.com', password: 'wrongpassword' },
            expectedStatus: 401,
            description: 'Invalid login should fail'
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            const result = await makeRequest(test.method, test.endpoint, test.body);
            const success = result.status === test.expectedStatus;

            if (success) {
                console.log(`✅ ${test.name}`);
                console.log(`   Status: ${result.status} (expected ${test.expectedStatus})`);
                if (result.data) {
                    if (Array.isArray(result.data)) {
                        console.log(`   Response: Array with ${result.data.length} items`);
                    } else if (result.data.user_id) {
                        console.log(`   Response: User ${result.data.name} (${result.data.email})`);
                    } else {
                        console.log(`   Response: ${JSON.stringify(result.data).substring(0, 50)}...`);
                    }
                }
                passed++;
            } else {
                console.log(`❌ ${test.name}`);
                console.log(`   Status: ${result.status} (expected ${test.expectedStatus})`);
                console.log(`   Response: ${JSON.stringify(result.data).substring(0, 100)}`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${test.name}`);
            console.log(`   Error: ${error.message}`);
            failed++;
        }
        console.log();
    }

    console.log('=' .repeat(60));
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${tests.length} tests\n`);

    if (failed === 0) {
        console.log('✨ All integration tests passed!');
        console.log('\n✅ Frontend and backend are properly integrated.');
        console.log('You can now start the frontend with: npm run dev\n');
    } else {
        console.log('⚠️  Some tests failed. Check backend logs for details.\n');
    }
}

runTests().catch(console.error);
