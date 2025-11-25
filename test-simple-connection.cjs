const http = require('http');

console.log('Testing connection to http://localhost:4000/api/users');

const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/users',
    method: 'GET',
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const users = JSON.parse(data);
        console.log('✅ Connection successful!');
        console.log(`Found ${users.length} users:`);
        users.forEach(user => {
            console.log(`\n  ${user.email}:`);
            console.log(`    - totalTasksAssigned: ${user.totalTasksAssigned}`);
            console.log(`    - totalTasksCompleted: ${user.totalTasksCompleted}`);
            console.log(`    - averageScore: ${user.averageScore}`);
            console.log(`    - tasksCompletedOnTime: ${user.tasksCompletedOnTime}`);
            console.log(`    - tasksCompletedLate: ${user.tasksCompletedLate}`);
        });
    });
});

req.on('error', (error) => {
    console.error('❌ Connection failed:', error.message);
});

req.end();
