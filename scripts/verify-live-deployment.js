async function probe() {
  console.log('=== PROBING LIVE PRODUCTION DOMAIN: https://www.awssbgcuup.tech ===\n');

  try {
    const r1 = await fetch('https://www.awssbgcuup.tech/api/exam/status', {
      headers: { 'Cache-Control': 'no-cache' }
    });
    console.log('1. GET /api/exam/status:');
    console.log('   HTTP Status:', r1.status);
    console.log('   Age / Date:', r1.headers.get('date'), '| Vercel ID:', r1.headers.get('x-vercel-id'));
    const t1 = await r1.text();
    console.log('   Body:', t1);
  } catch (e) {
    console.log('1. GET /api/exam/status Error:', e.message);
  }

  try {
    const r2 = await fetch('https://www.awssbgcuup.tech/exam', {
      headers: { 'Cache-Control': 'no-cache' }
    });
    console.log('\n2. GET /exam:');
    console.log('   HTTP Status:', r2.status);
    console.log('   Age / Date:', r2.headers.get('date'), '| Vercel ID:', r2.headers.get('x-vercel-id'));
    const t2 = await r2.text();
    console.log('   Body snippet (first 300 chars):', t2.slice(0, 300).replace(/\s+/g, ' '));
  } catch (e) {
    console.log('\n2. GET /exam Error:', e.message);
  }
}

probe();
