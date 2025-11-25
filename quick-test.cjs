// Quick system test
const http = require('http');

console.log('🔍 Quick System Test\n');

const API_BASE = 'http://localhost:4000';

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runQuickTest() {
  try {
    console.log('1. Testing server health...');
    const health = await makeRequest('/api/health');
    console.log(`   Status: ${health.status}`, health.body);
    
    console.log('\n2. Testing Cloudinary health...');
    const cloudinary = await makeRequest('/api/cloudinary/health');
    console.log(`   Status: ${cloudinary.status}`, cloudinary.body);
    
    console.log('\n3. Testing task creation with isOverdue field...');
    const taskData = {
      title: 'Test Task',
      description: 'Test',
      assignee_id: 1,
      assigner_id: 2,
      priority: 2,
      deadline: new Date(Date.now() + 86400000).toISOString()
    };
    
    const createResp = await new Promise((resolve, reject) => {
      const url = new URL('/api/tasks', API_BASE);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };
      
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, body: body });
          }
        });
      });
      
      req.on('error', reject);
      req.write(JSON.stringify(taskData));
      req.end();
    });
    
    console.log(`   Status: ${createResp.status}`);
    console.log(`   Task has isOverdue field: ${createResp.body.hasOwnProperty('isOverdue')}`);
    console.log(`   isOverdue value: ${createResp.body.isOverdue}`);
    
    console.log('\n✅ Quick test complete!');
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

runQuickTest();
