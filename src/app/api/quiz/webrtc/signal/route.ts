import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { registerCandidateSignal, getCandidateSignalForStudent } from '@/lib/webrtcSignaling';
import { WeeklyQuizAttempt } from '@/types/weeklyQuiz';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      attemptId,
      token,
      offer,
      cameraOffer,
      screenOffer,
      iceCandidate,
      cameraIceCandidate,
      screenIceCandidate,
      previewFrame,
      cameraPreviewFrame,
      screenPreviewFrame,
      cameraActive,
      screenActive,
      connectionStatus,
      violationCount,
      networkStats,
      actualCameraSettings,
      qualityTier,
      targetQualityMode,
      iceRestartNeeded
    } = body;

    if (!attemptId || !token) {
      return NextResponse.json(
        { error: 'Attempt ID and session token are required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const attempt: WeeklyQuizAttempt | null = await db.weeklyQuizAttempts.getById(attemptId);
    if (!attempt || attempt.sessionToken !== token) {
      return NextResponse.json(
        { error: 'Unauthorized signaling request.' },
        { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const channel = registerCandidateSignal({
      attemptId: attempt.id,
      candidateId: attempt.candidateId,
      studentName: attempt.studentName,
      email: attempt.email,
      quizId: attempt.quizId,
      offer: offer || cameraOffer,
      screenOffer,
      iceCandidate: iceCandidate || cameraIceCandidate,
      screenIceCandidate,
      previewFrame: previewFrame || cameraPreviewFrame,
      cameraPreviewFrame: cameraPreviewFrame || previewFrame,
      screenPreviewFrame,
      cameraActive,
      screenActive,
      connectionStatus,
      violationCount,
      networkStats,
      actualCameraSettings,
      qualityTier,
      targetQualityMode,
      iceRestartNeeded
    });

    return NextResponse.json(
      {
        success: true,
        answer: channel.answer || null,
        cameraAnswer: channel.answer || null,
        screenAnswer: channel.screenAnswer || null,
        adminIceCandidates: channel.adminIceCandidates || [],
        screenAdminIceCandidates: channel.screenAdminIceCandidates || [],
        targetQualityMode: channel.targetQualityMode || 'GRID',
        qualityTier: channel.qualityTier || 'GOOD',
        connectionStatus: channel.connectionStatus
      },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Candidate WebRTC signaling error:', error);
    return NextResponse.json(
      { error: error.message || 'Signaling error.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');
    const token = searchParams.get('token');

    if (!attemptId || !token) {
      return NextResponse.json(
        { error: 'Attempt ID and session token are required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const attempt: WeeklyQuizAttempt | null = await db.weeklyQuizAttempts.getById(attemptId);
    if (!attempt || attempt.sessionToken !== token) {
      return NextResponse.json(
        { error: 'Unauthorized signaling request.' },
        { status: 401, headers: { 'Cache-Control': 'no-store, max-age=0' } }
      );
    }

    const signalData = getCandidateSignalForStudent(attemptId);

    return NextResponse.json(
      {
        success: true,
        answer: signalData.answer || null,
        cameraAnswer: signalData.answer || null,
        screenAnswer: signalData.screenAnswer || null,
        adminIceCandidates: signalData.adminIceCandidates || [],
        screenAdminIceCandidates: signalData.screenAdminIceCandidates || [],
        connectionStatus: signalData.connectionStatus,
        qualityTier: signalData.qualityTier,
        targetQualityMode: signalData.targetQualityMode
      },
      { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error: any) {
    console.error('Candidate WebRTC poll error:', error);
    return NextResponse.json(
      { error: error.message || 'Signaling poll error.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
