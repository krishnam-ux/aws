import fs from 'fs';
import path from 'path';
import { generateCertificatePdfBuffer } from '../src/lib/certificates';

const commonPayload = {
  certificateId: 'AWS-SBG-CUUP-2026-987654',
  verificationUrl: 'https://www.awssbgcuup.tech/verify-certificate/AWS-SBG-CUUP-2026-987654',
  eventDate: '2026-08-20',
  venue: 'Chandigarh University – Uttar Pradesh'
};

async function run() {
  const outputDir = path.join(process.cwd(), 'tests', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Short student name
  const pdf1 = await generateCertificatePdfBuffer({
    ...commonPayload,
    studentName: 'Abhay Kumar',
    eventName: 'AWS Cloud Day',
    description: 'For outstanding achievement in a local AWS Student Builder Group'
  });
  fs.writeFileSync(path.join(outputDir, 'test-short-name.pdf'), pdf1);
  console.log('Generated: test-short-name.pdf');

  // 2. Long student name
  const pdf2 = await generateCertificatePdfBuffer({
    ...commonPayload,
    studentName: 'Sri Srimad Bhaktivedanta Narayana Gosvami Maharaja',
    eventName: 'AWS Cloud Day',
    description: 'For outstanding achievement in a local AWS Student Builder Group'
  });
  fs.writeFileSync(path.join(outputDir, 'test-long-name.pdf'), pdf2);
  console.log('Generated: test-long-name.pdf');

  // 3. Long achievement title
  const pdf3 = await generateCertificatePdfBuffer({
    ...commonPayload,
    studentName: 'Abhay Kumar',
    eventName: 'AWS Certified Student Builder Group Founding Core Member Leader Specialist',
    description: 'For outstanding achievement in a local AWS Student Builder Group'
  });
  fs.writeFileSync(path.join(outputDir, 'test-long-title.pdf'), pdf3);
  console.log('Generated: test-long-title.pdf');

  // 4. Long description
  const pdf4 = await generateCertificatePdfBuffer({
    ...commonPayload,
    studentName: 'Abhay Kumar',
    eventName: 'AWS Cloud Day',
    description: 'For outstanding performance and extraordinary dedication in coordinating AWS cloud computing events, workshops, student community outreach programs, and university association administration.'
  });
  fs.writeFileSync(path.join(outputDir, 'test-long-description.pdf'), pdf4);
  console.log('Generated: test-long-description.pdf');

  console.log('All 4 test certificates generated successfully inside tests/output/');
}

run().catch(console.error);
