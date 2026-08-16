import fs from 'node:fs';
import path from 'node:path';
import { generateCertificatePdfBuffer } from '../src/lib/certificates';

async function main() {
  const names = ['Aarav Sharma', 'Ananya Priya Nair', 'Samantha Alexanian-Rivera'];

  for (const name of names) {
    const buffer = await generateCertificatePdfBuffer({ studentName: name });
    const fileName = `${name.replace(/[^a-zA-Z0-9]+/g, '-')}.pdf`;
    const out = path.join(process.cwd(), 'tmp-cert', fileName);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buffer);
    console.log(`WROTE ${out} (${buffer.length} bytes)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
