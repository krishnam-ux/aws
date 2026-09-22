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

  test('2. Quit URL is properly set to distinct quit route /exam/quit (startURL !== quitURL)', () => {
    assert.ok(xml.includes('<key>quitURL</key>'));
    assert.ok(xml.includes(`<string>${prodSiteUrl}/exam/quit</string>`));
    assert.ok(!xml.includes(`<key>quitURL</key>\n    <string>${prodSiteUrl}/exam</string>`));
    assert.notEqual(`${prodSiteUrl}/exam`, `${prodSiteUrl}/exam/quit`);
  });

  test('3. Configuration purpose and session mode are explicitly set for SEB 3.10.2 Exam Mode', () => {
    assert.ok(xml.includes('<key>sebConfigPurpose</key>\n    <integer>0</integer>'));
    assert.ok(xml.includes('<key>sebMode</key>\n    <integer>0</integer>'));
    assert.ok(xml.includes('<key>quitURLConfirm</key>\n    <false/>'));
    assert.ok(xml.includes('<key>originatorVersion</key>\n    <string>SEB_Win_3.10.2</string>'));
  });

  test('4. URL Filter is enabled and content filter is configured', () => {
    assert.ok(xml.includes('<key>URLFilterEnable</key>'));
    assert.ok(xml.includes('<key>URLFilterRules</key>'));
  });

  test('5. Required production domains and assets are explicitly allowed with action = 1', () => {
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

  test('6. Conflicting catch-all block rule (*) is REMOVED to prevent "Page Access Is Blocked"', () => {
    const hasWildcardBlock = xml.includes('<string>*</string>') && xml.includes('<integer>0</integer>');
    assert.equal(hasWildcardBlock, false, 'Global wildcard block rule must not exist in SEB plist');
  });

  test('7. SEB Lockdown, Anti-tampering, and Kiosk security settings are strictly preserved', () => {
    assert.ok(xml.includes('<key>allowDeveloperConsole</key>\n    <false/>'));
    assert.ok(xml.includes('<key>allowSpellCheck</key>\n    <false/>'));
    assert.ok(xml.includes('<key>allowVirtualMachine</key>\n    <false/>'));
    assert.ok(xml.includes('<key>allowWlan</key>\n    <false/>'));
    assert.ok(xml.includes('<key>enableAltEsc</key>\n    <false/>'));
    assert.ok(xml.includes('<key>enableAltF4</key>\n    <false/>'));
    assert.ok(xml.includes('<key>enableAltTab</key>\n    <false/>'));
    assert.ok(xml.includes('<key>enableCtrlEsc</key>\n    <false/>'));
    assert.ok(xml.includes('<key>enablePrintScreen</key>\n    <false/>'));
    assert.ok(xml.includes('<key>enableRightMouse</key>\n    <false/>'));
  });

  test('8. Unsupported legacy keys (allowPreferencesWindow, browserExamKey) are omitted from SEB 3 schema', () => {
    assert.ok(!xml.includes('<key>allowPreferencesWindow</key>'));
    assert.ok(!xml.includes('<key>browserExamKey</key>'));
  });

  test('9. Prohibited processes include Windows OS mapping (os=1) and auto-termination (strongKill=true) to prevent session startup abort', () => {
    assert.ok(xml.includes('<key>prohibitedProcesses</key>'));
    assert.ok(xml.includes('<key>os</key>\n            <integer>1</integer>'));
    assert.ok(xml.includes('<key>strongKill</key>\n            <true/>'));
    assert.ok(xml.includes('<string>Discord.exe</string>'));
    assert.ok(xml.includes('<string>AnyDesk.exe</string>'));
    assert.ok(xml.includes('<string>TeamViewer.exe</string>'));
    assert.ok(xml.includes('<string>obs64.exe</string>'));
    assert.ok(xml.includes('<string>Zoom.exe</string>'));
    assert.ok(xml.includes('<string>WhatsApp.exe</string>'));
    assert.ok(xml.includes('<string>Telegram.exe</string>'));
    assert.ok(xml.includes('<string>ms-teams.exe</string>'));
    assert.ok(xml.includes('<string>Teams.exe</string>'));
    assert.ok(xml.includes('<string>slack.exe</string>'));
    assert.ok(xml.includes('<string>Skype.exe</string>'));
  });
});

