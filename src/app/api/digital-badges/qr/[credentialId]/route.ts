import { NextResponse } from 'next/server';
import { generateBadgeQrSvg, generateBadgeQrBuffer } from '@/lib/digitalBadgeUtils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: Request,
  context: { params: Promise<{ credentialId: string }> | { credentialId: string } }
) {
  try {
    const resolvedParams = await context.params;
    const rawId = resolvedParams?.credentialId;
    if (!rawId) {
      return new NextResponse('Credential ID is required', { status: 400 });
    }

    const cleanId = String(rawId).trim().toUpperCase();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'svg';

    if (format === 'png') {
      const buffer = await generateBadgeQrBuffer(cleanId, 360);
      return new NextResponse(buffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `inline; filename="qr-${cleanId}.png"`,
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }

    const svgString = await generateBadgeQrSvg(cleanId, 360);
    return new NextResponse(svgString, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Content-Disposition': `inline; filename="qr-${cleanId}.svg"`,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err: any) {
    console.error('Error generating badge QR:', err);
    return new NextResponse('Failed to generate badge verification QR', { status: 500 });
  }
}
