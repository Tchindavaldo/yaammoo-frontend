
async function test() {
  try {
    const res = await fetch('https://api.expo.dev/v2/project/native-modules/versions');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', data.data ? 'Success' : 'Format missing');
  } catch (err) {
    console.error('Fetch failed with error:', err);
    console.error('Stack:', err.stack);
  }
}
test();
