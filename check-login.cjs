const http = require('http');

const payload = JSON.stringify({ email: 'admin@example.com', password: 'adminpassword' });

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
  timeout: 5000,
};

const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers));
  let data = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('BODY:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('PARSED:', parsed);
    } catch (e) {
      console.error('Failed to parse JSON body');
    }
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

req.write(payload);
req.end();
