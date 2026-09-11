export type ExamStatus = 'Draft' | 'Published' | 'Live' | 'Archived';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number; // 0-indexed, hidden from student client
  marks: number;
  explanation?: string;
}

export interface Exam {
  id: string;
  examCode: string;
  password?: string;
  examUnlockPassword?: string; // Independent admin-generated password to recover an interrupted/locked exam
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  passingPercentage: number;
  maxAttempts: number;
  status: ExamStatus;
  requireSecureBrowser: boolean;
  maxSecurityViolations: number;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export type AttemptStatus =
  | 'LOCKED'
  | 'VERIFIED'
  | 'UNLOCKED'
  | 'IN_EXAM'
  | 'EXAM_LOCKED'
  | 'PAUSED'
  | 'SUBMITTED'
  | 'REVIEW_REQUIRED';

export type SubmissionReason =
  | 'MANUAL'
  | 'TIME_EXPIRED'
  | 'SECURITY_VIOLATION'
  | 'LOCKDOWN_VIOLATION'
  | 'ADMIN_FORCE_SUBMIT';

export interface ExamAttempt {
  id: string;
  examId: string;
  studentName: string;
  rollNumber: string;
  email: string;
  sessionToken: string;
  status: AttemptStatus;
  verifiedAt?: string;
  unlockedAt?: string;
  startedAt?: string;
  expiresAt?: string;
  submittedAt?: string;
  lockedAt?: string;
  lockedBy?: string;
  lockReason?: string;
  lockCount?: number;
  totalLockedSeconds?: number;
  pausedRemainingSeconds?: number;
  extendedMinutes: number;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  markedForReview: string[];
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  submissionReason?: SubmissionReason;
  certificateId?: string;
  securityViolationsCount: number;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SecurityEventType =
  | 'FULLSCREEN_EXIT'
  | 'ESC_FULLSCREEN_EXIT'
  | 'NAVIGATION_ATTEMPT'
  | 'TAB_BLUR'
  | 'VISIBILITY_VIOLATION'
  | 'COPY_ATTEMPT'
  | 'PASTE_ATTEMPT'
  | 'DEVTOOLS_ATTEMPT'
  | 'UNAUTHORIZED_KEY'
  | 'LOCKDOWN_VIOLATION'
  | 'SEB_LOCKDOWN_VIOLATION'
  | 'EXAM_LOCKED'
  | 'EXAM_UNLOCKED'
  | 'EXAM_TIMEOUT'
  | 'NETWORK_DISCONNECT'
  | 'NETWORK_RECONNECT';

export type SecuritySeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface ExamSecurityEvent {
  id: string;
  attemptId: string;
  examId: string;
  studentName: string;
  rollNumber: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  metadata?: Record<string, any>;
  timestamp: string;
}

export type AdminActionType =
  | 'VERIFY'
  | 'UNLOCK'
  | 'BULK_UNLOCK'
  | 'UNLOCK_ALL'
  | 'LOCK'
  | 'START'
  | 'START_SELECTED'
  | 'START_ALL'
  | 'PAUSE'
  | 'RESUME'
  | 'EXTEND_TIME'
  | 'FORCE_SUBMIT'
  | 'UNLOCK_LOCKED_CANDIDATE'
  | 'MANUAL_LOCK_CANDIDATE'
  | 'REGENERATE_UNLOCK_PASSWORD'
  | 'CREATE_EXAM'
  | 'UPDATE_EXAM'
  | 'DELETE_EXAM'
  | 'DELETE_ALL_EXAMS'
  | 'RESET_ATTEMPT';


export interface ExamAuditLog {
  id: string;
  attemptId?: string;
  examId: string;
  adminUser: string;
  action: AdminActionType;
  details?: Record<string, any>;
  timestamp: string;
}

export interface StudentExamSession {
  exam: {
    id: string;
    examCode: string;
    title: string;
    description: string;
    category: string;
    durationMinutes: number;
    passingPercentage: number;
    requireSecureBrowser: boolean;
    maxSecurityViolations: number;
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
    status: AttemptStatus;
    startedAt?: string;
    expiresAt?: string;
    remainingSeconds: number;
    answers: Record<string, number>;
    markedForReview: string[];
    securityViolationsCount: number;
  };
}
