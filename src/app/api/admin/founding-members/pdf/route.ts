import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSingleFoundingMemberPdf, generateMultipleFoundingMembersPdf } from '@/lib/foundingMemberPdf';
import { FoundingMember } from '@/types/foundingMember';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ') && authHeader.substring(7) === SECURE_TOKEN) {
    return true;
  }
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader.includes(`admin_token=${SECURE_TOKEN}`)) {
    return true;
  }
  return false;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || searchParams.get('memberId');
    const all = searchParams.get('all') === 'true';
    const idsParam = searchParams.get('ids');

    const formConfig = await db.foundingMemberFormConfig.getConfig();
    const allMembers: FoundingMember[] = await db.foundingMembers.getAll();

    // 1. Single Member PDF
    if (id) {
      const member =
        allMembers.find((m) => m.id === id || m.memberId === id) || null;

      if (!member) {
        return NextResponse.json({ error: 'Founding Member not found' }, { status: 404 });
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
          'Cache-Control': 'no-store'
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
        return NextResponse.json({ error: 'No matching founding members found' }, { status: 404 });
      }

      const pdfBuffer = await generateMultipleFoundingMembersPdf(selectedMembers, { formConfig });
      const filename = `FoundingMembers_Selected_${selectedMembers.length}_Profiles.pdf`;

      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store'
        }
      });
    }

    // 3. All Founding Members PDF
    if (all || (!id && !idsParam)) {
      if (allMembers.length === 0) {
        return NextResponse.json({ error: 'No founding members found in database' }, { status: 404 });
      }

      const pdfBuffer = await generateMultipleFoundingMembersPdf(allMembers, { formConfig });
      const filename = `FoundingMembers_All_${allMembers.length}_Profiles.pdf`;

      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store'
        }
      });
    }

    return NextResponse.json({ error: 'Invalid PDF export parameters' }, { status: 400 });
  } catch (err: any) {
    console.error('Error generating founding members PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Error creating PDF document' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { memberIds, all } = body;

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
      return NextResponse.json({ error: 'memberIds array or all:true is required' }, { status: 400 });
    }

    if (targetMembers.length === 0) {
      return NextResponse.json({ error: 'No matching founding members found' }, { status: 404 });
    }

    const pdfBuffer = await generateMultipleFoundingMembersPdf(targetMembers, { formConfig });
    const filename = `FoundingMembers_${targetMembers.length}_Profiles.pdf`;

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: any) {
    console.error('Error generating batch PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Error creating batch PDF document' },
      { status: 500 }
    );
  }
}
