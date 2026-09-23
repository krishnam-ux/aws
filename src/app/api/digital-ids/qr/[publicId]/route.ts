import { NextResponse } from 'next/server';
import { generateQrCodeSvg, generateQrCodeDataUrl } from '@/lib/digitalIdUtils';
import QRCode from 'qrcode';
import { getVerificationUrl } from '@/lib/digitalIdUtils';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await context.params;
    if (!publicId) {
      return NextResponse.json({ error: 'Missing publicId.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'png';
    const cleanId = String(publicId).trim().toUpperCase();
    const targetUrl = getVerificationUrl(cleanId);

    if (format === 'svg') {
      const svg = await QRCode.toString(targetUrl, {
        type: 'svg',
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 400,
        color: {
          dark: '#081A2A',
          light: '#FFFFFF'
        }
      });

      return new NextResponse(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `inline; filename="qr-${cleanId}.svg"`,
          'Cache-Control': 'public, max-age=86400, immutable'
        }
      });
    }

    // Default PNG buffer
    const buffer = await QRCode.toBuffer(targetUrl, {
      type: 'png',
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 400,
      color: {
        dark: '#081A2A',
        light: '#FFFFFF'
      }
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="qr-${cleanId}.png"`,
        'Cache-Control': 'public, max-age=86400, immutable'
      }
    });
  } catch (err: any) {
    console.error('Error in /api/digital-ids/qr/[publicId]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate QR code.' },
      { status: 500 }
    );
  }
}
