import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateDigitalBadgePdfBuffer } from '@/lib/digitalBadgePdf';

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
    const badge = (await db.digitalBadges.getByCredentialId(cleanId)) || (await db.digitalBadges.getById(cleanId));

    if (!badge) {
      return new NextResponse('Digital Badge not found in the official registry.', { status: 404 });
    }

    const pdfBuffer = await generateDigitalBadgePdfBuffer(badge);
    const filename = `Digital-Badge-${badge.credentialId}.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=60'
      }
    });
  } catch (err: any) {
    console.error('Error rendering digital badge PDF:', err);
    return new NextResponse('Failed to generate official PDF credential: ' + (err.message || 'Server error'), {
      status: 500
    });
  }
}
