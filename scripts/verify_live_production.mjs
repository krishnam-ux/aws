import fs from 'fs';

async function verifyLiveProduction() {
  const examId = 'exam-admin-lock-flow-1790011523166';
  const url = `https://www.awssbgcuup.tech/api/exam/seb-config?examId=${examId}`;
  console.log('Fetching live production SEB config from:', url);

  try {
    const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
    console.log('Status Code:', res.status);
    console.log('Content-Type:', res.headers.get('Content-Type'));
    console.log('Cache-Control:', res.headers.get('Cache-Control'));

    const text = await res.text();
    console.log('Length of response:', text.length, 'bytes');

    // Save live downloaded .seb to file
    fs.writeFileSync('live_downloaded_production.seb', text, 'utf-8');

    // Checks
    const startUrlMatch = text.includes('<key>startURL</key>\n    <string>https://www.awssbgcuup.tech/exam</string>') ||
                          text.includes('<key>startURL</key>\r\n    <string>https://www.awssbgcuup.tech/exam</string>');
    console.log('Start URL matches https://www.awssbgcuup.tech/exam:', startUrlMatch);

    const oldBlockMatch = text.includes('<string>*</string>') && text.includes('<integer>0</integer>');
    console.log('Old wildcard block rule (*) present:', oldBlockMatch);

    const allowsAwssbg = text.includes('<string>https://www.awssbgcuup.tech/*</string>');
    console.log('Allows https://www.awssbgcuup.tech/*:', allowsAwssbg);

    const allowsFonts = text.includes('<string>https://fonts.googleapis.com/*</string>');
    console.log('Allows Google Fonts:', allowsFonts);

    console.log('\n--- EXTRACTED URL FILTER RULES ---');
    const rulesMatch = text.match(/<key>URLFilterRules<\/key>[\s\S]*?<\/array>/);
    if (rulesMatch) {
      console.log(rulesMatch[0]);
    }
  } catch (err) {
    console.error('Error fetching live config:', err);
  }
}

verifyLiveProduction();
