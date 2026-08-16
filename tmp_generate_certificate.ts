import fs from 'node:fs';
import { generateCertificatePdfBuffer } from './src/lib/certificates';

const pdf = await generateCertificatePdfBuffer({ studentName: 'Aarav Dahiya' });
fs.writeFileSync('c:/temp/fixed-certificate-test.pdf', pdf);
console.log('OK', pdf.length);
