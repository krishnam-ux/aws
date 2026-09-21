import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateSEBConfigXml } from '../src/lib/exam';
import { Exam } from '../src/types/exam';

const mockExam: Exam = {
  id: 'cert-exam-aws-saa-2026',
  examCode: 'AWS-SAA-C03',
  title: 'AWS Certified Solutions Architect – Associate Certification Exam',
  description: 'Official Certification Assessment Session',
  category: 'Solutions Architect',
  durationMinutes: 90,
  passingPercentage: 72,
  maxAttempts: 1,
  status: 'Published',
  requireSecureBrowser: true,
  maxSecurityViolations: 3,
  questions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('Certification Exam Safe Exam Browser (.seb) Configuration Security Tests', () => {
  const prodSiteUrl = 'https://www.awssbgcuup.tech';
  const xml = generateSEBConfigXml(mockExam, prodSiteUrl);

  test('1. Start URL points to exact production Certification Exam route /exam', () => {
    assert.ok(xml.includes('<key>startURL</key>'));
    assert.ok(xml.includes(`<string>${prodSiteUrl}/exam</string>`));
    assert.ok(!xml.includes(`<string>${prodSiteUrl}/exam/${mockExam.id}</string>`));
  });

  test('2. Quit URL is properly set to distinct quit route /exam/quit', () => {
    assert.ok(xml.includes('<key>quitURL</key>'));
    assert.ok(xml.includes(`<string>${prodSiteUrl}/exam/quit</string>`));
    assert.ok(!xml.includes(`<key>quitURL</key>\n    <string>${prodSiteUrl}/exam</string>`));
  });

  test('3. URL Filter is enabled and content filter is configured', () => {
    assert.ok(xml.includes('<key>URLFilterEnable</key>'));
    assert.ok(xml.includes('<key>URLFilterRules</key>'));
  });

  test('4. Required production domains and assets are explicitly allowed with action = 1', () => {
    // www.awssbgcuup.tech
    assert.ok(xml.includes('<string>https://www.awssbgcuup.tech/*</string>'));
    assert.ok(xml.includes('<string>https://www.awssbgcuup.tech</string>'));
    // apex domain
    assert.ok(xml.includes('<string>https://awssbgcuup.tech/*</string>'));
    assert.ok(xml.includes('<string>https://awssbgcuup.tech</string>'));
    // subdomains
    assert.ok(xml.includes('<string>*.awssbgcuup.tech/*</string>'));
    // Google fonts assets
    assert.ok(xml.includes('<string>https://fonts.googleapis.com/*</string>'));
    assert.ok(xml.includes('<string>https://fonts.gstatic.com/*</string>'));
  });

  test('5. Conflicting catch-all block rule (*) is REMOVED to prevent "Page Access Is Blocked"', () => {
    // In plist, action 0 is Block. There should not be any expression '*' with action 0.
    const hasWildcardBlock = xml.includes('<string>*</string>') && xml.includes('<integer>0</integer>');
    assert.equal(hasWildcardBlock, false, 'Global wildcard block rule must not exist in SEB plist');
  });

  test('6. SEB Lockdown, Anti-tampering, and Kiosk security settings are strictly preserved', () => {
    assert.ok(xml.includes('<key>allowDeveloperConsole</key>\n    <false/>'));
    assert.ok(xml.includes('<key>allowPreferencesWindow</key>\n    <false/>'));
    assert.ok(xml.includes('<key>allowSpellCheck</key>\n    <false/>'));
    assert.ok(xml.includes('<key>allowVirtualMachine</key>\n    <false/>'));
    assert.ok(xml.includes('<key>enableAltEsc</key>\n    <false/>'));
    assert.ok(xml.includes('<key>enableAltF4</key>\n    <false/>'));
    assert.ok(xml.includes('<key>enableAltTab</key>\n    <false/>'));
    assert.ok(xml.includes('<key>enableCtrlEsc</key>\n    <false/>'));
    assert.ok(xml.includes('<key>enablePrintScreen</key>\n    <false/>'));
    assert.ok(xml.includes('<key>enableRightMouse</key>\n    <false/>'));
  });

  test('7. Prohibited processes (communication, screen sharing, recording) are locked down', () => {
    assert.ok(xml.includes('<key>prohibitedProcesses</key>'));
    assert.ok(xml.includes('<string>Discord.exe</string>'));
    assert.ok(xml.includes('<string>AnyDesk.exe</string>'));
    assert.ok(xml.includes('<string>TeamViewer.exe</string>'));
    assert.ok(xml.includes('<string>obs64.exe</string>'));
    assert.ok(xml.includes('<string>Zoom.exe</string>'));
    assert.ok(xml.includes('<string>WhatsApp.exe</string>'));
    assert.ok(xml.includes('<string>Telegram.exe</string>'));
  });
});
