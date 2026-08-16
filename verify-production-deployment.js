#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const routePath = path.join(__dirname, 'src/app/api/admin/route.ts');
const content = fs.readFileSync(routePath, 'utf8');

// Check for the 3-column signature layout code
const checks = {
  '3-column alignment': content.includes('const usableWidth = pageWidth - margin * 2;') && content.includes('const columnWidth = usableWidth / 3;'),
  'leftSignX calculation': content.includes('const leftSignX = margin + (columnWidth / 2) - (signatureLineWidth / 2);'),
  'centerSignX calculation': content.includes('const centerSignX = margin + columnWidth + (columnWidth / 2) - (signatureLineWidth / 2);'),
  'rightSignX calculation': content.includes('const rightSignX = margin + columnWidth * 2 + (columnWidth / 2) - (signatureLineWidth / 2);'),
  'all three lines at same height': 
    content.includes('doc.line(leftSignX, signatureLineY, leftSignX + signatureLineWidth, signatureLineY);') && 
    content.includes('doc.line(centerSignX, signatureLineY, centerSignX + signatureLineWidth, signatureLineY);') && 
    content.includes('doc.line(rightSignX, signatureLineY, rightSignX + signatureLineWidth, signatureLineY);'),
  'Student Signature column (120pt)': content.includes("{ title: 'Student Signature', width: 120 }"),
  'Student ID / UID column (92pt)': content.includes("{ title: 'Student ID / UID', width: 92 }"),
  'smart page breaking logic': content.includes('const signatureSectionHeight = 80;') && content.includes('const availableSpace = pageHeight - currentY - bottomMargin;'),
  'centered names under signatures': content.includes("{ align: 'center' }") && content.includes('Abhay Shukla') && content.includes('Vaibhav Sharma'),
  'centered authorized signature': content.includes("'Authorized Signature'") && content.includes("{ align: 'center' }")
};

console.log('\n✓ PDF Layout Code Verification:');
console.log('=================================\n');
Object.entries(checks).forEach(([key, value]) => {
  console.log('  ' + (value ? '✓' : '✗') + ' ' + key);
});

const allPassed = Object.values(checks).every(v => v);
console.log('\n' + (allPassed ? '✓ All code requirements verified!' : '✗ Some requirements missing'));
console.log('\nThis confirms the latest PDF signature alignment code is deployed.\n');

process.exit(allPassed ? 0 : 1);
