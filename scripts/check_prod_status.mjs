async function checkProdStatus() {
  try {
    const res = await fetch('https://www.awssbgcuup.tech/api/exam/status');
    const data = await res.json();
    console.log('Production /api/exam/status:', data);
  } catch (err) {
    console.error(err);
  }
}
checkProdStatus();
