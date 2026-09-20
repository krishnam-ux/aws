export type NetworkQualityTier = 'GOOD' | 'FAIR' | 'POOR' | 'DISCONNECTED';

export interface WebRTCStatsSnapshot {
  timestamp: number;
  connectionState: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  quality: NetworkQualityTier;
  rttMs: number;
  jitterMs: number;
  packetsLost: number;
  packetsReceived: number;
  packetLossPercent: number;
  fps: number;
  framesDecoded: number;
  framesDropped: number;
  frameWidth: number;
  frameHeight: number;
  bitrateKbps: number;
  bytesReceived: number;
  iceCandidateType?: string;
  qualityLimitationReason?: string;
}

export interface TrackHardwareSettings {
  actualWidth: number;
  actualHeight: number;
  actualFps: number;
  label?: string;
  facingMode?: string;
}

/**
 * Extracts actual hardware capability from a MediaStreamTrack.
 */
export function getTrackHardwareSettings(track: MediaStreamTrack | null | undefined): TrackHardwareSettings | null {
  if (!track) return null;
  if (track.kind && track.kind !== 'video') return null;
  try {
    const settings = typeof track.getSettings === 'function' ? track.getSettings() : {} as MediaTrackSettings;
    return {
      actualWidth: settings.width || 0,
      actualHeight: settings.height || 0,
      actualFps: Math.round(settings.frameRate || 0),
      label: track.label || '',
      facingMode: settings.facingMode || 'user'
    };
  } catch (e) {
    return null;
  }
}

/**
 * Classifies network quality based on real-time WebRTC metrics.
 */
export function evaluateNetworkQuality(params: {
  connectionState?: string;
  rttMs: number;
  packetLossPercent: number;
  fps: number;
  bitrateKbps?: number;
}): NetworkQualityTier {
  const conn = params.connectionState ? params.connectionState.toLowerCase() : '';
  if (conn === 'disconnected' || conn === 'failed' || conn === 'closed') {
    return 'DISCONNECTED';
  }

  if (params.bitrateKbps !== undefined && params.bitrateKbps === 0 && params.fps === 0) {
    return 'DISCONNECTED';
  }

  // POOR if packet loss > 8%, or RTT > 350ms, or FPS drops below 10 (when video active)
  if (params.packetLossPercent > 8 || params.rttMs > 350 || (params.fps > 0 && params.fps < 10)) {
    return 'POOR';
  }

  // FAIR if packet loss 2-8%, or RTT 150-350ms, or FPS 10-20
  if (params.packetLossPercent > 2 || params.rttMs > 150 || (params.fps > 0 && params.fps < 20)) {
    return 'FAIR';
  }

  // GOOD: RTT < 150ms, packet loss <= 2%, FPS >= 20 (or static screen)
  return 'GOOD';
}

/**
 * Class for collecting and parsing getStats() reports from an RTCPeerConnection.
 */
export class WebRTCStatsCollector {
  private peerConnection: RTCPeerConnection | null = null;
  private prevBytesReceived: number = 0;
  private prevTimestamp: number = 0;
  private prevPacketsLost: number = 0;
  private prevPacketsReceived: number = 0;

  constructor(pc?: RTCPeerConnection | null) {
    if (pc) this.peerConnection = pc;
  }

  public setPeerConnection(pc: RTCPeerConnection | null) {
    this.peerConnection = pc;
    this.prevBytesReceived = 0;
    this.prevTimestamp = 0;
    this.prevPacketsLost = 0;
    this.prevPacketsReceived = 0;
  }

  public async collectStats(): Promise<WebRTCStatsSnapshot | null> {
    if (!this.peerConnection) return null;

    try {
      const stats = await this.peerConnection.getStats();
      const now = Date.now();

      let rttMs = 0;
      let jitterMs = 0;
      let packetsLost = 0;
      let packetsReceived = 0;
      let fps = 0;
      let framesDecoded = 0;
      let framesDropped = 0;
      let frameWidth = 0;
      let frameHeight = 0;
      let bytesReceived = 0;
      let iceCandidateType = 'unknown';
      let qualityLimitationReason = 'none';

      stats.forEach(report => {
        // Candidate pair stats (RTT, ice type)
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (typeof report.currentRoundTripTime === 'number') {
            rttMs = Math.round(report.currentRoundTripTime * 1000);
          }
        }

        // Remote candidate stats
        if (report.type === 'remote-candidate') {
          iceCandidateType = report.candidateType || iceCandidateType;
        }

        // Inbound video stream stats (Receiver side: Admin)
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          packetsLost = report.packetsLost || 0;
          packetsReceived = report.packetsReceived || 0;
          jitterMs = report.jitter ? Math.round(report.jitter * 1000) : jitterMs;
          framesDecoded = report.framesDecoded || 0;
          framesDropped = report.framesDropped || 0;
          frameWidth = report.frameWidth || frameWidth;
          frameHeight = report.frameHeight || frameHeight;
          fps = Math.round(report.framesPerSecond || 0);
          bytesReceived = report.bytesReceived || 0;
        }

        // Outbound video stream stats (Sender side: Candidate)
        if (report.type === 'outbound-rtp' && report.kind === 'video') {
          frameWidth = report.frameWidth || frameWidth;
          frameHeight = report.frameHeight || frameHeight;
          fps = Math.round(report.framesPerSecond || 0);
          qualityLimitationReason = report.qualityLimitationReason || qualityLimitationReason;
        }
      });

      // Calculate Bitrate
      let bitrateKbps = 0;
      if (this.prevTimestamp > 0 && now > this.prevTimestamp) {
        const timeDiffSec = (now - this.prevTimestamp) / 1000;
        const bytesDiff = bytesReceived - this.prevBytesReceived;
        if (bytesDiff > 0 && timeDiffSec > 0) {
          bitrateKbps = Math.round((bytesDiff * 8) / (timeDiffSec * 1000));
        }
      }

      // Calculate instantaneous Packet Loss Percent
      let packetLossPercent = 0;
      const deltaLost = packetsLost - this.prevPacketsLost;
      const deltaReceived = packetsReceived - this.prevPacketsReceived;
      const totalDelta = deltaLost + deltaReceived;
      if (totalDelta > 0 && deltaLost > 0) {
        packetLossPercent = Math.min(100, Math.round((deltaLost / totalDelta) * 1000) / 10);
      }

      // Update state for next calculation
      this.prevTimestamp = now;
      this.prevBytesReceived = bytesReceived;
      this.prevPacketsLost = packetsLost;
      this.prevPacketsReceived = packetsReceived;

      const connState = this.peerConnection.connectionState || 'new';
      let mappedConnStatus: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' = 'CONNECTED';
      if (connState === 'disconnected' || connState === 'failed' || connState === 'closed') {
        mappedConnStatus = 'DISCONNECTED';
      } else if (connState === 'connecting' || connState === 'new') {
        mappedConnStatus = 'RECONNECTING';
      }

      const quality = evaluateNetworkQuality({
        connectionState: connState,
        rttMs,
        packetLossPercent,
        fps
      });

      return {
        timestamp: now,
        connectionState: mappedConnStatus,
        quality,
        rttMs,
        jitterMs,
        packetsLost,
        packetsReceived,
        packetLossPercent,
        fps,
        framesDecoded,
        framesDropped,
        frameWidth,
        frameHeight,
        bitrateKbps,
        bytesReceived,
        iceCandidateType,
        qualityLimitationReason
      };
    } catch (e) {
      return null;
    }
  }
}
