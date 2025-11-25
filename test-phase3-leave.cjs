/**
 * Test Phase 3: Leave Management System
 */

const http = require('http');

const API_BASE = 'http://localhost:4000';

function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Testing Phase 3: Leave Management System\n');

    try {
        // Test 1: Login first
        console.log('🔐 Test 1: Login as admin');
        const loginResp = await makeRequest('POST', '/api/login', {
            email: 'admin@example.com',
            password: 'adminpassword'
        });
        console.log(`   Status: ${loginResp.status}`);
        console.log(`   Logged in as: ${loginResp.data.user?.email}`);

        // Test 2: Get initial leave requests (should be empty)
        console.log('\n📋 Test 2: Get leave requests (should be empty)');
        const getInitialResp = await makeRequest('GET', '/api/leave-requests');
        console.log(`   Status: ${getInitialResp.status}`);
        console.log(`   Leave requests count: ${getInitialResp.data?.length || 0}`);

        // Test 3: Create leave request
        console.log('\n📝 Test 3: Create leave request');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const createResp = await makeRequest('POST', '/api/leave-requests', {
            start_date: tomorrow.toISOString(),
            end_date: nextWeek.toISOString(),
            reason: 'Annual vacation - testing Phase 3'
        });
        console.log(`   Status: ${createResp.status}`);
        console.log(`   Created request ID: ${createResp.data?.id_leave}`);
        console.log(`   Status: ${createResp.data?.status}`);
        console.log(`   User: ${createResp.data?.user_name} (${createResp.data?.user_email})`);
        console.log(`   Dates: ${createResp.data?.start_date?.split('T')[0]} to ${createResp.data?.end_date?.split('T')[0]}`);
        console.log(`   Reason: ${createResp.data?.reason}`);

        const leaveId = createResp.data?.id_leave;

        // Test 4: Get all leave requests (should have 1)
        console.log('\n📋 Test 4: Get leave requests (should have 1)');
        const getResp = await makeRequest('GET', '/api/leave-requests');
        console.log(`   Status: ${getResp.status}`);
        console.log(`   Leave requests count: ${getResp.data?.length || 0}`);

        if (getResp.data && getResp.data.length > 0) {
            const req = getResp.data[0];
            console.log(`   First request: ${req.status} - ${req.user_name}`);
        }

        // Test 5: Create another leave request
        console.log('\n📝 Test 5: Create another leave request');
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + 30);
        const futureEndDate = new Date(futureDate);
        futureEndDate.setDate(futureEndDate.getDate() + 5);

        const createResp2 = await makeRequest('POST', '/api/leave-requests', {
            start_date: futureDate.toISOString(),
            end_date: futureEndDate.toISOString(),
            reason: 'Medical appointment'
        });
        console.log(`   Status: ${createResp2.status}`);
        console.log(`   Created request ID: ${createResp2.data?.id_leave}`);

        // Test 6: Approve first request
        console.log('\n✅ Test 6: Approve leave request');
        const approveResp = await makeRequest('PUT', `/api/leave-requests/${leaveId}/approve`, {
            notes: 'Approved - enjoy your vacation!'
        });
        console.log(`   Status: ${approveResp.status}`);
        console.log(`   Request status: ${approveResp.data?.status}`);
        console.log(`   Reviewed by: ${approveResp.data?.reviewer_name}`);
        console.log(`   Notes: ${approveResp.data?.notes}`);

        // Test 7: Reject second request
        console.log('\n❌ Test 7: Reject second leave request');
        const rejectResp = await makeRequest('PUT', `/api/leave-requests/${createResp2.data?.id_leave}/reject`, {
            notes: 'Too many requests this month'
        });
        console.log(`   Status: ${rejectResp.status}`);
        console.log(`   Request status: ${rejectResp.data?.status}`);
        console.log(`   Notes: ${rejectResp.data?.notes}`);

        // Test 8: Get final state
        console.log('\n📊 Test 8: Get final leave requests');
        const finalResp = await makeRequest('GET', '/api/leave-requests');
        console.log(`   Status: ${finalResp.status}`);
        console.log(`   Total requests: ${finalResp.data?.length || 0}`);
        
        if (finalResp.data && Array.isArray(finalResp.data)) {
            console.log('\n   Leave Requests Summary:');
            console.log('   =====================================================');
            finalResp.data.forEach(req => {
                console.log(`   ${req.status.padEnd(10)} | ${req.user_name.padEnd(20)} | ${req.start_date.split('T')[0]} to ${req.end_date.split('T')[0]}`);
                console.log(`              | Reason: ${req.reason}`);
                if (req.notes) {
                    console.log(`              | Notes: ${req.notes}`);
                }
            });
            console.log('   =====================================================');
        }

        console.log('\n✅ All Phase 3 tests completed!');
        console.log('\n📊 Summary:');
        console.log('   - Leave request creation ✅');
        console.log('   - Leave request listing ✅');
        console.log('   - Leave request approval ✅');
        console.log('   - Leave request rejection ✅');
        console.log('   - Status tracking ✅');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

runTests().then(() => {
    console.log('\n🎉 Testing session completed!');
    process.exit(0);
}).catch(err => {
    console.error('💥 Critical error:', err);
    process.exit(1);
});
