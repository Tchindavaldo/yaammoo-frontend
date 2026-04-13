
const net = require('net');
const socket = net.createConnection({ port: 443, host: '104.18.4.104' }, () => {
  console.log('Connected!');
  console.log('Local address:', socket.localAddress);
  console.log('Remote address:', socket.remoteAddress);
  socket.end();
});
socket.on('error', (err) => {
  console.error('Socket error:', err);
});
