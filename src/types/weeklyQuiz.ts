export type WeeklyQuizStatus = 'Draft' | 'Published' | 'Live' | 'Archived';
export type WeeklyQuizScheduleStatus = 'UPCOMING' | 'LIVE' | 'ENDED';

export interface WeeklyQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number; // 0-indexed, kept strictly on server during assessment
  marks: number;
  explanation?: string;
  topicTag?: string;
}

export interface WeeklyQuizProctoringConfig {
  requireWebcam: boolean;
  requireMicrophone: boolean;
  requireScreenShare: boolean;
  requireFaceDetection: boolean;
  detectMultipleFaces: boolean;
  requireFullscreen: boolean;
  monitorFocus: boolean;
  noFaceThresholdSeconds: number; // grace threshold before logging NO_FACE_DETECTED (e.g. 6s)
  multipleFacesThresholdSeconds: number; // grace threshold before logging MULTIPLE_FACES_DETECTED (e.g. 4s)
  cameraGracePeriodSeconds: number; // grace period to reconnect camera before penalty (e.g. 30s)
  screenGracePeriodSeconds: number; // grace period to restore screen share before penalty (e.g. 20s)
  fullscreenGracePeriodSeconds: number; // grace period to return to fullscreen (e.g. 15s)
  maxViolationsAllowed: number; // Default 1 warning, 2nd auto-submits
}

export interface WeeklyQuiz {
  id: string;
  quizCode: string;
  title: string;
  topic: string;
  description: string;
  sessionId: string; // Exact linked session/event ID (e.g. "event-01" or "SESSION-W05-001")
  sessionTitle?: string; // Display title of the linked session
  scheduledDate?: string; // e.g. "2026-09-25" (YYYY-MM-DD)
  startTime?: string; // e.g. "10:00" (HH:mm in timezone)
  endTime?: string; // e.g. "10:30" (HH:mm in timezone)
  timezone?: string; // Default: "Asia/Kolkata" (IST)
  scheduledStartAt?: string; // Canonical UTC ISO timestamp
  scheduledEndAt?: string; // Canonical UTC ISO timestamp
  lateEntryGraceMinutes?: number; // Optional explicit grace window in minutes
  availableFrom?: string; // Fallback legacy ISO date
  availableUntil?: string; // Fallback legacy ISO date
  durationMinutes: number; // e.g. 20 minutes
  totalQuestionsToSelect: number; // e.g. 20 questions chosen from questionBank
  passingPercentage: number; // e.g. 60%
  maxAttempts: number; // 1 attempt per candidate
  status: WeeklyQuizStatus;
  questionBank: WeeklyQuizQuestion[];
  settings: WeeklyQuizProctoringConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateEligibilityResult {
  isEligible: boolean;
  reason:
    | 'ELIGIBLE'
    | 'NOT_REGISTERED_FOR_SESSION'
    | 'REGISTRATION_NOT_CONFIRMED'
    | 'QUIZ_NOT_STARTED'
    | 'QUIZ_ENDED'
    | 'ALREADY_SUBMITTED'
    | 'ATTEMPT_LOCKED'
    | 'QUIZ_INACTIVE'
    | 'INVALID_CREDENTIALS';
  message: string;
  registration?: {
    id: string;
    eventId: string;
    name: string;
    email: string;
    status: string;
  };
  quiz?: {
    id: string;
    quizCode: string;
    title: string;
    topic: string;
    description: string;
    sessionId: string;
    sessionTitle?: string;
    durationMinutes: number;
    totalQuestions: number;
    passingPercentage: number;
    scheduledDate?: string;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    scheduledStartAt?: string;
    scheduledEndAt?: string;
    scheduleStatus: WeeklyQuizScheduleStatus;
    startsInSeconds?: number;
    remainingSeconds?: number;
  };
  existingAttempt?: {
    id: string;
    status: WeeklyQuizAttemptStatus;
    sessionToken: string;
    score?: number;
    totalMarks?: number;
    percentage?: number;
    passed?: boolean;
    submissionReason?: WeeklyQuizSubmissionReason;
    submittedAt?: string;
    remainingSeconds?: number;
  };
  serverTime: string;
}

export interface WeeklyQuizEligibilityMetrics {
  totalEligible: number;
  started: number;
  notStarted: number;
  active: number;
  submitted: number;
  autoSubmitted: number;
  scheduleStatus: WeeklyQuizScheduleStatus;
  serverTime: string;
}

export type WeeklyQuizAttemptStatus =
  | 'WAITING'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'SUBMITTED'
  | 'REVIEW_REQUIRED'
  | 'LOCKED';

export type WeeklyQuizSubmissionReason =
  | 'MANUAL'
  | 'TIME_EXPIRED'
  | 'SECURITY_VIOLATION'
  | 'ADMIN_FORCE_SUBMIT';

export type IntegrityRating = 'NORMAL' | 'ATTENTION' | 'REVIEW_REQUIRED';

export type MediaDeviceStatus = 'ACTIVE' | 'DISCONNECTED' | 'ERROR' | 'OFF';
export type ConnectionHealthStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
export type FaceStatusType = 'ONE_FACE' | 'NO_FACE' | 'MULTIPLE_FACES' | 'UNKNOWN';

export interface WeeklyQuizIntegritySummary {
  cameraStatus: MediaDeviceStatus;
  screenStatus?: MediaDeviceStatus;
  faceStatus: FaceStatusType;
  focusStatus: 'FOCUSED' | 'UNFOCUSED';
  fullscreenStatus: 'FULLSCREEN' | 'WINDOWED';
  connectionStatus?: ConnectionHealthStatus;
  violationCount?: number;
  faceEventsCount: number;
  focusEventsCount: number;
  securityEventsCount: number;
  screenEventsCount?: number;
  reconnectsCount: number;
  integrityRating: IntegrityRating;
  lastViolationReason?: string;
}

export interface WeeklyQuizViolationRecord {
  violationNumber: number;
  eventType: string;
  reason: string;
  timestamp: string;
}

export interface WeeklyQuizAttempt {
  id: string;
  quizId: string;
  sessionId?: string;
  registrationId?: string;
  candidateId: string;
  studentName: string;
  rollNumber: string;
  email: string;
  sessionToken: string;
  status: WeeklyQuizAttemptStatus;
  selectedQuestionIds: string[]; // Order of question IDs selected for this candidate
  shuffledOptions: Record<string, number[]>; // questionId -> permutation of original option indices [2, 0, 1, 3]
  answers: Record<string, number>; // questionId -> selected displayed option index (0..3)
  markedForReview: string[];
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  startedAt?: string;
  expiresAt?: string;
  submittedAt?: string;
  pausedAt?: string;
  pausedRemainingSeconds?: number;
  extendedMinutes?: number;
  submissionReason?: WeeklyQuizSubmissionReason;
  cameraStatus: MediaDeviceStatus;
  screenStatus?: MediaDeviceStatus;
  faceStatus: FaceStatusType;
  focusStatus: 'FOCUSED' | 'UNFOCUSED';
  fullscreenStatus: 'FULLSCREEN' | 'WINDOWED';
  connectionStatus?: ConnectionHealthStatus;
  violationCount?: number;
  violationHistory?: WeeklyQuizViolationRecord[];
  lastHeartbeatAt?: string;
  integritySummary?: WeeklyQuizIntegritySummary;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type WeeklyQuizEventType =
  | 'WEBCAM_PERMISSION_GRANTED'
  | 'WEBCAM_PERMISSION_DENIED'
  | 'WEBCAM_CONNECTED'
  | 'WEBCAM_DISCONNECTED'
  | 'WEBCAM_STREAM_INTERRUPTED'
  | 'CAMERA_CONNECTED'
  | 'CAMERA_DISCONNECTED'
  | 'CAMERA_RECONNECTED'
  | 'SCREEN_SHARE_PERMISSION_GRANTED'
  | 'SCREEN_SHARE_PERMISSION_DENIED'
  | 'SCREEN_SHARE_STARTED'
  | 'SCREEN_SHARE_STOPPED'
  | 'SCREEN_SHARE_INTERRUPTED'
  | 'FACE_DETECTED'
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES_DETECTED'
  | 'FACE_DETECTION_RECOVERED'
  | 'TAB_FOCUS_LOST'
  | 'TAB_FOCUS_RESTORED'
  | 'TAB_HIDDEN'
  | 'TAB_VISIBLE'
  | 'WINDOW_BLURRED'
  | 'WINDOW_FOCUSED'
  | 'FULLSCREEN_ENTERED'
  | 'FULLSCREEN_EXITED'
  | 'FULLSCREEN_EXIT'
  | 'FULLSCREEN_RESTORED'
  | 'COPY_ATTEMPT'
  | 'CUT_ATTEMPT'
  | 'PASTE_ATTEMPT'
  | 'NAVIGATION_ATTEMPT'
  | 'UNAUTHORIZED_KEY'
  | 'QUIZ_STARTED'
  | 'QUIZ_SUBMITTED'
  | 'AUTO_SUBMITTED'
  | 'NETWORK_INTERRUPTION'
  | 'NETWORK_RECOVERED'
  | 'NETWORK_DISCONNECTED'
  | 'NETWORK_RECONNECTED'
  | 'PROCTOR_WARNING'
  | 'PROCTOR_VIOLATION';

export type WeeklyQuizEventSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface WeeklyQuizSecurityEvent {
  id: string;
  attemptId: string;
  quizId: string;
  candidateId: string;
  studentName: string;
  email: string;
  eventType: WeeklyQuizEventType;
  severity: WeeklyQuizEventSeverity;
  durationSeconds?: number;
  metadata?: Record<string, any>;
  dedupKey?: string;
  timestamp: string;
}

export type WeeklyQuizAdminAction =
  | 'VIEW_LIVE'
  | 'PAUSE_QUIZ'
  | 'RESUME_QUIZ'
  | 'LOCK_CANDIDATE'
  | 'END_SESSION'
  | 'EXTEND_TIME'
  | 'UPDATE_SETTINGS'
  | 'CREATE_QUIZ'
  | 'UPDATE_QUIZ'
  | 'DELETE_QUIZ'
  | 'SEND_WARNING';

export interface WeeklyQuizAuditLog {
  id: string;
  quizId: string;
  attemptId?: string;
  adminUser: string;
  action: WeeklyQuizAdminAction;
  details?: Record<string, any>;
  timestamp: string;
}

export interface WeeklyQuizStudentSession {
  quiz: {
    id: string;
    quizCode: string;
    title: string;
    topic: string;
    description: string;
    durationMinutes: number;
    totalQuestions: number;
    passingPercentage: number;
    settings: WeeklyQuizProctoringConfig;
    questions: Array<{
      id: string;
      question: string;
      options: string[];
      marks: number;
    }>;
  };
  attempt: {
    id: string;
    studentName: string;
    rollNumber: string;
    email: string;
    status: WeeklyQuizAttemptStatus;
    startedAt?: string;
    expiresAt?: string;
    remainingSeconds: number;
    answers: Record<string, number>;
    markedForReview: string[];
    cameraStatus: string;
    screenStatus: string;
    faceStatus: string;
    focusStatus: string;
    violationCount: number;
  };
}

export type NetworkQualityTier = 'GOOD' | 'FAIR' | 'POOR' | 'DISCONNECTED';

export interface TrackHardwareSettings {
  actualWidth: number;
  actualHeight: number;
  actualFps: number;
  label?: string;
  facingMode?: string;
}

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

export interface WebRTCSignalingMessage {
  attemptId: string;
  candidateId: string;
  streamType?: 'camera' | 'screen' | 'both';
  type: 'offer' | 'answer' | 'candidate' | 'heartbeat' | 'preview' | 'stats';
  sdp?: any;
  candidate?: any;
  cameraOffer?: any;
  cameraAnswer?: any;
  screenOffer?: any;
  screenAnswer?: any;
  networkStats?: WebRTCStatsSnapshot;
  actualCameraSettings?: TrackHardwareSettings;
  qualityTier?: NetworkQualityTier;
  targetQualityMode?: 'GRID' | 'HIGH_QUALITY';
  cameraPreviewFrame?: string; // base64 JPEG data URL for instant telemetry fallback
  screenPreviewFrame?: string; // base64 JPEG data URL for instant screen share telemetry
  previewFrame?: string; // legacy alias for camera preview
  cameraActive?: boolean;
  screenActive?: boolean;
  timestamp: number;
}

