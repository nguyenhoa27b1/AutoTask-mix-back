const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:4000/api';

async function testTaskWithFiles() {
  console.log('🧪 Testing Task Creation with Files + Email\n');
  
  try {
    // Step 1: Login
    console.log('Step 1: Login as admin...');
    const loginRes = await axios.post(`${API_BASE}/login`, {
      email: 'admin@example.com',
      password: 'adminpassword'
    });
    console.log(`✅ Logged in as: ${loginRes.data.email}\n`);
    
    // Step 2: Get users
    console.log('Step 2: Getting users...');
    const usersRes = await axios.get(`${API_BASE}/users`);
    const assignee = usersRes.data.find(u => u.role === 'user');
    console.log(`✅ Found assignee: ${assignee.email}\n`);
    
    // Step 3: Create test files
    console.log('Step 3: Creating test files...');
    fs.writeFileSync('test-file-1.txt', 'This is test attachment 1 - Project Requirements\n\nImportant details here...');
    fs.writeFileSync('test-file-2.txt', 'This is test attachment 2 - Design Specifications\n\nDesign notes...');
    console.log('✅ Created test files\n');
    
    // Step 4: Create task with files
    console.log('Step 4: Creating task with files (uploading to Cloudinary)...');
    
    const formData = new FormData();
    formData.append('title', 'Complete Q4 Marketing Campaign');
    formData.append('description', 'Please review attached files and complete the marketing campaign for Q4.');
    formData.append('assignee_id', assignee.user_id);
    formData.append('assigner_id', loginRes.data.user_id);
    formData.append('priority', '2');
    
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 3);
    formData.append('deadline', deadline.toISOString());
    
    formData.append('attachments', fs.createReadStream('test-file-1.txt'));
    formData.append('attachments', fs.createReadStream('test-file-2.txt'));
    
    const taskRes = await axios.post(`${API_BASE}/tasks`, formData, {
      headers: formData.getHeaders()
    });
    
    console.log('✅ Task created successfully!');
    console.log(`   Task ID: ${taskRes.data.id_task}`);
    console.log(`   Title: ${taskRes.data.title}`);
    console.log(`   Status: ${taskRes.data.status}`);
    console.log(`   Files attached: ${taskRes.data.attachment_ids?.length || 0}\n`);
    
    console.log('📧 Email notification sent to:', assignee.email);
    console.log('   Check the email inbox for task assignment!\n');
    
    // Get file details
    if (taskRes.data.attachment_ids && taskRes.data.attachment_ids.length > 0) {
      console.log('📎 Uploaded files (on Cloudinary):');
      const filesRes = await axios.get(`${API_BASE}/files`);
      
      taskRes.data.attachment_ids.forEach(fileId => {
        const file = filesRes.data.find(f => f.id_file === fileId);
        if (file) {
          console.log(`   - ${file.name}`);
          console.log(`     ${file.url}\n`);
        }
      });
    }
    
    // Cleanup
    fs.unlinkSync('test-file-1.txt');
    fs.unlinkSync('test-file-2.txt');
    
    console.log('✅ Test completed successfully!');
    console.log(`📧 Check email inbox: ${assignee.email}`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testTaskWithFiles();
