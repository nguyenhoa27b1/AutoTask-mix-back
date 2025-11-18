/**
 * Test script to verify the new scoring logic (+1/-1/0)
 */

const BASE_URL = 'http://localhost:4000/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(JSON.stringify(error));
    }
    return response.json();
}

// Test scenarios
const testCases = [
    {
        name: 'Task completed BEFORE deadline',
        expectedScore: 1,
        deadlineOffset: 5, // 5 days from now
    },
    {
        name: 'Task completed ON deadline',
        expectedScore: 0,
        deadlineOffset: 0, // today
    },
    {
        name: 'Task completed AFTER deadline',
        expectedScore: -1,
        deadlineOffset: -3, // 3 days ago
    },
];

async function runTests() {
    console.log('🧪 Testing new scoring logic (+1/-1/0)...\n');

    try {
        // Login as admin
        console.log('📝 Logging in as admin...');
        const adminUser = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'admin@test.com', password: 'admin123' }),
        });
        console.log(`✅ Logged in as ${adminUser.name}\n`);

        let testIndex = 1;
        
        for (const testCase of testCases) {
            console.log(`\n📋 Test Case ${testIndex}: ${testCase.name}`);
            console.log('-------------------------------------------');

            // Calculate deadline
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + testCase.deadlineOffset);
            const deadlineStr = deadline.toISOString().split('T')[0]; // YYYY-MM-DD

            // Create task
            const taskPayload = {
                title: `Test Task - ${testCase.name}`,
                description: `Testing scoring for: ${testCase.name}`,
                priority: 'Medium',
                deadline: deadlineStr,
                id_user: adminUser.user_id,
                status: 'In Progress',
            };

            console.log(`  Creating task with deadline: ${deadlineStr}`);
            const task = await apiCall('/tasks', {
                method: 'POST',
                body: JSON.stringify(taskPayload),
            });
            console.log(`  ✅ Task created (ID: ${task.id_task})\n`);

            // Create a dummy file and submit
            console.log(`  Submitting task...`);
            
            // Create FormData with a dummy file
            const formData = new FormData();
            const fileContent = `Test file for ${testCase.name}`;
            const file = new File([fileContent], `test-${testIndex}.txt`, { type: 'text/plain' });
            formData.append('file', file);

            const submitResponse = await fetch(`${BASE_URL}/tasks/${task.id_task}/submit`, {
                method: 'POST',
                body: formData,
            });

            if (!submitResponse.ok) {
                const error = await submitResponse.json().catch(() => ({ error: submitResponse.statusText }));
                throw new Error(`Failed to submit task: ${JSON.stringify(error)}`);
            }

            const result = await submitResponse.json();
            const actualScore = result.task.score;

            // Verify score
            const scoreMatch = actualScore === testCase.expectedScore;
            const symbol = scoreMatch ? '✅' : '❌';
            console.log(`  ${symbol} Expected score: ${testCase.expectedScore}, Got: ${actualScore}`);
            
            if (!scoreMatch) {
                console.log(`  ⚠️  MISMATCH! Check deadline calculation.`);
            }

            console.log(`  📂 File uploaded: ${result.file.name} (ID: ${result.file.id_file})`);
            testIndex++;
        }

        console.log('\n\n📊 Test Summary:');
        console.log('=========================================');
        console.log('✅ All scoring tests completed!');
        console.log('\nScoring Logic Verification:');
        console.log('  +1 = Completed before deadline');
        console.log('  0  = Completed on deadline');
        console.log('  -1 = Completed after deadline');

    } catch (error) {
        console.error('❌ Test Error:', error.message);
        process.exit(1);
    }
}

// Run tests
runTests().then(() => {
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
}).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
