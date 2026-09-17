export interface SignalingChannel {
  attemptId: string;
  candidateId: string;
  studentName: string;
  quizId: string;
  offer?: any; // RTCSessionDescriptionInit
  answer?: any; // RTCSessionDescriptionInit
  candidateIceCandidates: any[]; // RTCIceCandidateInit[]
  adminIceCandidates: any[]; // RTCIceCandidateInit[]
  previewFrame?: string; // base64 data URL
  lastActive: number;
  cameraActive: boolean;
}

// Global signaling registry
const signalingChannels = new Map<string, SignalingChannel>();

/**
 * Periodically purge inactive channels older than 15 minutes.
 */
function cleanupStaleChannels() {
  const cutoff = Date.now() - 15 * 60 * 1000;
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
  quizId: string;
  offer?: any;
  iceCandidate?: any;
  previewFrame?: string;
  cameraActive?: boolean;
}): SignalingChannel {
  cleanupStaleChannels();

  let channel = signalingChannels.get(params.attemptId);
  if (!channel) {
    channel = {
      attemptId: params.attemptId,
      candidateId: params.candidateId,
      studentName: params.studentName,
      quizId: params.quizId,
      candidateIceCandidates: [],
      adminIceCandidates: [],
      lastActive: Date.now(),
      cameraActive: params.cameraActive !== undefined ? params.cameraActive : true
    };
    signalingChannels.set(params.attemptId, channel);
  }

  channel.lastActive = Date.now();
  if (params.offer) {
    channel.offer = params.offer;
  }
  if (params.iceCandidate) {
    channel.candidateIceCandidates.push(params.iceCandidate);
  }
  if (params.previewFrame) {
    channel.previewFrame = params.previewFrame;
  }
  if (params.cameraActive !== undefined) {
    channel.cameraActive = params.cameraActive;
  }

  return channel;
}

export function getCandidateSignalForStudent(attemptId: string): {
  answer?: any;
  adminIceCandidates: any[];
} {
  const channel = signalingChannels.get(attemptId);
  if (!channel) {
    return { adminIceCandidates: [] };
  }
  channel.lastActive = Date.now();
  return {
    answer: channel.answer,
    adminIceCandidates: [...channel.adminIceCandidates]
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

  return channel;
}

export function getAllActiveSignalingChannels(): SignalingChannel[] {
  cleanupStaleChannels();
  return Array.from(signalingChannels.values());
}
