import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const team = await db.coreTeam.getAll();
    const publishedTeam = team
      .filter(m => m.status === 'Published')
      .sort((a, b) => a.displayOrder - b.displayOrder);
    return NextResponse.json(publishedTeam);
  } catch (err) {
    console.error('API Team GET Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
