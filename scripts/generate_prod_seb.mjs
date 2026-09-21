import fs from 'fs';
import path from 'path';
import { generateSEBConfigXml } from '../src/lib/exam.js';
import { db } from '../src/lib/db.js';

const exams = await db.exams.getAll();
const exam = exams[0] || {
  id: 'aws-ccp-cert-2026',
  examCode: 'AWS-CCP-01',
  title: 'AWS Certified Cloud Practitioner Unit Assessment'
};

const siteUrl = 'https://www.awssbgcuup.tech';
const sebXml = generateSEBConfigXml(exam, siteUrl);

const outputPath = path.resolve('fresh_certification_exam.seb');
fs.writeFileSync(outputPath, sebXml, 'utf-8');

console.log('Fresh .seb written to:', outputPath);
console.log('--- SEB XML CONTENT (First 35 lines) ---');
console.log(sebXml.split('\n').slice(0, 35).join('\n'));
console.log('--- SEB URL FILTER RULES ---');
const rulesMatch = sebXml.match(/<key>URLFilterRules<\/key>[\s\S]*?<\/array>/);
if (rulesMatch) {
  console.log(rulesMatch[0]);
}
