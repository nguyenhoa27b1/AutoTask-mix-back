const axios = require('axios');

async function simpleTest() {
  try {
    console.log('Testing server connection...');
    const res = await axios.get('http://localhost:4000/api/users');
    console.log('✅ Server is running!');
    console.log('Users:', res.data.length);
  } catch (error) {
    console.error('❌ Server connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
}

simpleTest();
