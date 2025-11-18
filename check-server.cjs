const http = require('http');
const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/users',
  method: 'GET',
  timeout: 3000,
};

const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers));
  let data = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('BODY:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('ERROR:', e.message);
  console.error('FULL ERROR:', e);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('ERROR: request timed out');
  req.destroy();
});

req.end();
