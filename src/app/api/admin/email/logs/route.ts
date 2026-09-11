import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { retryFailedEmail } from '@/lib/email';
import { EmailLog } from '@/types/email';

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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const query = (searchParams.get('q') || '').toLowerCase().trim();
    const limit = Number(searchParams.get('limit')) || 100;

    let logs: EmailLog[] = await db.emailLogs.getAll();

    // Filters
    if (status && status !== 'ALL') {
      logs = logs.filter((l) => l.status === status);
    }
    if (type && type !== 'ALL') {
      logs = logs.filter((l) => l.type === type);
    }
    if (query) {
      logs = logs.filter(
        (l) =>
          l.recipient.toLowerCase().includes(query) ||
          l.subject.toLowerCase().includes(query) ||
          (l.recipientName && l.recipientName.toLowerCase().includes(query))
      );
    }

    // Stats
    const totalLogs = await db.emailLogs.getAll();
    const stats = {
      total: totalLogs.length,
      sent: totalLogs.filter((l) => l.status === 'SENT').length,
      failed: totalLogs.filter((l) => l.status === 'FAILED').length,
      simulated: totalLogs.filter((l) => l.status === 'SIMULATED').length
    };

    return NextResponse.json(
      {
        logs: logs.slice(0, limit),
        totalCount: logs.length,
        stats
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error fetching email logs:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch email logs' },
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
    const { action, logId } = body;

    if (action === 'retry' && logId) {
      const retryResult = await retryFailedEmail(logId);
      return NextResponse.json(
        {
          success: retryResult.success,
          message: retryResult.success ? 'Email resent successfully.' : `Retry failed: ${retryResult.error}`,
          result: retryResult
        },
        { headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action or missing logId' },
      { status: 400, headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error retrying email:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to retry email delivery' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('id');

    if (!logId) {
      return NextResponse.json(
        { error: 'Missing log ID to delete.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    await db.emailLogs.deleteById(logId);

    return NextResponse.json(
      { success: true, message: 'Email log deleted.' },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error deleting email log:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete email log' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
