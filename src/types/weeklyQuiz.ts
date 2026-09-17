export type WeeklyQuizStatus = 'Draft' | 'Published' | 'Live' | 'Archived';

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
  requireFaceDetection: boolean;
  detectMultipleFaces: boolean;
  requireFullscreen: boolean;
  monitorFocus: boolean;
  noFaceThresholdSeconds: number; // grace threshold before logging NO_FACE_DETECTED (e.g. 6s)
  multipleFacesThresholdSeconds: number; // grace threshold before logging MULTIPLE_FACES_DETECTED (e.g. 4s)
  cameraGracePeriodSeconds: number; // grace period to reconnect camera before pausing quiz (e.g. 30s)
  fullscreenGracePeriodSeconds: number; // grace period to return to fullscreen (e.g. 15s)
}

export interface WeeklyQuiz {
  id: string;
  quizCode: string;
  title: string;
  topic: string;
  description: string;
  availableFrom?: string; // ISO date
  availableUntil?: string; // ISO date
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

export interface WeeklyQuizIntegritySummary {
  cameraStatus: 'ACTIVE' | 'DISCONNECTED' | 'ERROR' | 'OFF';
  faceStatus: 'ONE_FACE' | 'NO_FACE' | 'MULTIPLE_FACES' | 'UNKNOWN';
  focusStatus: 'FOCUSED' | 'UNFOCUSED';
  fullscreenStatus: 'FULLSCREEN' | 'WINDOWED';
  faceEventsCount: number;
  focusEventsCount: number;
  securityEventsCount: number;
  reconnectsCount: number;
  integrityRating: IntegrityRating;
}

export interface WeeklyQuizAttempt {
  id: string;
  quizId: string;
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
  extendedMinutes: number;
  submissionReason?: WeeklyQuizSubmissionReason;
  cameraStatus: 'ACTIVE' | 'DISCONNECTED' | 'ERROR' | 'OFF';
  faceStatus: 'ONE_FACE' | 'NO_FACE' | 'MULTIPLE_FACES' | 'UNKNOWN';
  focusStatus: 'FOCUSED' | 'UNFOCUSED';
  fullscreenStatus: 'FULLSCREEN' | 'WINDOWED';
  integritySummary: WeeklyQuizIntegritySummary;
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
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES_DETECTED'
  | 'FACE_DETECTION_RECOVERED'
  | 'TAB_FOCUS_LOST'
  | 'TAB_FOCUS_RESTORED'
  | 'FULLSCREEN_EXIT'
  | 'FULLSCREEN_RESTORED'
  | 'COPY_ATTEMPT'
  | 'PASTE_ATTEMPT'
  | 'NAVIGATION_ATTEMPT'
  | 'QUIZ_STARTED'
  | 'QUIZ_SUBMITTED'
  | 'NETWORK_INTERRUPTION'
  | 'NETWORK_RECOVERED';

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
  | 'DELETE_QUIZ';

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
    faceStatus: string;
    focusStatus: string;
  };
}

export interface WebRTCSignalingMessage {
  attemptId: string;
  candidateId: string;
  type: 'offer' | 'answer' | 'candidate' | 'heartbeat' | 'preview';
  sdp?: any;
  candidate?: any;
  previewFrame?: string; // base64 JPEG data URL for instant telemetry fallback
  timestamp: number;
}
