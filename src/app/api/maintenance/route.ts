import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await db.maintenanceSettings.getSettings();
    return NextResponse.json(
      {
        success: true,
        maintenanceMode: Boolean(settings.maintenanceMode),
        headline: settings.headline || 'Website Temporarily Unavailable',
        message:
          settings.message ||
          "We're currently performing scheduled maintenance and improvements. Please check back shortly.",
        estimatedReturn: settings.estimatedReturn || '',
        updatedAt: settings.updatedAt || new Date().toISOString()
      },
      {
        status: settings.maintenanceMode ? 503 : 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          ...(settings.maintenanceMode ? { 'Retry-After': '3600' } : {})
        }
      }
    );
  } catch (error: any) {
    console.error('Public maintenance status check error:', error);
    return NextResponse.json(
      {
        success: true,
        maintenanceMode: false,
        headline: 'Website Temporarily Unavailable',
        message: "We're currently performing scheduled maintenance and improvements."
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      }
    );
  }
}
