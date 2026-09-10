import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return new NextResponse('Missing photo id parameter', { status: 400 });
    }

    const photo = await db.eventPhotos.get(id);
    if (!photo || !photo.data) {
      return new NextResponse('Photo not found', { status: 404 });
    }

    let contentType = photo.mimeType || 'image/jpeg';
    let base64String = photo.data;

    // Handle data URL prefix if present
    const dataUrlMatch = photo.data.match(/^data:([a-zA-Z0-9\/\-+.]+);base64,(.+)$/);
    if (dataUrlMatch) {
      contentType = dataUrlMatch[1] || contentType;
      base64String = dataUrlMatch[2];
    }

    const buffer = Buffer.from(base64String, 'base64');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': buffer.length.toString()
      }
    });
  } catch (err) {
    console.error('Error serving event photo:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
