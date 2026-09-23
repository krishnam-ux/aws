import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateQrCodeDataUrl, getVerificationUrl } from '@/lib/digitalIdUtils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noStoreHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
};

export async function GET(
  request: Request,
  context: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await context.params;
    if (!publicId) {
      return NextResponse.json({ error: 'Missing publicId.' }, { status: 400, headers: noStoreHeaders });
    }

    const cleanId = String(publicId).trim().toUpperCase();
    const identity = await db.digitalIdentities.getByPublicId(cleanId);

    if (!identity) {
      return NextResponse.json(
        { error: 'Digital ID not found.' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    const qrDataUrl = await generateQrCodeDataUrl(identity.publicId);
    const verificationUrl = getVerificationUrl(identity.publicId);

    return NextResponse.json(
      {
        identity,
        qrDataUrl,
        verificationUrl
      },
      { headers: noStoreHeaders }
    );
  } catch (err: any) {
    console.error('Error in /api/digital-ids/card/[publicId]:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch card data.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
