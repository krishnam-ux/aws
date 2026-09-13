import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSingleFoundingMemberPdf, generateMultipleFoundingMembersPdf } from '@/lib/foundingMemberPdf';
import { FoundingMember } from '@/types/foundingMember';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';
const SIGNING_SECRET = process.env.ADMIN_SESSION_SECRET || 'awssbg-pdf-download-signature-hmac-key-2026';

// Cryptographic short-lived signed download token helpers
export interface SignedDownloadTokenPayload {
  scope: 'single' | 'selected' | 'all';
  targetId?: string;
  exp: number;
  nonce: string;
}

export function generateSignedDownloadToken(scope: 'single' | 'selected' | 'all', targetId: string = ''): string {
  const exp = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload: SignedDownloadTokenPayload = { scope, targetId, exp, nonce };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SIGNING_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifySignedDownloadToken(tokenString: string, requestedScope?: 'single' | 'selected' | 'all', requestedId?: string): boolean {
  try {
    if (!tokenString || !tokenString.includes('.')) return false;
    const [payloadB64, signature] = tokenString.split('.');
    if (!payloadB64 || !signature) return false;

    const expectedSig = crypto.createHmac('sha256', SIGNING_SECRET).update(payloadB64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return false;
    }

    const payload: SignedDownloadTokenPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return false; // Expired
    }

    if (requestedScope && payload.scope && payload.scope !== requestedScope && payload.scope !== 'all') {
      return false;
    }

    if (requestedId && payload.targetId && payload.targetId !== requestedId && payload.scope === 'single') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isAuthorized(request: Request, requestedScope?: 'single' | 'selected' | 'all', requestedId?: string): boolean {
  // 1. Authorization header (Bearer token)
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7).trim() === SECURE_TOKEN) {
    return true;
  }

  // 2. Cookie header
  const cookieHeader = request.headers.get('cookie') || '';
  if (
    cookieHeader.includes(`admin_token=${SECURE_TOKEN}`) ||
    cookieHeader.includes(`adminToken=${SECURE_TOKEN}`)
  ) {
    return true;
  }

  // 3. Short-lived signed download token validation or direct token query parameter
  try {
    const { searchParams } = new URL(request.url);
    const downloadToken = searchParams.get('downloadToken') || searchParams.get('dtoken');
    if (downloadToken && verifySignedDownloadToken(downloadToken, requestedScope, requestedId)) {
      return true;
    }

    const tokenParam =
      searchParams.get('token') ||
      searchParams.get('auth') ||
      searchParams.get('adminToken') ||
      searchParams.get('authToken');

    if (tokenParam) {
      const trimmed = tokenParam.trim();
      if (trimmed === SECURE_TOKEN) {
        return true;
      }
      if (verifySignedDownloadToken(trimmed, requestedScope, requestedId)) {
        return true;
      }
    }
  } catch {}

  return false;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('memberId');
    const all = searchParams.get('all') === 'true';
    const idsParam = searchParams.get('ids');

    const scope: 'single' | 'selected' | 'all' = id ? 'single' : idsParam ? 'selected' : 'all';
    const targetId = id || idsParam || '';

    if (!isAuthorized(request, scope, targetId)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required to download Founding Member PDF dossiers.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const formConfig = await db.foundingMemberFormConfig.getConfig();
    const allMembers: FoundingMember[] = await db.foundingMembers.getAll();

    // 1. Single Member PDF
    if (id) {
      const member =
        allMembers.find((m) => m.id === id || m.memberId === id) || null;

      if (!member) {
        return NextResponse.json(
          { error: `Founding Member not found with ID ${id}` },
          { status: 404, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      const pdfBuffer = await generateSingleFoundingMemberPdf(member, { formConfig });
      const safeName = (member.fullName || member.name || 'member')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase();
      const filename = `FoundingMember_${member.memberId || 'FMB'}_${safeName}.pdf`;

      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    }

    // 2. Selected Members PDF
    if (idsParam) {
      const selectedIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
      const selectedMembers = allMembers.filter(
        (m) => selectedIds.includes(m.id) || selectedIds.includes(m.memberId)
      );

      if (selectedMembers.length === 0) {
        return NextResponse.json(
          { error: 'No matching founding members found for provided IDs.' },
          { status: 404, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      const pdfBuffer = await generateMultipleFoundingMembersPdf(selectedMembers, { formConfig });
      const filename = `FoundingMembers_Selected_${selectedMembers.length}_Profiles.pdf`;

      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    }

    // 3. All Founding Members PDF
    if (all || (!id && !idsParam)) {
      if (allMembers.length === 0) {
        return NextResponse.json(
          { error: 'No founding members found in database.' },
          { status: 404, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      const pdfBuffer = await generateMultipleFoundingMembersPdf(allMembers, { formConfig });
      const filename = `FoundingMembers_All_${allMembers.length}_Profiles.pdf`;

      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
    }

    return NextResponse.json(
      { error: 'Invalid PDF export parameters. Please specify id, ids, or all=true.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    console.error('Error generating founding members PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Error creating PDF document.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = await request.json();
    const { action, memberIds, all, id, ids } = body;

    // Action A: Generate a secure, short-lived signed download token for direct browser navigation
    if (action === 'get_download_token') {
      const scope: 'single' | 'selected' | 'all' = id ? 'single' : (ids || memberIds) ? 'selected' : 'all';
      const targetId = id || (ids ? (Array.isArray(ids) ? ids.join(',') : ids) : (memberIds ? memberIds.join(',') : ''));
      const downloadToken = generateSignedDownloadToken(scope, targetId);

      let downloadUrl = '/api/admin/founding-members/pdf';
      if (scope === 'single') {
        downloadUrl += `?id=${encodeURIComponent(targetId)}&downloadToken=${encodeURIComponent(downloadToken)}`;
      } else if (scope === 'selected') {
        downloadUrl += `?ids=${encodeURIComponent(targetId)}&downloadToken=${encodeURIComponent(downloadToken)}`;
      } else {
        downloadUrl += `?all=true&downloadToken=${encodeURIComponent(downloadToken)}`;
      }

      return NextResponse.json({
        success: true,
        downloadToken,
        downloadUrl,
        expiresInSeconds: 600
      });
    }

    // Action B: Batch PDF Buffer generation via POST body
    const formConfig = await db.foundingMemberFormConfig.getConfig();
    const allMembers: FoundingMember[] = await db.foundingMembers.getAll();

    let targetMembers: FoundingMember[] = [];

    if (all) {
      targetMembers = allMembers;
    } else if (Array.isArray(memberIds) && memberIds.length > 0) {
      targetMembers = allMembers.filter(
        (m) => memberIds.includes(m.id) || memberIds.includes(m.memberId)
      );
    } else {
      return NextResponse.json(
        { error: 'memberIds array or all:true is required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (targetMembers.length === 0) {
      return NextResponse.json(
        { error: 'No matching founding members found.' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const pdfBuffer = await generateMultipleFoundingMembersPdf(targetMembers, { formConfig });
    const filename = `FoundingMembers_${targetMembers.length}_Profiles.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    });
  } catch (err: any) {
    console.error('Error generating batch PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Error creating batch PDF document.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
