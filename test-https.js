
const https = require('https');

https.get('https://api.expo.dev/v2/project/native-modules/versions', (res) => {
  console.log('Status Code:', res.statusCode);
  res.on('data', (d) => {
    // Process data
  });
}).on('error', (e) => {
  console.error('HTTPS Module Error:', e);
});
