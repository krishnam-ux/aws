import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return new NextResponse('Missing logo id', { status: 400 });
    }
    
    const logosMap = await db.logos.getMap();
    const base64Data = logosMap[id];
    if (!base64Data) {
      return new NextResponse('Logo not found', { status: 404 });
    }
    
    const matches = base64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches) {
      return new NextResponse('Invalid logo data format', { status: 500 });
    }
    
    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (err) {
    console.error('Error fetching collaboration logo:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
