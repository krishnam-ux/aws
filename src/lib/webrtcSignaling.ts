export interface SignalingChannel {
  attemptId: string;
  candidateId: string;
  studentName: string;
  email?: string;
  quizId: string;
  // Camera WebRTC Stream
  offer?: any; // RTCSessionDescriptionInit (camera or combined)
  answer?: any; // RTCSessionDescriptionInit
  candidateIceCandidates: any[]; // RTCIceCandidateInit[]
  adminIceCandidates: any[]; // RTCIceCandidateInit[]
  // Screen Share WebRTC Stream
  screenOffer?: any; // RTCSessionDescriptionInit (screen share)
  screenAnswer?: any; // RTCSessionDescriptionInit
  screenCandidateIceCandidates: any[]; // RTCIceCandidateInit[]
  screenAdminIceCandidates: any[]; // RTCIceCandidateInit[]
  // Low-Resolution Telemetry Preview Snapshots (Instant Dashboard Render)
  cameraPreviewFrame?: string; // base64 data URL
  screenPreviewFrame?: string; // base64 data URL
  previewFrame?: string; // legacy alias for cameraPreviewFrame
  // Live Statuses
  cameraActive: boolean;
  screenActive: boolean;
  connectionStatus: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  violationCount: number;
  lastActive: number;
  lastHeartbeat: number;
}

// Global signaling registry in memory
const signalingChannels = new Map<string, SignalingChannel>();

/**
 * Periodically purge inactive channels older than 30 minutes.
 */
function cleanupStaleChannels() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [attemptId, channel] of signalingChannels.entries()) {
    if (channel.lastActive < cutoff) {
      signalingChannels.delete(attemptId);
    }
  }
}

export function registerCandidateSignal(params: {
  attemptId: string;
  candidateId: string;
  studentName: string;
  email?: string;
  quizId: string;
  offer?: any;
  answer?: any;
  iceCandidate?: any;
  screenOffer?: any;
  screenIceCandidate?: any;
  cameraPreviewFrame?: string;
  screenPreviewFrame?: string;
  previewFrame?: string;
  cameraActive?: boolean;
  screenActive?: boolean;
  connectionStatus?: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  violationCount?: number;
}): SignalingChannel {
  cleanupStaleChannels();

  let channel = signalingChannels.get(params.attemptId);
  if (!channel) {
    channel = {
      attemptId: params.attemptId,
      candidateId: params.candidateId,
      studentName: params.studentName,
      email: params.email,
      quizId: params.quizId,
      candidateIceCandidates: [],
      adminIceCandidates: [],
      screenCandidateIceCandidates: [],
      screenAdminIceCandidates: [],
      cameraActive: params.cameraActive !== undefined ? params.cameraActive : true,
      screenActive: params.screenActive !== undefined ? params.screenActive : true,
      connectionStatus: params.connectionStatus || 'CONNECTED',
      violationCount: params.violationCount || 0,
      lastActive: Date.now(),
      lastHeartbeat: Date.now()
    };
    signalingChannels.set(params.attemptId, channel);
  }

  channel.lastActive = Date.now();
  channel.lastHeartbeat = Date.now();

  if (params.studentName) channel.studentName = params.studentName;
  if (params.email) channel.email = params.email;
  if (params.offer) channel.offer = params.offer;
  if (params.iceCandidate) channel.candidateIceCandidates.push(params.iceCandidate);
  if (params.screenOffer) channel.screenOffer = params.screenOffer;
  if (params.screenIceCandidate) channel.screenCandidateIceCandidates.push(params.screenIceCandidate);

  if (params.cameraPreviewFrame) {
    channel.cameraPreviewFrame = params.cameraPreviewFrame;
    channel.previewFrame = params.cameraPreviewFrame;
  } else if (params.previewFrame) {
    channel.cameraPreviewFrame = params.previewFrame;
    channel.previewFrame = params.previewFrame;
  }

  if (params.screenPreviewFrame) {
    channel.screenPreviewFrame = params.screenPreviewFrame;
  }

  if (params.cameraActive !== undefined) channel.cameraActive = params.cameraActive;
  if (params.screenActive !== undefined) channel.screenActive = params.screenActive;
  if (params.connectionStatus) channel.connectionStatus = params.connectionStatus;
  if (typeof params.violationCount === 'number') channel.violationCount = params.violationCount;

  return channel;
}

export function getCandidateSignalForStudent(attemptId: string): {
  answer?: any;
  adminIceCandidates: any[];
  screenAnswer?: any;
  screenAdminIceCandidates: any[];
  connectionStatus: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
} {
  const channel = signalingChannels.get(attemptId);
  if (!channel) {
    return {
      adminIceCandidates: [],
      screenAdminIceCandidates: [],
      connectionStatus: 'DISCONNECTED'
    };
  }
  channel.lastActive = Date.now();
  return {
    answer: channel.answer,
    adminIceCandidates: [...channel.adminIceCandidates],
    screenAnswer: channel.screenAnswer,
    screenAdminIceCandidates: [...channel.screenAdminIceCandidates],
    connectionStatus: channel.connectionStatus
  };
}

export function getCandidateSignalForAdmin(attemptId: string): SignalingChannel | null {
  cleanupStaleChannels();
  const channel = signalingChannels.get(attemptId);
  if (!channel) return null;
  channel.lastActive = Date.now();
  return channel;
}

export function registerAdminSignal(params: {
  attemptId: string;
  answer?: any;
  iceCandidate?: any;
  screenAnswer?: any;
  screenIceCandidate?: any;
}): SignalingChannel | null {
  const channel = signalingChannels.get(params.attemptId);
  if (!channel) return null;

  channel.lastActive = Date.now();
  if (params.answer) {
    channel.answer = params.answer;
  }
  if (params.iceCandidate) {
    channel.adminIceCandidates.push(params.iceCandidate);
  }
  if (params.screenAnswer) {
    channel.screenAnswer = params.screenAnswer;
  }
  if (params.screenIceCandidate) {
    channel.screenAdminIceCandidates.push(params.screenIceCandidate);
  }

  return channel;
}

export function getAllActiveSignalingChannels(): SignalingChannel[] {
  cleanupStaleChannels();
  return Array.from(signalingChannels.values());
}

export function clearSignalingChannel(attemptId: string): void {
  signalingChannels.delete(attemptId);
}
