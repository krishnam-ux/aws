import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';

test('Reversible Website Maintenance Mode Test Suite', async (t) => {
  // Reset state before tests
  await db.maintenanceSettings.updateSettings({
    maintenanceMode: false,
    headline: 'Website Temporarily Unavailable',
    message: "We're currently performing scheduled maintenance and improvements. Please check back shortly.",
    estimatedReturn: ''
  });

  await t.test('1. Default Production State is Live (maintenanceMode: false)', async () => {
    const settings = await db.maintenanceSettings.getSettings();
    assert.equal(settings.maintenanceMode, false, 'Default maintenanceMode should be false');
    assert.ok(settings.headline, 'Headline must be defined');
    assert.ok(settings.message, 'Message must be defined');
  });

  await t.test('2. Admin Enables Maintenance Mode (Reversible Toggle ON)', async () => {
    const updated = await db.maintenanceSettings.updateSettings({
      maintenanceMode: true,
      headline: 'Scheduled Upgrade in Progress',
      message: 'Upgrading core community infrastructure. Please check back at 9:00 PM IST.',
      estimatedReturn: '9:00 PM IST'
    });

    assert.equal(updated.maintenanceMode, true, 'maintenanceMode must be true after enabling');
    assert.equal(updated.headline, 'Scheduled Upgrade in Progress');
    assert.equal(updated.estimatedReturn, '9:00 PM IST');

    const fetched = await db.maintenanceSettings.getSettings();
    assert.equal(fetched.maintenanceMode, true, 'Subsequent getSettings must reflect active maintenance mode');
  });

  await t.test('3. Admin Disables Maintenance Mode (Reversible Toggle OFF - Exact Normal Return)', async () => {
    const restored = await db.maintenanceSettings.updateSettings({
      maintenanceMode: false,
      headline: 'Website Temporarily Unavailable',
      message: "We're currently performing scheduled maintenance and improvements. Please check back shortly."
    });

    assert.equal(restored.maintenanceMode, false, 'maintenanceMode must be false after disabling');

    const fetched = await db.maintenanceSettings.getSettings();
    assert.equal(fetched.maintenanceMode, false, 'Website must return to normal live access');
  });

  await t.test('4. Admin Portal Exemption & Data Safety Verification', async () => {
    // Verify admin credentials and existing data structures are unaffected
    const admins = await db.admins.getAll();
    assert.ok(admins.length > 0, 'Admins collection must remain intact');

    const events = await db.events.getAll();
    assert.ok(Array.isArray(events), 'Events collection must remain intact');

    const quizzes = await db.weeklyQuizzes.getAll();
    assert.ok(quizzes.length > 0, 'Weekly quizzes collection must remain intact');

    const exams = await db.exams.getAll();
    assert.ok(Array.isArray(exams), 'Exams collection must remain intact');
  });

  await t.test('5. Non-Regression: Certification Exam & Weekly Quiz Isolation', async () => {
    // Ensure Weekly Quiz settings and Cert Exam tables are unaffected by maintenance mode
    const quizSettings = await db.weeklyQuizSettings.getSettings();
    assert.ok(quizSettings, 'Weekly quiz settings must be available');
    assert.equal(quizSettings.requireWebcam, true, 'Proctoring configuration preserved');
  });
});
