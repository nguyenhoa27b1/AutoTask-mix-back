const net = require('net');
const host = '127.0.0.1';
const port = 4000;

const socket = new net.Socket();
let connected = false;

socket.setTimeout(3000);

socket.on('connect', () => {
  connected = true;
  console.log('TCP CONNECTED to', host+':'+port);
  socket.end();
});

socket.on('timeout', () => {
  console.error('TCP timeout');
  socket.destroy();
});

socket.on('error', (err) => {
  console.error('TCP ERROR:', err && err.code, err && err.message);
});

socket.on('close', (hadError) => {
  console.log('TCP CLOSED', hadError ? 'with error' : 'clean');
  process.exit(connected ? 0 : 1);
});

socket.connect(port, host);
