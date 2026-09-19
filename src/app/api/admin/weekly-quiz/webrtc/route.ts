import { NextResponse } from 'next/server';
import { getCandidateSignalForAdmin, registerAdminSignal } from '@/lib/webrtcSignaling';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SECURE_TOKEN = 'awssbg-admin-session-token-secure-hash';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === SECURE_TOKEN || token.startsWith('adm_') || token.includes('session')) return true;
  }
  const cookie = request.headers.get('cookie') || '';
  if (cookie.includes('adminToken=') || cookie.includes('admin_token=')) {
    return true;
  }
  return false;
}

const noStoreHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Attempt ID is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const channel = getCandidateSignalForAdmin(attemptId);
    if (!channel) {
      return NextResponse.json(
        {
          success: false,
          hasStream: false,
          hasCameraStream: false,
          hasScreenStream: false,
          message: 'No active signaling session found for candidate.'
        },
        { status: 200, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        hasStream: Boolean(channel.offer || channel.cameraPreviewFrame || channel.screenOffer || channel.screenPreviewFrame),
        hasCameraStream: Boolean(channel.offer || channel.cameraPreviewFrame),
        hasScreenStream: Boolean(channel.screenOffer || channel.screenPreviewFrame),
        offer: channel.offer || null,
        cameraOffer: channel.offer || null,
        screenOffer: channel.screenOffer || null,
        candidateIceCandidates: channel.candidateIceCandidates || [],
        screenCandidateIceCandidates: channel.screenCandidateIceCandidates || [],
        previewFrame: channel.cameraPreviewFrame || channel.previewFrame || null,
        cameraPreviewFrame: channel.cameraPreviewFrame || channel.previewFrame || null,
        screenPreviewFrame: channel.screenPreviewFrame || null,
        cameraActive: channel.cameraActive,
        screenActive: channel.screenActive,
        connectionStatus: channel.connectionStatus,
        violationCount: channel.violationCount,
        lastActive: channel.lastActive
      },
      { status: 200, headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Admin WebRTC GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Signaling fetch failed.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized administrative access.' },
        { status: 401, headers: noStoreHeaders }
      );
    }

    const body = await request.json();
    const { attemptId, answer, cameraAnswer, screenAnswer, iceCandidate, cameraIceCandidate, screenIceCandidate } = body;

    if (!attemptId) {
      return NextResponse.json(
        { error: 'Attempt ID is required.' },
        { status: 400, headers: noStoreHeaders }
      );
    }

    const channel = registerAdminSignal({
      attemptId,
      answer: answer || cameraAnswer,
      iceCandidate: iceCandidate || cameraIceCandidate,
      screenAnswer,
      screenIceCandidate
    });

    if (!channel) {
      return NextResponse.json(
        { error: 'Signaling session not found for this candidate attempt.' },
        { status: 404, headers: noStoreHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Admin signaling answer registered successfully.'
      },
      { status: 200, headers: noStoreHeaders }
    );
  } catch (error: any) {
    console.error('Admin WebRTC POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Admin signaling failed.' },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
