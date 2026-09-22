import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateSEBConfigXml } from '../src/lib/exam';
import { Exam } from '../src/types/exam';

const sampleExam: Exam = {
  id: 'cert-exam-aws-cloud-2026',
  examCode: 'AWS-CCP-2026',
  title: 'AWS Certified Cloud Practitioner Official Exam',
  description: 'Proctored Certification Session',
  category: 'Cloud Practitioner',
  durationMinutes: 60,
  passingPercentage: 70,
  maxAttempts: 1,
  status: 'Published',
  requireSecureBrowser: true,
  maxSecurityViolations: 3,
  questions: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

describe('Safe Exam Browser (SEB) 3.10.2 Session Startup & Schema Regression Suite', () => {
  const siteUrl = 'https://www.awssbgcuup.tech';
  const xml = generateSEBConfigXml(sampleExam, siteUrl);

  test('1. Valid XML format with no unescaped entities', () => {
    // Assert DOCTYPE and plist structure
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">'));
    assert.ok(xml.includes('<plist version="1.0">'));
    assert.ok(xml.endsWith('</plist>'));

    // Check that no bare unescaped ampersands exist
    const bareAmpersand = /&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml);
    assert.equal(bareAmpersand, false, 'XML must not contain unescaped ampersands');
  });

  test('2. Strict separation of startURL and quitURL (prevents instant shutdown)', () => {
    const startUrlMatch = xml.match(/<key>startURL<\/key>\s*<string>([^<]+)<\/string>/);
    const quitUrlMatch = xml.match(/<key>quitURL<\/key>\s*<string>([^<]+)<\/string>/);

    assert.ok(startUrlMatch, 'startURL must exist');
    assert.ok(quitUrlMatch, 'quitURL must exist');

    const startUrl = startUrlMatch[1];
    const quitUrl = quitUrlMatch[1];

    assert.equal(startUrl, 'https://www.awssbgcuup.tech/exam');
    assert.equal(quitUrl, 'https://www.awssbgcuup.tech/exam/quit');
    assert.notEqual(startUrl, quitUrl, 'startURL and quitURL must be strictly distinct');
  });

  test('3. Explicit SEB 3.10.2 Exam Mode and Clean Termination Settings', () => {
    assert.ok(xml.includes('<key>originatorVersion</key>\n    <string>SEB_Win_3.10.2</string>'));
    assert.ok(xml.includes('<key>sebConfigPurpose</key>\n    <integer>0</integer>'));
    assert.ok(xml.includes('<key>sebMode</key>\n    <integer>0</integer>'));
    assert.ok(xml.includes('<key>quitURLConfirm</key>\n    <false/>'));
    assert.ok(xml.includes('<key>allowQuit</key>\n    <true/>'));
  });

  test('4. Prohibited processes include OS mapping (os=1) and AutoTerminate (strongKill=true)', () => {
    assert.ok(xml.includes('<key>prohibitedProcesses</key>'));

    // Count os and strongKill entries
    const osMatches = xml.match(/<key>os<\/key>\s*<integer>1<\/integer>/g) || [];
    const strongKillMatches = xml.match(/<key>strongKill<\/key>\s*<true\/>/g) || [];

    assert.ok(osMatches.length >= 10, 'All prohibited processes must explicitly declare os=1 for Windows mapping');
    assert.ok(strongKillMatches.length >= 10, 'All prohibited processes must set strongKill=true to prevent startup prompt failure');

    // Verify key prohibited processes are included
    const requiredApps = [
      'Discord.exe',
      'AnyDesk.exe',
      'TeamViewer.exe',
      'obs64.exe',
      'Zoom.exe',
      'WhatsApp.exe',
      'Telegram.exe',
      'ms-teams.exe',
      'Teams.exe',
      'slack.exe',
      'Skype.exe'
    ];

    for (const app of requiredApps) {
      assert.ok(xml.includes(`<string>${app}</string>`), `Prohibited processes must include ${app}`);
    }
  });

  test('5. Rejects legacy and unsupported configuration keys', () => {
    // allowPreferencesWindow is SEB 2 legacy, not supported in SEB 3
    assert.ok(!xml.includes('allowPreferencesWindow'), 'allowPreferencesWindow must not be present');
    // browserExamKey header string is SEB 2 legacy (SEB 3 uses sendBrowserExamKey)
    assert.ok(!xml.includes('browserExamKey'), 'browserExamKey must not be present');
  });

  test('6. Complete Kiosk Lockdown Settings', () => {
    const lockdownKeys = [
      'allowDeveloperConsole',
      'allowSpellCheck',
      'allowVirtualMachine',
      'allowWlan',
      'enableAltEsc',
      'enableAltF4',
      'enableAltTab',
      'enableCtrlEsc',
      'enableF1',
      'enableF2',
      'enableF3',
      'enableF4',
      'enableF5',
      'enableF6',
      'enableF7',
      'enableF8',
      'enableF9',
      'enableF10',
      'enableF11',
      'enableF12',
      'enablePrintScreen',
      'enableRightMouse'
    ];

    for (const k of lockdownKeys) {
      assert.ok(xml.includes(`<key>${k}</key>\n    <false/>`), `${k} must be disabled in XML`);
    }
  });

  test('7. URL Filter Rules allow required application routes and assets', () => {
    assert.ok(xml.includes('<key>URLFilterEnable</key>\n    <true/>'));
    assert.ok(xml.includes('<key>URLFilterEnableContentFilter</key>\n    <false/>'));
    assert.ok(xml.includes('<string>https://www.awssbgcuup.tech/*</string>'));
    assert.ok(xml.includes('<string>https://fonts.googleapis.com/*</string>'));
    assert.ok(xml.includes('<string>https://fonts.gstatic.com/*</string>'));
  });
});
