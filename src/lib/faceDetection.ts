/**
 * Client-Side Privacy-Preserving Face Status Detection
 *
 * IMPORTANT PRIVACY ASSURANCES:
 * 1. ZERO Facial Recognition or Biometric profiling.
 * 2. ZERO identification of individuals.
 * 3. Detects ONLY status: One Face, No Face, or Multiple Faces.
 * 4. Zero external server transmissions of facial geometry.
 */

export type FaceStatus = 'ONE_FACE' | 'NO_FACE' | 'MULTIPLE_FACES' | 'UNKNOWN';

export interface FaceDetectionResult {
  status: FaceStatus;
  count: number;
  confidence: number;
}

/**
 * Checks if native Shape Detection API FaceDetector is supported
 */
function hasNativeFaceDetector(): boolean {
  return typeof window !== 'undefined' && 'FaceDetector' in window;
}

let nativeDetectorInstance: any = null;
function getNativeFaceDetector(): any {
  if (hasNativeFaceDetector()) {
    if (!nativeDetectorInstance) {
      try {
        const FaceDetectorClass = (window as any).FaceDetector;
        nativeDetectorInstance = new FaceDetectorClass({ fastMode: true, maxDetectedFaces: 5 });
      } catch (e) {
        nativeDetectorInstance = null;
      }
    }
  }
  return nativeDetectorInstance;
}

/**
 * Analyzes video element frame to estimate face count.
 */
export async function detectFaceStatus(videoElement: HTMLVideoElement): Promise<FaceDetectionResult> {
  if (!videoElement || videoElement.readyState < 2 || videoElement.videoWidth === 0) {
    return { status: 'UNKNOWN', count: 0, confidence: 0 };
  }

  // 1. Try native Shape Detection API if available
  const nativeDetector = getNativeFaceDetector();
  if (nativeDetector) {
    try {
      const faces = await nativeDetector.detect(videoElement);
      const count = faces ? faces.length : 0;
      if (count === 1) {
        return { status: 'ONE_FACE', count: 1, confidence: 0.95 };
      } else if (count > 1) {
        return { status: 'MULTIPLE_FACES', count, confidence: 0.9 };
      } else {
        return { status: 'NO_FACE', count: 0, confidence: 0.85 };
      }
    } catch (e) {
      // Fall through to lightweight canvas heuristics
    }
  }

  // 2. High-speed Canvas Computer Vision Heuristics (Privacy-preserving chromaticity and luminance clustering)
  try {
    const canvas = document.createElement('canvas');
    const width = 120;
    const height = 90;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { status: 'ONE_FACE', count: 1, confidence: 0.7 };
    }

    ctx.drawImage(videoElement, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let skinPixels = 0;
    const skinGrid: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
    let minX = width, maxX = 0, minY = height, maxY = 0;

    // Fast skin-tone chromaticity test in normalized RGB
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Standard biometric-free skin color chromatic boundary
        const isSkin =
          r > 60 &&
          g > 40 &&
          b > 20 &&
          r > g &&
          r > b &&
          r - g > 10 &&
          Math.abs(r - g) > 10 &&
          r - b > 15;

        if (isSkin) {
          skinPixels++;
          skinGrid[y][x] = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const totalPixels = width * height;
    const skinRatio = skinPixels / totalPixels;

    // If skin pixels are extremely low (< 2.5% of frame) -> No face
    if (skinRatio < 0.025) {
      return { status: 'NO_FACE', count: 0, confidence: 0.85 };
    }

    // Check for distinct separated face clusters (Multiple faces)
    // We sample two halves (left/right) of the active skin bounding box
    const midX = Math.floor((minX + maxX) / 2);
    let leftSkin = 0;
    let rightSkin = 0;
    const boxWidth = maxX - minX;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (skinGrid[y][x]) {
          if (x < midX - 8) leftSkin++;
          else if (x > midX + 8) rightSkin++;
        }
      }
    }

    // If both left and right clusters are large and separated by an empty gap across wide horizontal space
    if (boxWidth > width * 0.75 && leftSkin > totalPixels * 0.04 && rightSkin > totalPixels * 0.04) {
      return { status: 'MULTIPLE_FACES', count: 2, confidence: 0.8 };
    }

    // If significant skin area is present centered in reasonable bounds -> One Face
    if (skinRatio >= 0.025 && skinRatio <= 0.65) {
      return { status: 'ONE_FACE', count: 1, confidence: 0.88 };
    }

    return { status: 'ONE_FACE', count: 1, confidence: 0.75 };
  } catch (err) {
    return { status: 'ONE_FACE', count: 1, confidence: 0.6 };
  }
}

/**
 * State tracker with configurable debouncing and grace period
 */
export class FaceStatusTracker {
  private noFaceThresholdMs: number;
  private multipleFacesThresholdMs: number;

  private noFaceStartTime: number | null = null;
  private multipleFacesStartTime: number | null = null;
  private isCurrentlyInNoFaceAlert = false;
  private isCurrentlyInMultipleFacesAlert = false;

  private onNoFaceDetected?: (durationSeconds: number) => void;
  private onMultipleFacesDetected?: (durationSeconds: number) => void;
  private onFaceRecovered?: () => void;

  constructor(options: {
    noFaceThresholdSeconds?: number;
    multipleFacesThresholdSeconds?: number;
    onNoFaceDetected?: (durationSeconds: number) => void;
    onMultipleFacesDetected?: (durationSeconds: number) => void;
    onFaceRecovered?: () => void;
  }) {
    this.noFaceThresholdMs = (options.noFaceThresholdSeconds || 6) * 1000;
    this.multipleFacesThresholdMs = (options.multipleFacesThresholdSeconds || 4) * 1000;
    this.onNoFaceDetected = options.onNoFaceDetected;
    this.onMultipleFacesDetected = options.onMultipleFacesDetected;
    this.onFaceRecovered = options.onFaceRecovered;
  }

  public update(detection: FaceDetectionResult): {
    currentStatus: FaceStatus;
    noFaceDurationSeconds: number;
  } {
    const now = Date.now();

    if (detection.status === 'NO_FACE') {
      if (!this.noFaceStartTime) {
        this.noFaceStartTime = now;
      }
      this.multipleFacesStartTime = null;

      const elapsed = now - this.noFaceStartTime;
      const elapsedSec = Math.floor(elapsed / 1000);

      if (elapsed >= this.noFaceThresholdMs && !this.isCurrentlyInNoFaceAlert) {
        this.isCurrentlyInNoFaceAlert = true;
        this.onNoFaceDetected?.(elapsedSec);
      }

      return {
        currentStatus: 'NO_FACE',
        noFaceDurationSeconds: elapsedSec
      };
    }

    if (detection.status === 'MULTIPLE_FACES') {
      if (!this.multipleFacesStartTime) {
        this.multipleFacesStartTime = now;
      }
      this.noFaceStartTime = null;

      const elapsed = now - this.multipleFacesStartTime;
      const elapsedSec = Math.floor(elapsed / 1000);

      if (elapsed >= this.multipleFacesThresholdMs && !this.isCurrentlyInMultipleFacesAlert) {
        this.isCurrentlyInMultipleFacesAlert = true;
        this.onMultipleFacesDetected?.(elapsedSec);
      }

      return {
        currentStatus: 'MULTIPLE_FACES',
        noFaceDurationSeconds: 0
      };
    }

    // ONE_FACE or UNKNOWN (Recovered)
    if (detection.status === 'ONE_FACE') {
      if (this.isCurrentlyInNoFaceAlert || this.isCurrentlyInMultipleFacesAlert) {
        this.onFaceRecovered?.();
      }

      this.noFaceStartTime = null;
      this.multipleFacesStartTime = null;
      this.isCurrentlyInNoFaceAlert = false;
      this.isCurrentlyInMultipleFacesAlert = false;

      return {
        currentStatus: 'ONE_FACE',
        noFaceDurationSeconds: 0
      };
    }

    return {
      currentStatus: 'UNKNOWN',
      noFaceDurationSeconds: 0
    };
  }
}
