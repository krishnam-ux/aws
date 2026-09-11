import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_AUTOMATION_SETTINGS } from '@/lib/email/automations';
import { EmailAutomationSetting } from '@/types/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === SECURE_TOKEN) {
    return true;
  }
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader.includes(`admin_token=${SECURE_TOKEN}`)) {
    return true;
  }
  return false;
}

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const savedSettings = await db.emailAutomationSettings.getAll();
    const savedMap = new Map(savedSettings.map((s: any) => [s.eventType, s]));

    const mergedSettings: EmailAutomationSetting[] = DEFAULT_AUTOMATION_SETTINGS.map((defaultSetting) => {
      const saved = savedMap.get(defaultSetting.eventType);
      return saved
        ? {
            ...defaultSetting,
            isEnabled: Boolean(saved.isEnabled),
            updatedAt: saved.updatedAt || defaultSetting.updatedAt
          }
        : defaultSetting;
    });

    return NextResponse.json({ automations: mergedSettings }, { headers: noStoreHeaders });
  } catch (err: any) {
    console.error('Error fetching email automation settings:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch automation settings' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const body = await request.json();
    const { eventType, isEnabled, adminUser = 'admin' } = body;

    if (!eventType || typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Both eventType and boolean isEnabled are required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    await db.emailAutomationSettings.setSetting(eventType, isEnabled, adminUser);

    return NextResponse.json(
      {
        success: true,
        message: `Automation for "${eventType}" updated to ${isEnabled ? 'ENABLED' : 'DISABLED'}.`,
        eventType,
        isEnabled
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error updating email automation setting:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update automation setting' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
