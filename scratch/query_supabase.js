async function main() {
  try {
    const res = await fetch('https://ipapi.co/2406:da1a:b00:1302:4b72:1eaf:e8b0:c92b/json/');
    const data = await res.json();
    console.log('IP Location Data:', data);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}
main();
