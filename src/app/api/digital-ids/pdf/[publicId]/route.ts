import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateDigitalIdPdfBuffer } from '@/lib/digitalIdPdf';

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

    const cleanId = String(publicId).trim().toUpperCase();
    const identity = await db.digitalIdentities.getByPublicId(cleanId);

    if (!identity) {
      return NextResponse.json({ error: 'Digital ID not found.' }, { status: 404 });
    }

    const pdfBuffer = await generateDigitalIdPdfBuffer(identity);

    const filename = `DigitalID-${identity.publicId}-${identity.fullName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    console.error('Error generating Digital ID PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate PDF.' },
      { status: 500 }
    );
  }
}
