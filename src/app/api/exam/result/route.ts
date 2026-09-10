import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request?: Request) {
  return NextResponse.json(
    { error: 'Student access to results is disabled. Results are communicated exclusively by email.' },
    { status: 403 }
  );
}

export async function POST(request?: Request) {
  return NextResponse.json(
    { error: 'Student access to results is disabled. Results are communicated exclusively by email.' },
    { status: 403 }
  );
}
