import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request?: Request) {
  return NextResponse.json(
    { error: 'Student access to certificates is disabled. Certificates are not issued on this portal.' },
    { status: 403 }
  );
}

export async function POST(request?: Request) {
  return NextResponse.json(
    { error: 'Student access to certificates is disabled. Certificates are not issued on this portal.' },
    { status: 403 }
  );
}

