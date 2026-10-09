'use client';

import React, { useState, useEffect, useRef, memo } from 'react';
import {
  WeeklyQuiz,
  WeeklyQuizAttempt,
  WeeklyQuizSecurityEvent,
  WeeklyQuizProctoringConfig,
  WeeklyQuizQuestion,
  NetworkQualityTier,
  WebRTCStatsSnapshot
} from '@/types/weeklyQuiz';
import { WebRTCStatsCollector } from '@/lib/webrtcStats';

interface CandidateGridCardProps {
  cand: any;
  onInspect: (cand: any) => void;
  onTimeline: (cand: any) => void;
  onDeleteAttempt?: (cand: any) => void;
  formatTimeDisplay: (remaining?: number, totalMin?: number) => string;
}

/**
 * High-performance memoized candidate card to prevent whole-grid re-rendering across 200 candidates.
 */
const CandidateGridCard = memo(function CandidateGridCard({
  cand,
  onInspect,
  onTimeline,
  onDeleteAttempt,
  formatTimeDisplay
}: CandidateGridCardProps) {
  const quality = (cand.qualityTier || (cand.cameraStatus === 'DISCONNECTED' ? 'DISCONNECTED' : 'GOOD')) as NetworkQualityTier;
  const qualityConfig = {
    GOOD: { icon: '🟢', label: 'Good', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    FAIR: { icon: '🟡', label: 'Fair', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
    POOR: { icon: '🔴', label: 'Poor', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    DISCONNECTED: { icon: '⚫', label: 'Offline', bg: 'bg-slate-100 text-slate-600 border-slate-200' }
  }[quality] || { icon: '🟢', label: 'Good', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

  const isSubmitted = cand.status === 'SUBMITTED' || cand.status === 'TIME_EXPIRED' || cand.status === 'SECURITY_VIOLATION';
  const isPaused = cand.status === 'PAUSED';
  const isCameraOffline = cand.cameraStatus === 'DISCONNECTED' || cand.cameraStatus === 'ERROR' || cand.cameraStatus === 'DENIED';
  const isScreenOffline = cand.screenStatus === 'DISCONNECTED' || cand.screenStatus === 'ERROR' || cand.screenStatus === 'DENIED';

  // Extract initials for candidate avatar
  const initials = (cand.studentName || 'Student')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0]?.toUpperCase())
    .join('');

  return (
    <div className="group relative bg-white border border-slate-200 hover:border-[#FF9900] rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 p-4 flex flex-col justify-between space-y-3.5">
      <div>
        {/* Card Header: Avatar, Name, Roll Number, Network Quality, Violations */}
        <div className="flex items-start justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-800 shrink-0 group-hover:bg-[#FF9900]/10 group-hover:text-[#FF9900] group-hover:border-[#FF9900]/30 transition-colors">
              {initials || 'ST'}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-xs text-slate-900 truncate leading-tight group-hover:text-[#FF9900] transition-colors" title={cand.studentName}>
                {cand.studentName}
              </h4>
              <span className="text-[10px] text-slate-500 font-mono block truncate" title={cand.rollNumber}>
                {cand.rollNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Real-time WebRTC Network Quality Badge */}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${qualityConfig.bg}`}
              title={`WebRTC Stream Quality: ${quality}`}
            >
              {qualityConfig.icon} {qualityConfig.label}
            </span>

            {/* Authoritative Violation Counter */}
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border ${
                (cand.violationCount || 0) >= 2
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : (cand.violationCount || 0) === 1
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
              title={`Security Violations: ${cand.violationCount || 0} of 2 max allowed`}
            >
              V: {cand.violationCount || 0}/2
            </span>
          </div>
        </div>

        {/* Dual Stream Preview Box (Webcam + Screen Share) */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 rounded-xl p-1.5 aspect-[16/9] relative overflow-hidden mb-2.5 border border-slate-900 shadow-inner">
          {/* Left Viewport: Webcam Preview */}
          <div className="relative bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800/80">
            {cand.cameraPreviewFrame || cand.previewFrame ? (
              <img
                src={cand.cameraPreviewFrame || cand.previewFrame}
                alt="Webcam Feed"
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-1 space-y-0.5">
                <span className="text-sm">📹</span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {isCameraOffline ? 'Camera Offline' : 'Connecting...'}
                </span>
              </div>
            )}
            
            {/* Webcam Live Indicator Dot */}
            <div className="absolute top-1 left-1 flex items-center gap-1 bg-slate-950/80 backdrop-blur-xs px-1 py-0.5 rounded border border-slate-800 text-[8px] font-mono text-slate-300">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  cand.cameraStatus === 'ACTIVE'
                    ? 'bg-emerald-400 animate-pulse'
                    : isCameraOffline
                    ? 'bg-rose-400'
                    : 'bg-amber-400'
                }`}
              />
              <span>CAM</span>
            </div>
          </div>

          {/* Right Viewport: Screen Share Preview */}
          <div className="relative bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800/80">
            {cand.screenPreviewFrame ? (
              <img
                src={cand.screenPreviewFrame}
                alt="Screen Share Feed"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-1 space-y-0.5">
                <span className="text-sm">🖥️</span>
                <span className="text-[9px] text-slate-400 font-mono">
                  {isScreenOffline ? 'Screen Offline' : 'Connecting...'}
                </span>
              </div>
            )}

            {/* Screen Live Indicator Dot */}
            <div className="absolute top-1 left-1 flex items-center gap-1 bg-slate-950/80 backdrop-blur-xs px-1 py-0.5 rounded border border-slate-800 text-[8px] font-mono text-slate-300">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  cand.screenStatus === 'ACTIVE'
                    ? 'bg-emerald-400 animate-pulse'
                    : isScreenOffline
                    ? 'bg-rose-400'
                    : 'bg-amber-400'
                }`}
              />
              <span>SCR</span>
            </div>
          </div>

          {/* Submission / Paused Overlay */}
          {isSubmitted && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-center p-2 z-10">
              <span className="text-base mb-0.5">✓</span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                {cand.status === 'SECURITY_VIOLATION'
                  ? 'Auto-Submitted (Violation)'
                  : cand.status === 'TIME_EXPIRED'
                  ? 'Auto-Submitted (Time Out)'
                  : 'Assessment Submitted'}
              </span>
            </div>
          )}

          {isPaused && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-center p-2 z-10">
              <span className="text-base mb-0.5">⏸️</span>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Proctor Paused
              </span>
            </div>
          )}
        </div>

        {/* Status & Timer Info Strip */}
        <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100">
          <div className="flex items-center gap-1 text-slate-700 font-mono font-bold">
            <span className="text-slate-400 text-xs">⏱</span>
            <span>{formatTimeDisplay(cand.remainingSeconds, cand.durationMinutes)}</span>
          </div>

          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
              cand.status === 'IN_PROGRESS'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : cand.status === 'SUBMITTED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : cand.status === 'PAUSED'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : cand.status === 'SECURITY_VIOLATION'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {cand.status ? cand.status.replace(/_/g, ' ') : 'PENDING'}
          </span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
        <button
          onClick={() => onInspect(cand)}
          className="flex-1 py-1.5 bg-[#FF9900]/10 hover:bg-[#FF9900] text-[#FF9900] hover:text-slate-950 border border-[#FF9900]/30 hover:border-[#FF9900] font-bold rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
        >
          <span>🔍</span>
          <span>Live Inspect</span>
        </button>
        <button
          onClick={() => onTimeline(cand)}
          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
          title="View security events & proctoring audit timeline"
        >
          <span>📜</span>
          <span>{cand.securityEventsCount || 0}</span>
        </button>
        {onDeleteAttempt && (
          <button
            onClick={() => onDeleteAttempt(cand)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition cursor-pointer"
            title="Delete / Reset candidate attempt"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
});

// Built-in AWS Sample Questions Generator (10 production-ready questions)
const SAMPLE_AWS_QUESTIONS: WeeklyQuizQuestion[] = [
  {
    id: 'sample_q_1',
    question: 'Which AWS service provides resizable compute capacity in the cloud?',
    options: ['Amazon EC2', 'Amazon S3', 'Amazon RDS', 'Amazon Route 53'],
    correctOptionIndex: 0,
    marks: 1,
    explanation: 'Amazon Elastic Compute Cloud (Amazon EC2) provides scalable computing capacity in the AWS Cloud.',
    topicTag: 'Compute'
  },
  {
    id: 'sample_q_2',
    question: 'What is the primary architectural advantage of IAM roles compared to IAM users?',
    options: [
      'Roles provide temporary security credentials and avoid hardcoded keys',
      'Roles have infinite API rate limits',
      'Roles automatically create VPC endpoints',
      'Roles are exempted from billing charges'
    ],
    correctOptionIndex: 0,
    marks: 1,
    explanation: 'IAM roles delegate permissions using temporary security credentials rather than long-term access keys.',
    topicTag: 'Security & IAM'
  },
  {
    id: 'sample_q_3',
    question: 'Which Amazon S3 storage class is best suited for data accessed less than once a month with millisecond retrieval speed?',
    options: [
      'S3 Standard-Infrequent Access (S3 Standard-IA)',
      'S3 Glacier Flexible Retrieval',
      'S3 Glacier Deep Archive',
      'S3 One Zone-IA'
    ],
    correctOptionIndex: 0,
    marks: 1,
    explanation: 'S3 Standard-IA is designed for data that is accessed less frequently, but requires rapid millisecond access when needed.',
    topicTag: 'Storage'
  },
  {
    id: 'sample_q_4',
    question: 'In an Amazon VPC, which networking component enables instances in a private subnet to connect to outbound internet services while preventing inbound traffic?',
    options: ['NAT Gateway', 'Internet Gateway', 'Virtual Private Gateway', 'VPC Peering Connection'],
    correctOptionIndex: 0,
    marks: 1,
    explanation: 'A NAT Gateway enables instances in a private subnet to connect to services outside your VPC but prevents external internet services from initiating connections.',
    topicTag: 'Networking & VPC'
  },
  {
    id: 'sample_q_5',
    question: 'What AWS serverless compute service runs code in response to events and automatically manages the underlying compute resources?',
    options: ['AWS Lambda', 'Amazon EC2 Auto Scaling', 'Amazon Elastic Beanstalk', 'AWS Batch'],
    correctOptionIndex: 0,
    marks: 1,
    explanation: 'AWS Lambda is a serverless, event-driven compute service that lets you run code for virtually any type of application without provisioning servers.',
    topicTag: 'Serverless'
  },
  {
    id: 'sample_q_6',
    question: 'Which fully managed NoSQL database service delivers single-digit millisecond latency performance at any scale?',
    options: ['Amazon DynamoDB', 'Amazon RDS MySQL', 'Amazon Redshift', 'Amazon DocumentDB'],
    correctOptionIndex: 0,
    marks: 1,
    explanation: 'Amazon DynamoDB is a fully managed, serverless, key-value NoSQL database designed to run high-performance applications at any scale.',
    topicTag: 'Database'
  },
  {
    id: 'sample_q_7',
    question: 'Which AWS service functions as a globally distributed content delivery network (CDN) to securely deliver data, videos, and APIs to customers globally?',
    options: ['Amazon CloudFront', 'AWS Direct Connect', 'AWS Global Accelerator', 'Amazon Route 53 Traffic Flow'],
    correctOptionIndex: 0,
    marks: 1,
    explanation: 'Amazon CloudFront is a fast, highly secure content delivery network (CDN) service.',
    topicTag: 'Networking & CDN'
  },
  {
    id: 'sample_q_8',
    question: 'Which architectural pillar of the AWS Well-Architected Framework focuses on running workloads effectively, gaining insight into operations, and continuously improving processes?',
    options: ['Operational Excellence', 'Reliability', 'Performance Efficiency', 'Cost Optimization'],
    correctOptionIndex: 0,
    marks: 1,
    explanation: 'The Operational Excellence pillar focuses on running and monitoring systems to deliver business value, and continually improving processes.',
    topicTag: 'Architecture'
  },
  {
    id: 'sample_q_9',
    question: 'Which AWS security mechanism acts as a stateless firewall controlling traffic at the subnet level in a VPC?',
    options: ['Network Access Control Lists (NACL)', 'Security Groups', 'AWS WAF', 'AWS Shield'],
    correctOptionIndex: 0,
    marks: 1,
    explanation: 'Network ACLs (NACLs) are stateless packet filtering firewalls that operate at the subnet boundary.',
    topicTag: 'Security & VPC'
  },
  {
    id: 'sample_q_10',
    question: 'Which service allows engineers to model and provision AWS infrastructure using declarative code templates in JSON or YAML format?',
    options: ['AWS CloudFormation', 'AWS CloudTrail', 'AWS Systems Manager', 'AWS OpsWorks'],
    correctOptionIndex: 0,
    marks: 1,
    explanation: 'AWS CloudFormation provides an infrastructure as code (IaC) service that treats cloud infrastructure as code.',
    topicTag: 'DevOps & IaC'
  }
];

interface AdminWeeklyQuizProctoringProps {
  token: string;
}

export default function AdminWeeklyQuizProctoring({ token }: AdminWeeklyQuizProctoringProps) {
  // Navigation Subtabs
  const [subTab, setSubTab] = useState<'live-proctoring' | 'quizzes-editor' | 'settings'>('live-proctoring');

  // Live Data State
  const [metrics, setMetrics] = useState({
    totalCandidates: 0,
    waiting: 0,
    inProgress: 0,
    submitted: 0,
    cameraIssues: 0,
    screenIssues: 0,
    securityAlerts: 0
  });
  const [quizzes, setQuizzes] = useState<WeeklyQuiz[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [settings, setSettings] = useState<WeeklyQuizProctoringConfig>({
    requireWebcam: true,
    requireMicrophone: true,
    requireScreenShare: true,
    requireFaceDetection: true,
    detectMultipleFaces: true,
    requireFullscreen: true,
    monitorFocus: true,
    noFaceThresholdSeconds: 6,
    multipleFacesThresholdSeconds: 4,
    cameraGracePeriodSeconds: 30,
    screenGracePeriodSeconds: 20,
    fullscreenGracePeriodSeconds: 15,
    maxViolationsAllowed: 2
  });

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('All');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [isLiveViewOpen, setIsLiveViewOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [customWarningText, setCustomWarningText] = useState('');
  const [timelineEvents, setTimelineEvents] = useState<WeeklyQuizSecurityEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Deletion Modals State
  const [isDeleteQuizModalOpen, setIsDeleteQuizModalOpen] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<WeeklyQuiz | null>(null);
  const [deleteQuizConfirmText, setDeleteQuizConfirmText] = useState('');
  
  const [isDeleteAttemptModalOpen, setIsDeleteAttemptModalOpen] = useState(false);
  const [attemptToDelete, setAttemptToDelete] = useState<any | null>(null);

  const [isClearAttemptsModalOpen, setIsClearAttemptsModalOpen] = useState(false);
  const [quizToClearAttempts, setQuizToClearAttempts] = useState<string | null>(null);

  // Live WebRTC Video Refs & Diagnostic Stats in Admin Modal
  const adminCameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const adminScreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const adminCameraPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const adminScreenPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const adminStatsCollectorRef = useRef<WebRTCStatsCollector | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [liveStats, setLiveStats] = useState<WebRTCStatsSnapshot | null>(null);
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const [screenStreamActive, setScreenStreamActive] = useState(false);
  const [remoteCameraPreviewFrame, setRemoteCameraPreviewFrame] = useState<string | null>(null);
  const [remoteScreenPreviewFrame, setRemoteScreenPreviewFrame] = useState<string | null>(null);

  const [events, setEvents] = useState<any[]>([]);
  const [eligibilityMetrics, setEligibilityMetrics] = useState<any | null>(null);

  // Quiz Editor & Question Management State
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizModalTab, setQuizModalTab] = useState<'settings' | 'questions' | 'upload'>('settings');
  
  // Question Bank Manual Form State
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qFormText, setQFormText] = useState('');
  const [qFormOptions, setQFormOptions] = useState<string[]>(['', '', '', '']);
  const [qFormCorrectIndex, setQFormCorrectIndex] = useState<number>(0);
  const [qFormMarks, setQFormMarks] = useState<number>(1);
  const [qFormExplanation, setQFormExplanation] = useState('');
  const [qFormTopicTag, setQFormTopicTag] = useState('');
  const [questionSearchQuery, setQuestionSearchQuery] = useState('');

  // Bulk Upload State
  const [bulkUploadText, setBulkUploadText] = useState('');
  const [bulkUploadMode, setBulkUploadMode] = useState<'append' | 'replace'>('append');
  const [bulkUploadFeedback, setBulkUploadFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    try {
      const qParam = selectedQuizId && selectedQuizId !== 'All' ? `?quizId=${encodeURIComponent(selectedQuizId)}` : '';
      const res = await fetch(`/api/admin/weekly-quiz${qParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMetrics(data.metrics);
        setQuizzes(data.quizzes || []);
        setAttempts(data.attempts || []);
        if (data.events) setEvents(data.events || []);
        if (data.eligibilityMetrics) setEligibilityMetrics(data.eligibilityMetrics);
        if (data.settings) setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch proctoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh every 3.5 seconds
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 3500);
    return () => clearInterval(interval);
  }, [token, selectedQuizId]);

  // Handle Admin Action (Pause, Resume, Lock, Extend, Force Submit, Send Warning, Delete)
  const handleAdminAction = async (action: string, attemptId: string, extra: Record<string, any> = {}) => {
    setActionMessage(null);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/weekly-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          attemptId,
          ...extra
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Action failed.');
      }

      setActionMessage(`Action "${action}" completed successfully.`);
      setTimeout(() => setActionMessage(null), 3000);
      await fetchDashboardData();

      if (selectedCandidate && (selectedCandidate.id === attemptId || selectedCandidate.attemptId === attemptId)) {
        if (action === 'delete-attempt') {
          closeLiveView();
        } else {
          openLiveView(selectedCandidate);
        }
      }
    } catch (err: any) {
      setActionError(err.message || 'Action failed.');
      setTimeout(() => setActionError(null), 4000);
    }
  };

  // Open "View Live" Modal with Dual Stream Support & WebRTC Diagnostic Stats
  const openLiveView = async (cand: any) => {
    setSelectedCandidate(cand);
    setIsLiveViewOpen(true);
    setCameraStreamActive(false);
    setScreenStreamActive(false);
    setLiveStats(null);
    setRemoteCameraPreviewFrame(cand.cameraPreviewFrame || cand.previewFrame || null);
    setRemoteScreenPreviewFrame(cand.screenPreviewFrame || null);

    // Clean up any previous peer connections and video streams before opening new candidate
    if (adminCameraPeerConnectionRef.current) {
      adminCameraPeerConnectionRef.current.close();
      adminCameraPeerConnectionRef.current = null;
    }
    if (adminScreenPeerConnectionRef.current) {
      adminScreenPeerConnectionRef.current.close();
      adminScreenPeerConnectionRef.current = null;
    }
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (adminCameraVideoRef.current) {
      adminCameraVideoRef.current.srcObject = null;
    }
    if (adminScreenVideoRef.current) {
      adminScreenVideoRef.current.srcObject = null;
    }

    try {
      // Signal server to request High-Quality stream for selected candidate
      await fetch('/api/admin/weekly-quiz/webrtc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          attemptId: cand.id || cand.attemptId,
          targetQualityMode: 'HIGH_QUALITY'
        })
      });

      const res = await fetch(`/api/admin/weekly-quiz/webrtc?attemptId=${encodeURIComponent(cand.id || cand.attemptId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        if (data.cameraPreviewFrame || data.previewFrame) {
          setRemoteCameraPreviewFrame(data.cameraPreviewFrame || data.previewFrame);
        }
        if (data.screenPreviewFrame) {
          setRemoteScreenPreviewFrame(data.screenPreviewFrame);
        }

        const iceServers = [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ];

        // 1. Establish Camera Peer Connection
        if (data.cameraOffer || data.offer) {
          const camOffer = data.cameraOffer || data.offer;
          const camPc = new RTCPeerConnection({ iceServers });
          adminCameraPeerConnectionRef.current = camPc;

          camPc.ontrack = event => {
            if (adminCameraVideoRef.current && event.streams[0]) {
              adminCameraVideoRef.current.srcObject = event.streams[0];
              adminCameraVideoRef.current.play().catch(() => {});
              setCameraStreamActive(true);
            }
          };

          camPc.onicecandidate = async event => {
            if (event.candidate) {
              await fetch('/api/admin/weekly-quiz/webrtc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  attemptId: cand.id || cand.attemptId,
                  iceCandidate: event.candidate,
                  cameraIceCandidate: event.candidate
                })
              });
            }
          };

          await camPc.setRemoteDescription(new RTCSessionDescription(camOffer));
          const camAnswer = await camPc.createAnswer();
          await camPc.setLocalDescription(camAnswer);

          await fetch('/api/admin/weekly-quiz/webrtc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              attemptId: cand.id || cand.attemptId,
              cameraAnswer: camPc.localDescription,
              answer: camPc.localDescription
            })
          });

          const candidatesList = data.cameraCandidateIceCandidates || data.candidateIceCandidates;
          if (Array.isArray(candidatesList)) {
            for (const c of candidatesList) {
              try {
                await camPc.addIceCandidate(new RTCIceCandidate(c));
              } catch (e) {}
            }
          }

          // Start WebRTC Stats Collector
          const statsCollector = new WebRTCStatsCollector(camPc);
          adminStatsCollectorRef.current = statsCollector;
          statsIntervalRef.current = setInterval(async () => {
            const snap = await statsCollector.collectStats();
            if (snap) setLiveStats(snap);
          }, 1000);
        }

        // 2. Establish Screen Share Peer Connection
        if (data.screenOffer) {
          const scrPc = new RTCPeerConnection({ iceServers });
          adminScreenPeerConnectionRef.current = scrPc;

          scrPc.ontrack = event => {
            if (adminScreenVideoRef.current && event.streams[0]) {
              adminScreenVideoRef.current.srcObject = event.streams[0];
              adminScreenVideoRef.current.play().catch(() => {});
              setScreenStreamActive(true);
            }
          };

          scrPc.onicecandidate = async event => {
            if (event.candidate) {
              await fetch('/api/admin/weekly-quiz/webrtc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  attemptId: cand.id || cand.attemptId,
                  screenIceCandidate: event.candidate
                })
              });
            }
          };

          await scrPc.setRemoteDescription(new RTCSessionDescription(data.screenOffer));
          const scrAnswer = await scrPc.createAnswer();
          await scrPc.setLocalDescription(scrAnswer);

          await fetch('/api/admin/weekly-quiz/webrtc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              attemptId: cand.id || cand.attemptId,
              screenAnswer: scrPc.localDescription
            })
          });

          if (Array.isArray(data.screenCandidateIceCandidates)) {
            for (const c of data.screenCandidateIceCandidates) {
              try {
                await scrPc.addIceCandidate(new RTCIceCandidate(c));
              } catch (e) {}
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to connect to candidate live stream:', err);
    }
  };

  // Close Live View & Downgrade Quality Back to Grid Tier
  const closeLiveView = () => {
    if (selectedCandidate) {
      fetch('/api/admin/weekly-quiz/webrtc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          attemptId: selectedCandidate.id || selectedCandidate.attemptId,
          targetQualityMode: 'GRID'
        })
      }).catch(() => {});
    }

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (adminCameraPeerConnectionRef.current) {
      adminCameraPeerConnectionRef.current.close();
      adminCameraPeerConnectionRef.current = null;
    }
    if (adminScreenPeerConnectionRef.current) {
      adminScreenPeerConnectionRef.current.close();
      adminScreenPeerConnectionRef.current = null;
    }
    if (adminCameraVideoRef.current) {
      adminCameraVideoRef.current.srcObject = null;
    }
    if (adminScreenVideoRef.current) {
      adminScreenVideoRef.current.srcObject = null;
    }
    setIsLiveViewOpen(false);
    setSelectedCandidate(null);
    setCameraStreamActive(false);
    setScreenStreamActive(false);
    setLiveStats(null);
  };

  // Open Timeline Modal
  const openTimelineView = async (cand: any) => {
    setSelectedCandidate(cand);
    setIsTimelineOpen(true);
    setTimelineLoading(true);
    try {
      const res = await fetch(`/api/admin/weekly-quiz?action=get-timeline&attemptId=${encodeURIComponent(cand.id || cand.attemptId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTimelineEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load timeline events:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  // Save Proctoring Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAdminAction('update-settings', 'GLOBAL', { settings });
  };

  // Filter and Search Logic
  const filteredAttempts = attempts.filter(cand => {
    if (selectedQuizId !== 'All' && cand.quizId !== selectedQuizId) return false;

    if (statusFilter === 'IN_PROGRESS' && cand.status !== 'IN_PROGRESS') return false;
    if (statusFilter === 'WAITING' && cand.status !== 'WAITING' && cand.status !== 'LOCKED') return false;
    if (statusFilter === 'PAUSED' && cand.status !== 'PAUSED') return false;
    if (statusFilter === 'SUBMITTED' && cand.status !== 'SUBMITTED' && cand.status !== 'REVIEW_REQUIRED') return false;
    if (statusFilter === 'VIOLATIONS' && (cand.violationCount || 0) === 0) return false;
    if (statusFilter === 'SCREEN_OFFLINE' && cand.screenStatus !== 'DISCONNECTED' && cand.screenStatus !== 'ERROR') return false;
    if (statusFilter === 'CAMERA_OFFLINE' && cand.cameraStatus !== 'DISCONNECTED' && cand.cameraStatus !== 'ERROR') return false;
    if (statusFilter === 'REVIEW_REQUIRED' && cand.integrityRating !== 'ATTENTION' && cand.integrityRating !== 'REVIEW_REQUIRED' && (cand.violationCount || 0) < 1) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = cand.studentName?.toLowerCase().includes(q);
      const matchEmail = cand.email?.toLowerCase().includes(q);
      const matchRoll = cand.rollNumber?.toLowerCase().includes(q);
      const matchQuiz = cand.quizTitle?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchRoll && !matchQuiz) return false;
    }

    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredAttempts.length / pageSize) || 1;
  const paginatedAttempts = filteredAttempts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatTimeDisplay = (sec?: number, durationMins?: number) => {
    if (sec === undefined || sec === null || sec < 0) return `${durationMins || 20}:00`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to open manual question builder
  const handleOpenAddQuestion = () => {
    setIsAddingQuestion(true);
    setEditingQuestionId(null);
    setQFormText('');
    setQFormOptions(['', '', '', '']);
    setQFormCorrectIndex(0);
    setQFormMarks(1);
    setQFormExplanation('');
    setQFormTopicTag(editingQuiz?.topic || 'AWS Cloud');
  };

  // Helper to edit existing question in bank
  const handleEditQuestion = (q: WeeklyQuizQuestion) => {
    setIsAddingQuestion(true);
    setEditingQuestionId(q.id);
    setQFormText(q.question);
    setQFormOptions([...q.options]);
    setQFormCorrectIndex(q.correctOptionIndex);
    setQFormMarks(q.marks || 1);
    setQFormExplanation(q.explanation || '');
    setQFormTopicTag(q.topicTag || '');
  };

  // Helper to delete question from bank
  const handleDeleteQuestion = (questionId: string) => {
    if (!editingQuiz) return;
    const updatedBank = (editingQuiz.questionBank || []).filter((q: WeeklyQuizQuestion) => q.id !== questionId);
    setEditingQuiz({
      ...editingQuiz,
      questionBank: updatedBank
    });
  };

  // Save/Update manual question to bank
  const handleSaveQuestionToBank = () => {
    if (!qFormText.trim()) {
      alert('Please enter a valid question statement.');
      return;
    }
    const cleanOptions = qFormOptions.map(o => o.trim());
    if (cleanOptions.some(o => !o)) {
      alert('Please fill in all 4 option choices.');
      return;
    }

    const currentBank: WeeklyQuizQuestion[] = editingQuiz.questionBank ? [...editingQuiz.questionBank] : [];
    
    if (editingQuestionId) {
      const idx = currentBank.findIndex(q => q.id === editingQuestionId);
      if (idx !== -1) {
        currentBank[idx] = {
          id: editingQuestionId,
          question: qFormText.trim(),
          options: cleanOptions,
          correctOptionIndex: qFormCorrectIndex,
          marks: qFormMarks,
          explanation: qFormExplanation.trim(),
          topicTag: qFormTopicTag.trim()
        };
      }
    } else {
      currentBank.push({
        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        question: qFormText.trim(),
        options: cleanOptions,
        correctOptionIndex: qFormCorrectIndex,
        marks: qFormMarks,
        explanation: qFormExplanation.trim(),
        topicTag: qFormTopicTag.trim()
      });
    }

    setEditingQuiz({
      ...editingQuiz,
      questionBank: currentBank
    });

    setIsAddingQuestion(false);
    setEditingQuestionId(null);
  };

  // Load 10 Sample AWS Questions
  const handleLoadSampleAWSQuestions = () => {
    if (!editingQuiz) return;
    const currentBank: WeeklyQuizQuestion[] = editingQuiz.questionBank ? [...editingQuiz.questionBank] : [];
    const newSamples = SAMPLE_AWS_QUESTIONS.map(sq => ({
      ...sq,
      id: `q_sample_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    }));

    setEditingQuiz({
      ...editingQuiz,
      questionBank: [...currentBank, ...newSamples]
    });
    setBulkUploadFeedback({
      type: 'success',
      message: `Successfully loaded 10 standard AWS Cloud questions into the question pool.`
    });
  };

  // Parse and Import CSV or JSON text
  const handleProcessBulkQuestions = (rawText: string, mode: 'append' | 'replace') => {
    setBulkUploadFeedback(null);
    const text = rawText.trim();
    if (!text) {
      setBulkUploadFeedback({ type: 'error', message: 'Upload or paste content is empty. Please provide CSV rows or a JSON array.' });
      return;
    }

    const parsedQuestions: WeeklyQuizQuestion[] = [];
    let duplicateCount = 0;
    let malformedCount = 0;
    const seenTexts = new Set<string>();

    // If append mode, populate existing question texts
    if (mode === 'append' && editingQuiz.questionBank) {
      for (const q of editingQuiz.questionBank) {
        seenTexts.add(q.question.trim().toLowerCase());
      }
    }

    // Attempt JSON Parse
    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        const rawJson = JSON.parse(text);
        const list = Array.isArray(rawJson) ? rawJson : [rawJson];
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (!item.question || typeof item.question !== 'string' || !item.question.trim()) {
            malformedCount++;
            continue;
          }
          if (!Array.isArray(item.options) || item.options.length < 2) {
            malformedCount++;
            continue;
          }

          const qTextNorm = item.question.trim().toLowerCase();
          if (seenTexts.has(qTextNorm)) {
            duplicateCount++;
            continue;
          }
          seenTexts.add(qTextNorm);

          let correctIdx = 0;
          if (typeof item.correctOptionIndex === 'number') {
            correctIdx = item.correctOptionIndex;
          } else if (typeof item.correctAnswer === 'string') {
            const letterMatch = item.correctAnswer.toUpperCase().trim();
            if (['A', 'B', 'C', 'D'].includes(letterMatch)) {
              correctIdx = ['A', 'B', 'C', 'D'].indexOf(letterMatch);
            } else {
              const matchedIdx = item.options.findIndex((o: string) => String(o).trim().toLowerCase() === item.correctAnswer.toLowerCase());
              if (matchedIdx !== -1) correctIdx = matchedIdx;
            }
          }

          const cleanOptions = item.options.map((o: any) => String(o || '').trim()).filter(Boolean);
          if (cleanOptions.length < 2) {
            malformedCount++;
            continue;
          }

          parsedQuestions.push({
            id: item.id || `q_bulk_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            question: item.question.trim(),
            options: cleanOptions,
            correctOptionIndex: Math.max(0, Math.min(cleanOptions.length - 1, isNaN(Number(correctIdx)) ? 0 : Number(correctIdx))),
            marks: Math.max(1, Number(item.marks) || 1),
            explanation: item.explanation ? String(item.explanation).trim() : '',
            topicTag: item.topicTag ? String(item.topicTag).trim() : editingQuiz?.topic || 'AWS'
          });
        }
      } catch (e: any) {
        setBulkUploadFeedback({ type: 'error', message: `Invalid JSON syntax: ${e.message}` });
        return;
      }
    } else {
      // Attempt CSV / TSV Parse
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Handle CSV comma splitting with quotes support
        const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        if (parts.length < 3) {
          malformedCount++;
          continue;
        }
        
        // Skip header line if detected
        if (i === 0 && parts[0].toLowerCase().includes('question') && parts[1]?.toLowerCase().includes('option')) {
          continue;
        }

        const question = parts[0]?.trim();
        if (!question) {
          malformedCount++;
          continue;
        }

        const optA = parts[1] || '';
        const optB = parts[2] || '';
        const optC = parts[3] || '';
        const optD = parts[4] || '';
        const options = [optA, optB, optC, optD].map(s => s.trim()).filter(Boolean);
        if (options.length < 2) {
          malformedCount++;
          continue;
        }

        const qTextNorm = question.toLowerCase();
        if (seenTexts.has(qTextNorm)) {
          duplicateCount++;
          continue;
        }
        seenTexts.add(qTextNorm);

        const rawCorrect = parts[5] || 'A';
        let correctIdx = 0;
        const letter = rawCorrect.toUpperCase().trim();
        if (['A', 'B', 'C', 'D'].includes(letter)) {
          correctIdx = ['A', 'B', 'C', 'D'].indexOf(letter);
        } else if (!isNaN(Number(rawCorrect))) {
          const num = Number(rawCorrect);
          correctIdx = num >= 1 && num <= options.length ? num - 1 : Math.max(0, num);
        }

        const explanation = parts[6] || '';
        const marks = Math.max(1, Number(parts[7]) || 1);
        const topicTag = parts[8] || editingQuiz?.topic || 'AWS';

        parsedQuestions.push({
          id: `q_csv_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          question,
          options,
          correctOptionIndex: Math.max(0, Math.min(options.length - 1, correctIdx)),
          marks,
          explanation,
          topicTag
        });
      }
    }

    if (parsedQuestions.length === 0) {
      setBulkUploadFeedback({
        type: 'error',
        message: `No valid questions imported. ${
          duplicateCount > 0 ? `${duplicateCount} duplicate questions skipped. ` : ''
        }${malformedCount > 0 ? `${malformedCount} questions had missing options/format errors.` : 'Please check file structure.'}`
      });
      return;
    }

    const currentBank = editingQuiz.questionBank || [];
    const newBank = mode === 'replace' ? parsedQuestions : [...currentBank, ...parsedQuestions];

    setEditingQuiz({
      ...editingQuiz,
      questionBank: newBank
    });

    const infoParts = [
      `Successfully imported ${parsedQuestions.length} questions into the bank (${mode === 'replace' ? 'Replaced Bank' : 'Appended to Bank'}).`
    ];
    if (duplicateCount > 0) infoParts.push(`(${duplicateCount} duplicates filtered)`);
    if (malformedCount > 0) infoParts.push(`(${malformedCount} malformed rows skipped)`);

    setBulkUploadFeedback({
      type: 'success',
      message: infoParts.join(' ')
    });
    setBulkUploadText('');
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        setBulkUploadText(content);
        handleProcessBulkQuestions(content, bulkUploadMode);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Top Banner & Navigation Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-[#FF9900]/15 text-[#EA580C] border border-[#FF9900]/30">
                AWS SBG CU-UP
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Invigilation Hub • 200 Scaled
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-[#0B192C] tracking-tight">
              Weekly Session Assessment Invigilation
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time dual stream telemetry (Webcam HD &amp; Screen Share), server-authoritative timer synchronization, and 2-violation automated policy enforcement.
            </p>
          </div>

          {/* Subtab Navigation Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0 text-xs">
            <button
              onClick={() => setSubTab('live-proctoring')}
              className={`px-3.5 py-2 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'live-proctoring'
                  ? 'bg-white text-[#0B192C] shadow-xs'
                  : 'text-slate-600 hover:text-[#0B192C]'
              }`}
            >
              <span>📹</span>
              <span>Live Proctoring Hub ({filteredAttempts.length})</span>
            </button>
            <button
              onClick={() => setSubTab('quizzes-editor')}
              className={`px-3.5 py-2 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'quizzes-editor'
                  ? 'bg-white text-[#0B192C] shadow-xs'
                  : 'text-slate-600 hover:text-[#0B192C]'
              }`}
            >
              <span>📝</span>
              <span>Weekly Quizzes &amp; Scheduling ({quizzes.length})</span>
            </button>
            <button
              onClick={() => setSubTab('settings')}
              className={`px-3.5 py-2 font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'settings'
                  ? 'bg-white text-[#0B192C] shadow-xs'
                  : 'text-slate-600 hover:text-[#0B192C]'
              }`}
            >
              <span>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Action Alert Banners */}
        {actionMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <span>✓</span>
            <span>{actionMessage}</span>
          </div>
        )}
        {actionError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{actionError}</span>
          </div>
        )}

        {/* Session Summary Panel: Primary Funnel Metrics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Live Session Activity &amp; Funnel Metrics
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Auto-syncing every 3.5s</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* 1. Eligible */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/5 to-white border border-amber-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Eligible</span>
                <span className="text-xs font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Roster</span>
              </div>
              <div className="text-2xl font-extrabold text-[#0B192C] mt-1.5 font-mono">
                {eligibilityMetrics?.totalEligible ?? metrics.totalCandidates}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Registered for session</span>
            </div>

            {/* 2. Started */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-500/5 to-white border border-sky-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-sky-800">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Started</span>
                <span className="text-xs font-bold bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">Attempts</span>
              </div>
              <div className="text-2xl font-extrabold text-[#0B192C] mt-1.5 font-mono">
                {eligibilityMetrics?.totalStarted ?? attempts.length}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Initiated attempts</span>
            </div>

            {/* 3. Not Started */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-500/5 to-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Not Started</span>
                <span className="text-xs font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">Pending</span>
              </div>
              <div className="text-2xl font-extrabold text-[#0B192C] mt-1.5 font-mono">
                {eligibilityMetrics?.totalNotStarted ?? Math.max(0, (eligibilityMetrics?.totalEligible || 0) - attempts.length)}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Awaiting launch</span>
            </div>

            {/* 4. Active (Taking Test) */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-500/5 to-white border border-blue-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-blue-800">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Active</span>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded animate-pulse">Live</span>
              </div>
              <div className="text-2xl font-extrabold text-[#0B192C] mt-1.5 font-mono">
                {eligibilityMetrics?.totalInProgress ?? metrics.inProgress}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">In-progress / Paused</span>
            </div>

            {/* 5. Submitted */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-500/5 to-white border border-emerald-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Submitted</span>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Finished</span>
              </div>
              <div className="text-2xl font-extrabold text-[#0B192C] mt-1.5 font-mono">
                {eligibilityMetrics?.totalSubmitted ?? metrics.submitted}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Regular submissions</span>
            </div>

            {/* 6. Auto-Submitted */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-rose-500/5 to-white border border-rose-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-rose-800">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Auto Submitted</span>
                <span className="text-xs font-bold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">Enforced</span>
              </div>
              <div className="text-2xl font-extrabold text-[#0B192C] mt-1.5 font-mono">
                {eligibilityMetrics?.totalAutoSubmitted ?? attempts.filter(a => a.submissionReason === 'TIME_EXPIRED' || a.submissionReason === 'SECURITY_VIOLATION').length}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Timeout / Violation</span>
            </div>
          </div>
        </div>
      </div>

      {/* SUBTAB 1: LIVE PROCTORING HUB */}
      {subTab === 'live-proctoring' && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Quiz Selector, Filters, Grid/Table Toggle, Refresh */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Quiz Selection Dropdown */}
              <div className="flex items-center gap-1.5 min-w-[200px]">
                <span className="text-slate-500 font-bold text-[11px]">Quiz:</span>
                <select
                  value={selectedQuizId}
                  onChange={e => {
                    setSelectedQuizId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-[#FF9900]"
                >
                  <option value="All">All Active Weekly Quizzes</option>
                  {quizzes.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.quizCode}: {q.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Search Input */}
              <div className="relative flex-1 min-w-[180px]">
                <input
                  type="text"
                  placeholder="Search student name, email, roll no..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF9900]"
                />
                <span className="absolute left-2.5 top-2 text-slate-400">🔍</span>
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
                {['All', 'IN_PROGRESS', 'SUBMITTED', 'PAUSED', 'VIOLATIONS', 'SCREEN_OFFLINE', 'CAMERA_OFFLINE'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => {
                      setStatusFilter(filter);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 font-bold rounded-lg text-[11px] whitespace-nowrap transition cursor-pointer ${
                      statusFilter === filter
                        ? 'bg-white text-[#0B192C] shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filter.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Clear Attempts Bulk Button */}
              {attempts.length > 0 && (
                <button
                  onClick={() => {
                    setQuizToClearAttempts(selectedQuizId === 'All' ? (quizzes[0]?.id || '') : selectedQuizId);
                    setIsClearAttemptsModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
                  title="Clear / Reset all test attempts for testing"
                >
                  <span>🗑️</span>
                  <span>Clear Attempts</span>
                </button>
              )}

              {/* Grid / Table Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                  title="Grid View"
                >
                  <span>▦</span>
                  <span>Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1 ${
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                  title="Table View"
                >
                  <span>☰</span>
                  <span>Table</span>
                </button>
              </div>

              {/* Page Size Selector */}
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none"
              >
                <option value={12}>12 / page</option>
                <option value={24}>24 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
                <option value={200}>200 / page</option>
              </select>

              {/* Manual Refresh Button */}
              <button
                onClick={fetchDashboardData}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 font-bold transition cursor-pointer"
                title="Refresh Live Data"
              >
                🔄
              </button>
            </div>
          </div>

          {/* CANDIDATES PRESENTATION: GRID OR TABLE */}
          {loading ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl">
              <span className="inline-block w-6 h-6 border-2 border-[#FF9900] border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs text-slate-500 font-medium">Syncing active proctoring feeds and peer connections...</p>
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 space-y-2">
              <span className="text-3xl">📭</span>
              <h4 className="font-bold text-slate-800 text-sm">No Candidate Attempts Found</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No active or submitted assessment sessions match your selected filter criteria. Candidates will appear here as soon as they start their Weekly Quiz.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
              {paginatedAttempts.map(cand => (
                <CandidateGridCard
                  key={cand.id || cand.attemptId}
                  cand={cand}
                  onInspect={openLiveView}
                  onTimeline={openTimelineView}
                  onDeleteAttempt={cand => {
                    setAttemptToDelete(cand);
                    setIsDeleteAttemptModalOpen(true);
                  }}
                  formatTimeDisplay={formatTimeDisplay}
                />
              ))}
            </div>
          ) : (
            /* Tabular Data View */
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Quiz &amp; Session</th>
                    <th className="px-3 py-3 text-center">Camera</th>
                    <th className="px-3 py-3 text-center">Screen</th>
                    <th className="px-3 py-3 text-center">Violations</th>
                    <th className="px-3 py-3 text-center">Time</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedAttempts.map(cand => (
                    <tr key={cand.id || cand.attemptId} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <div>{cand.studentName}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">{cand.rollNumber}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 select-all">{cand.email}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-800 max-w-[150px] truncate">
                        <div>{cand.quizTitle}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">{cand.quizCode}</div>
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        {cand.cameraStatus === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Offline
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        {cand.screenStatus === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Offline
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                            (cand.violationCount || 0) >= 2
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : (cand.violationCount || 0) === 1
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {cand.violationCount || 0} / 2
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-center font-mono font-bold text-[11px] text-slate-800">
                        {formatTimeDisplay(cand.remainingSeconds, cand.durationMinutes)}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            cand.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : cand.status === 'SUBMITTED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : cand.status === 'SECURITY_VIOLATION'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {cand.status ? cand.status.replace(/_/g, ' ') : 'PENDING'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openLiveView(cand)}
                            className="px-3 py-1 bg-[#FF9900]/10 hover:bg-[#FF9900] text-[#FF9900] hover:text-slate-950 border border-[#FF9900]/30 font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Live Inspect
                          </button>
                          <button
                            onClick={() => openTimelineView(cand)}
                            className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Events ({cand.securityEventsCount || 0})
                          </button>
                          <button
                            onClick={() => {
                              setAttemptToDelete(cand);
                              setIsDeleteAttemptModalOpen(true);
                            }}
                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-xs transition cursor-pointer"
                            title="Delete / Reset Attempt"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-600">
            <div>
              Showing candidates <strong>{Math.min(filteredAttempts.length, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
              <strong>{Math.min(filteredAttempts.length, currentPage * pageSize)}</strong> of{' '}
              <strong>{filteredAttempts.length}</strong> total
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="font-mono font-bold text-slate-800">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: QUIZZES & SESSION SCHEDULING */}
      {subTab === 'quizzes-editor' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div>
              <h3 className="text-base font-extrabold text-[#0B192C]">Weekly Quizzes &amp; Session Scheduling</h3>
              <p className="text-xs text-slate-500">Configure session-specific Weekly Quizzes, date &amp; time windows, and question banks.</p>
            </div>
            <button
              onClick={() => {
                setEditingQuiz({
                  quizCode: `AWS-WEEK-${String(quizzes.length + 1).padStart(2, '0')}`,
                  title: `Weekly AWS Quiz #${String(quizzes.length + 1).padStart(2, '0')}`,
                  topic: 'Amazon EC2, VPC Networking & IAM Roles',
                  description: '',
                  sessionId: events[0]?.id || 'event-01',
                  sessionTitle: events[0]?.title || 'Introduction to AWS Cloud & Architecture',
                  scheduledDate: new Date().toISOString().split('T')[0],
                  startTime: '10:00',
                  endTime: '10:30',
                  timezone: 'Asia/Kolkata',
                  durationMinutes: 20,
                  totalQuestionsToSelect: 20,
                  passingPercentage: 60,
                  status: 'Live',
                  questionBank: []
                });
                setQuizModalTab('settings');
                setIsQuizModalOpen(true);
              }}
              className="px-4 py-2.5 bg-[#FF9900] hover:bg-[#E08800] text-slate-950 text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              + Create Weekly Quiz
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzes.map((q, qIdx) => (
              <div key={`${q.id || 'quiz'}_${qIdx}`} className="p-5 border border-slate-200 rounded-2xl bg-slate-50/60 space-y-3.5 shadow-2xs hover:border-[#FF9900]/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF9900]/15 text-[#EA580C] border border-[#FF9900]/30">
                    {q.quizCode}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 font-mono">
                      Session: {q.sessionId || 'None'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {q.status}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{q.title}</h4>
                  <p className="text-xs text-slate-600 mt-0.5">{q.topic}</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Linked Event: <strong className="text-slate-800">{q.sessionTitle || q.sessionId || 'N/A'}</strong>
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Schedule Window:</span>
                    <strong className="font-mono text-slate-900">
                      {q.scheduledDate || 'Active'} • {q.startTime || '10:00'} – {q.endTime || '10:30'} ({q.timezone || 'IST'})
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Duration / Passing:</span>
                    <span className="font-bold text-slate-800">{q.durationMinutes} Mins • {q.passingPercentage || 60}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{q.questionBank?.length || 0} Questions in Bank</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingQuiz({ ...q });
                        setQuizModalTab('settings');
                        setIsQuizModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#FF9900] text-xs font-bold rounded-xl text-slate-800 transition cursor-pointer"
                    >
                      Edit &amp; Schedule →
                    </button>
                    <button
                      onClick={() => {
                        setQuizToDelete(q);
                        setDeleteQuizConfirmText('');
                        setIsDeleteQuizModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
                      title="Delete Weekly Quiz"
                    >
                      <span>🗑️</span>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: PROCTORING SETTINGS */}
      {subTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-6 max-w-3xl">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-extrabold text-[#0B192C]">Configurable Weekly Quiz Proctoring Policies</h3>
            <p className="text-xs text-slate-500">Adjust integrity thresholds, camera grace periods, and automated proctoring enforcement.</p>
          </div>

          <div className="space-y-3.5 text-xs text-slate-900">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <div className="font-bold text-slate-900">Webcam Monitoring &amp; Face Detection</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Require active candidate camera feed and single-face verification</div>
              </div>
              <input
                type="checkbox"
                checked={settings.requireWebcam}
                onChange={e => setSettings({ ...settings, requireWebcam: e.target.checked })}
                className="w-4 h-4 rounded text-[#FF9900] focus:ring-[#FF9900]"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <div className="font-bold text-slate-900">Screen Sharing Requirement</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Require entire desktop sharing during proctored quiz session</div>
              </div>
              <input
                type="checkbox"
                checked={true}
                readOnly
                className="w-4 h-4 rounded text-[#FF9900] opacity-75"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <div className="font-bold text-slate-900">Two-Violation Policy Enforcement</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Server-authoritative warning on 1st violation, automatic lock on 2nd</div>
              </div>
              <input
                type="checkbox"
                checked={true}
                readOnly
                className="w-4 h-4 rounded text-[#FF9900] opacity-75"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div>
                <label className="block font-bold text-slate-800 mb-1">No Face Threshold (Seconds)</label>
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={settings.noFaceThresholdSeconds}
                  onChange={e => setSettings({ ...settings, noFaceThresholdSeconds: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Camera Grace Period (Seconds)</label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={settings.cameraGracePeriodSeconds}
                  onChange={e => setSettings({ ...settings, cameraGracePeriodSeconds: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#FF9900]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Fullscreen Grace Period (Seconds)</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={settings.fullscreenGracePeriodSeconds}
                  onChange={e => setSettings({ ...settings, fullscreenGracePeriodSeconds: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#FF9900]"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-[#FF9900] hover:bg-[#E08800] text-slate-950 text-xs font-extrabold rounded-xl shadow-xs transition cursor-pointer"
          >
            Save Proctoring Policies
          </button>
        </form>
      )}

      {/* ======================================================== */}
      {/* 1. DEEP LIVE CANDIDATE WORKSTATION INSPECTION MODAL */}
      {/* ======================================================== */}
      {isLiveViewOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-5xl w-full bg-[#0B192C] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-sm text-[#FF9900]">
                  {selectedCandidate.studentName?.slice(0, 2)?.toUpperCase() || 'ST'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">{selectedCandidate.studentName}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                      {selectedCandidate.rollNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FF9900]/20 text-[#FF9900]">
                      {selectedCandidate.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedCandidate.email} • Quiz: {selectedCandidate.quizTitle}
                  </div>
                </div>
              </div>

              <button
                onClick={closeLiveView}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Video Feeds & Telemetry HUD */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Dual Video Stream HUD */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Webcam Live Viewport */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Candidate HD Webcam Stream
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {cameraStreamActive ? 'WebRTC P2P (Live)' : remoteCameraPreviewFrame ? 'Preview Frame Active' : 'Connecting...'}
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl aspect-video overflow-hidden relative flex items-center justify-center shadow-inner">
                    <video
                      ref={adminCameraVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transform scale-x-[-1] ${cameraStreamActive ? 'block' : 'hidden'}`}
                    />
                    {!cameraStreamActive && remoteCameraPreviewFrame && (
                      <img
                        src={remoteCameraPreviewFrame}
                        alt="Candidate Webcam Preview"
                        className="w-full h-full object-cover transform scale-x-[-1]"
                      />
                    )}
                    {!cameraStreamActive && !remoteCameraPreviewFrame && (
                      <div className="text-center p-4 space-y-2">
                        <span className="text-3xl">📹</span>
                        <p className="text-xs text-slate-400 font-mono">Negotiating peer-to-peer camera session...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Screen Share Live Viewport */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Candidate Desktop Screen Share
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {screenStreamActive ? 'Screen Stream (Live)' : remoteScreenPreviewFrame ? 'Screen Preview Active' : 'Connecting...'}
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl aspect-video overflow-hidden relative flex items-center justify-center shadow-inner">
                    <video
                      ref={adminScreenVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${screenStreamActive ? 'block' : 'hidden'}`}
                    />
                    {!screenStreamActive && remoteScreenPreviewFrame && (
                      <img
                        src={remoteScreenPreviewFrame}
                        alt="Candidate Screen Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    {!screenStreamActive && !remoteScreenPreviewFrame && (
                      <div className="text-center p-4 space-y-2">
                        <span className="text-3xl">🖥️</span>
                        <p className="text-xs text-slate-400 font-mono">Screen stream negotiation in progress...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* WebRTC Diagnostics & Telemetry HUD */}
              {liveStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 text-xs font-mono">
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Resolution</span>
                    <strong className="text-white text-xs">{liveStats.frameWidth || 1280}x{liveStats.frameHeight || 720}</strong>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Framerate</span>
                    <strong className="text-emerald-400 text-xs">{liveStats.fps || 30} FPS</strong>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Bitrate</span>
                    <strong className="text-white text-xs">{(liveStats.bitrateKbps || 450).toFixed(0)} kbps</strong>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">RTT Latency</span>
                    <strong className="text-amber-400 text-xs">{(liveStats.rttMs || 42).toFixed(0)} ms</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: Proctor Actions */}
            <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsWarningModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  ⚠️ Issue Warning
                </button>
                {selectedCandidate.status === 'PAUSED' ? (
                  <button
                    onClick={() => handleAdminAction('resume-candidate', selectedCandidate.id || selectedCandidate.attemptId)}
                    className="px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    ▶️ Resume Quiz
                  </button>
                ) : (
                  <button
                    onClick={() => handleAdminAction('pause-candidate', selectedCandidate.id || selectedCandidate.attemptId)}
                    className="px-3.5 py-2 bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-slate-950 border border-blue-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    ⏸️ Pause Quiz
                  </button>
                )}
                <button
                  onClick={() => handleAdminAction('extend-time', selectedCandidate.id || selectedCandidate.attemptId, { minutes: 5 })}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  +5m Time Extension
                </button>
                <button
                  onClick={() => handleAdminAction('force-submit', selectedCandidate.id || selectedCandidate.attemptId)}
                  className="px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  🛑 Force Finalize
                </button>
                <button
                  onClick={() => {
                    setAttemptToDelete(selectedCandidate);
                    setIsDeleteAttemptModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <span>🗑️</span>
                  <span>Delete Attempt</span>
                </button>
              </div>

              <button
                onClick={closeLiveView}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ACTIVITY & PROCTORING TIMELINE MODAL */}
      {/* ======================================================== */}
      {isTimelineOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#0B192C] border border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">Security &amp; Proctoring Audit Trail</h3>
                <p className="text-xs text-slate-400">
                  {selectedCandidate.studentName} ({selectedCandidate.rollNumber})
                </p>
              </div>
              <button
                onClick={() => setIsTimelineOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 text-xs">
              {timelineLoading ? (
                <div className="p-8 text-center text-slate-400">Loading audit trail...</div>
              ) : timelineEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No security events logged for this candidate.</div>
              ) : (
                timelineEvents.map(ev => (
                  <div key={ev.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400">{ev.eventType}</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {ev.metadata?.reason && <p className="text-slate-300">{ev.metadata.reason}</p>}
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-900 text-slate-400">
                      Severity: {ev.severity}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setIsTimelineOpen(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer transition"
            >
              Close Activity Timeline
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. QUIZ CREATE / EDIT / QUESTION BANK MODAL */}
      {/* ======================================================== */}
      {isQuizModalOpen && editingQuiz && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-slate-900 space-y-5 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#FF9900]/15 text-[#EA580C] border border-[#FF9900]/30">
                    {editingQuiz.quizCode || 'NEW'}
                  </span>
                  <h3 className="text-lg font-extrabold text-[#0B192C]">
                    {editingQuiz.id ? 'Edit Weekly Quiz & Questions' : 'Create Weekly Quiz'}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure session scheduling, duration, and question pool (Manual / JSON / CSV upload).
                </p>
              </div>
              <button
                onClick={() => {
                  setIsQuizModalOpen(false);
                  setEditingQuiz(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs inside Quiz Modal */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
              <button
                onClick={() => setQuizModalTab('settings')}
                className={`px-4 py-2 font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  quizModalTab === 'settings'
                    ? 'bg-[#0B192C] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>⚙️</span>
                <span>Quiz &amp; Schedule Settings</span>
              </button>
              <button
                onClick={() => setQuizModalTab('questions')}
                className={`px-4 py-2 font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  quizModalTab === 'questions'
                    ? 'bg-[#0B192C] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>📚</span>
                <span>Question Bank ({editingQuiz.questionBank?.length || 0})</span>
              </button>
              <button
                onClick={() => setQuizModalTab('upload')}
                className={`px-4 py-2 font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  quizModalTab === 'upload'
                    ? 'bg-[#FF9900] text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>📤</span>
                <span>Upload Questions (CSV / JSON)</span>
              </button>
            </div>

            {/* Modal Body Tabs */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* TAB 1: GENERAL & SCHEDULE SETTINGS */}
              {quizModalTab === 'settings' && (
                <div className="space-y-4">
                  {/* Linked Session Selector */}
                  <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-200 space-y-2">
                    <label className="block font-bold text-amber-900 uppercase tracking-wider text-[11px]">
                      Associated AWS Session (Eligibility Bound) *
                    </label>
                    <select
                      value={editingQuiz.sessionId || ''}
                      onChange={e => {
                        const selectedId = e.target.value;
                        const match = events.find(ev => ev.id === selectedId);
                        setEditingQuiz({
                          ...editingQuiz,
                          sessionId: selectedId,
                          sessionTitle: match ? match.title : editingQuiz.sessionTitle
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Select Session --</option>
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>
                          {ev.eventNumber ? `Session ${ev.eventNumber}: ` : ''}{ev.title} ({ev.id})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      Only candidates registered for this exact session in the system will be eligible to access this Weekly Quiz.
                    </p>
                  </div>

                  {/* Schedule Date, Start Time, End Time, Timezone */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <label className="block font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Scheduled Timing &amp; Authoritative Boundaries
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-slate-600 mb-1">Quiz Date</label>
                        <input
                          type="date"
                          value={editingQuiz.scheduledDate || ''}
                          onChange={e => setEditingQuiz({ ...editingQuiz, scheduledDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={editingQuiz.startTime || '10:00'}
                          onChange={e => setEditingQuiz({ ...editingQuiz, startTime: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">End Time</label>
                        <input
                          type="time"
                          value={editingQuiz.endTime || '10:30'}
                          onChange={e => setEditingQuiz({ ...editingQuiz, endTime: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-1">Timezone</label>
                        <select
                          value={editingQuiz.timezone || 'Asia/Kolkata'}
                          onChange={e => setEditingQuiz({ ...editingQuiz, timezone: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900"
                        >
                          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                          <option value="UTC">UTC / GMT</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Basic Quiz Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Quiz Code</label>
                      <input
                        type="text"
                        value={editingQuiz.quizCode || ''}
                        onChange={e => setEditingQuiz({ ...editingQuiz, quizCode: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold"
                        placeholder="AWS-WEEK-05"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Quiz Status</label>
                      <select
                        value={editingQuiz.status || 'Live'}
                        onChange={e => setEditingQuiz({ ...editingQuiz, status: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900"
                      >
                        <option value="Live">Live / Active</option>
                        <option value="Draft">Draft</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Quiz Title</label>
                    <input
                      type="text"
                      value={editingQuiz.title || ''}
                      onChange={e => setEditingQuiz({ ...editingQuiz, title: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold"
                      placeholder="Weekly AWS Quiz #05: Serverless Architecture & Lambda"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Topic / Subject</label>
                    <input
                      type="text"
                      value={editingQuiz.topic || ''}
                      onChange={e => setEditingQuiz({ ...editingQuiz, topic: e.target.value })}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900"
                      placeholder="AWS Lambda, API Gateway & Step Functions"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Duration (Minutes)</label>
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={editingQuiz.durationMinutes || 20}
                        onChange={e => setEditingQuiz({ ...editingQuiz, durationMinutes: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Questions to Select</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editingQuiz.totalQuestionsToSelect || 20}
                        onChange={e => setEditingQuiz({ ...editingQuiz, totalQuestionsToSelect: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Passing Percentage (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editingQuiz.passingPercentage || 60}
                        onChange={e => setEditingQuiz({ ...editingQuiz, passingPercentage: Number(e.target.value) })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: INTERACTIVE QUESTION BANK */}
              {quizModalTab === 'questions' && (
                <div className="space-y-4">
                  {/* Question Bank Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800">
                        {editingQuiz.questionBank?.length || 0} Questions in Pool
                      </span>
                      <span className="text-[11px] text-slate-500">
                        (Randomly sampled per student attempt)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleOpenAddQuestion}
                        className="px-3 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
                      >
                        <span>+</span>
                        <span>Add Question</span>
                      </button>
                      <button
                        onClick={handleLoadSampleAWSQuestions}
                        className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold rounded-xl text-xs transition cursor-pointer"
                        title="Load 10 Standard AWS Questions"
                      >
                        ⚡ Load Sample AWS (10)
                      </button>
                    </div>
                  </div>

                  {/* Manual Question Add/Edit Form */}
                  {isAddingQuestion && (
                    <div className="p-4 bg-amber-500/5 border border-amber-300 rounded-2xl space-y-3.5">
                      <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                        <h4 className="font-bold text-amber-900">
                          {editingQuestionId ? 'Edit Question' : 'Create New Question'}
                        </h4>
                        <button
                          onClick={() => setIsAddingQuestion(false)}
                          className="text-slate-400 hover:text-slate-700 font-bold text-xs"
                        >
                          Cancel
                        </button>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Question Statement *</label>
                        <textarea
                          rows={2}
                          value={qFormText}
                          onChange={e => setQFormText(e.target.value)}
                          placeholder="e.g. Which AWS service provides resizable compute capacity in the cloud?"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#FF9900]"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-slate-700 font-bold">Options (Select the correct answer option radio) *</label>
                        {qFormOptions.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correctOption"
                              checked={qFormCorrectIndex === idx}
                              onChange={() => setQFormCorrectIndex(idx)}
                              className="w-4 h-4 text-[#FF9900] focus:ring-[#FF9900] cursor-pointer"
                              title={`Mark Option ${String.fromCharCode(65 + idx)} as correct`}
                            />
                            <span className="w-6 font-bold font-mono text-slate-600 text-center">
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <input
                              type="text"
                              value={opt}
                              onChange={e => {
                                const newOpts = [...qFormOptions];
                                newOpts[idx] = e.target.value;
                                setQFormOptions(newOpts);
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                              className={`flex-1 px-3 py-1.5 bg-white border rounded-xl text-xs ${
                                qFormCorrectIndex === idx
                                  ? 'border-emerald-400 bg-emerald-50/30'
                                  : 'border-slate-300'
                              } focus:outline-none`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-700 font-bold mb-1">Marks / Points</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={qFormMarks}
                            onChange={e => setQFormMarks(Number(e.target.value))}
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-slate-700 font-bold mb-1">Topic / Category Tag</label>
                          <input
                            type="text"
                            value={qFormTopicTag}
                            onChange={e => setQFormTopicTag(e.target.value)}
                            placeholder="e.g. Compute, Security, Storage"
                            className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Explanation (Shown after attempt submission)</label>
                        <textarea
                          rows={2}
                          value={qFormExplanation}
                          onChange={e => setQFormExplanation(e.target.value)}
                          placeholder="Optional explanation of the correct solution..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setIsAddingQuestion(false)}
                          className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveQuestionToBank}
                          className="px-4 py-1.5 bg-[#FF9900] hover:bg-[#E08800] text-slate-950 font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                        >
                          {editingQuestionId ? 'Update Question' : '+ Add Question to Pool'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Search Questions */}
                  {(editingQuiz.questionBank?.length || 0) > 0 && (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search questions in bank by keyword..."
                        value={questionSearchQuery}
                        onChange={e => setQuestionSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                      />
                      <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                    </div>
                  )}

                  {/* Questions List */}
                  {(!editingQuiz.questionBank || editingQuiz.questionBank.length === 0) ? (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500 space-y-2">
                      <span className="text-2xl">📝</span>
                      <h4 className="font-bold text-slate-700">Question Pool is Currently Empty</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Add questions manually, or use the <strong>Upload &amp; Import</strong> tab to import CSV / JSON question banks instantly.
                      </p>
                      <button
                        onClick={handleLoadSampleAWSQuestions}
                        className="mt-2 px-3.5 py-1.5 bg-[#FF9900] text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                      >
                        ⚡ Load 10 Sample AWS Questions Now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {editingQuiz.questionBank
                        .filter((q: WeeklyQuizQuestion) => {
                          if (!questionSearchQuery.trim()) return true;
                          const term = questionSearchQuery.toLowerCase();
                          return q.question.toLowerCase().includes(term) || q.topicTag?.toLowerCase().includes(term);
                        })
                        .map((q: WeeklyQuizQuestion, idx: number) => (
                          <div key={q.id || idx} className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono font-bold text-[11px] shrink-0">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-900 text-xs">{q.question}</p>
                                  {q.topicTag && (
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-200/80 text-slate-600 text-[10px] font-mono">
                                      {q.topicTag}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => handleEditQuestion(q)}
                                  className="p-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs cursor-pointer"
                                  title="Edit question"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs cursor-pointer"
                                  title="Delete question from bank"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                              {q.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className={`p-1.5 rounded-lg border flex items-center justify-between ${
                                    q.correctOptionIndex === optIdx
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <span>
                                    <strong className="font-mono mr-1">{String.fromCharCode(65 + optIdx)}.</strong>
                                    {opt}
                                  </span>
                                  {q.correctOptionIndex === optIdx && (
                                    <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1 rounded font-bold">
                                      ✓ Correct
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>

                            {q.explanation && (
                              <p className="text-[10px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                                💡 Explanation: {q.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BULK UPLOAD & IMPORT */}
              {quizModalTab === 'upload' && (
                <div className="space-y-4">
                  {bulkUploadFeedback && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                        bulkUploadFeedback.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      <span>{bulkUploadFeedback.type === 'success' ? '✓' : '⚠️'}</span>
                      <span>{bulkUploadFeedback.message}</span>
                    </div>
                  )}

                  {/* Template download & Quick Sample Actions */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">Fast Upload Helpers &amp; Templates</h4>
                      <p className="text-[11px] text-slate-500">
                        Supports JSON Arrays or CSV with columns: Question, Option A, Option B, Option C, Option D, Correct Option, Explanation, Marks.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleLoadSampleAWSQuestions}
                        className="px-3 py-1.5 bg-[#FF9900] text-slate-950 font-bold rounded-xl text-xs hover:bg-[#E08800] transition cursor-pointer"
                      >
                        ⚡ 1-Click Load 10 AWS Questions
                      </button>
                      <button
                        onClick={() => {
                          const jsonTemplate = JSON.stringify(SAMPLE_AWS_QUESTIONS.slice(0, 2), null, 2);
                          navigator.clipboard.writeText(jsonTemplate);
                          alert('JSON template copied to clipboard!');
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-800 font-bold rounded-xl text-xs hover:bg-slate-50 transition cursor-pointer"
                      >
                        📋 Copy JSON Template
                      </button>
                      <button
                        onClick={() => {
                          const csvTemplate = 'Question,Option A,Option B,Option C,Option D,Correct Option,Explanation,Marks,Topic\n"Which AWS service is serverless compute?","AWS Lambda","Amazon EC2","Amazon RDS","Amazon S3","A","AWS Lambda is event-driven serverless compute",1,"Compute"';
                          navigator.clipboard.writeText(csvTemplate);
                          alert('CSV template copied to clipboard!');
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-800 font-bold rounded-xl text-xs hover:bg-slate-50 transition cursor-pointer"
                      >
                        📋 Copy CSV Template
                      </button>
                    </div>
                  </div>

                  {/* Drag & Drop File Upload Input */}
                  <div className="border-2 border-dashed border-slate-300 hover:border-[#FF9900] rounded-2xl p-6 text-center bg-slate-50/50 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <span className="text-3xl block mb-2">📁</span>
                    <h5 className="font-bold text-slate-800 text-xs">Click to browse or drag &amp; drop question file</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">Supports .JSON and .CSV question bank files</p>
                  </div>

                  {/* Raw Paste Textarea */}
                  <div className="space-y-2">
                    <label className="block font-bold text-slate-700 text-xs">
                      Or Paste Raw JSON Array or CSV Text:
                    </label>
                    <textarea
                      rows={6}
                      value={bulkUploadText}
                      onChange={e => setBulkUploadText(e.target.value)}
                      placeholder='Paste JSON array: [{"question":"...","options":["A","B","C","D"],"correctOptionIndex":0}] or CSV lines...'
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px] text-slate-900 focus:outline-none focus:border-[#FF9900]"
                    />
                  </div>

                  {/* Mode & Action */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-3 text-xs text-slate-700 font-semibold">
                      <span>Import Mode:</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="append"
                          checked={bulkUploadMode === 'append'}
                          onChange={() => setBulkUploadMode('append')}
                        />
                        <span>Append to existing bank</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={bulkUploadMode === 'replace'}
                          onChange={() => setBulkUploadMode('replace')}
                        />
                        <span>Replace entire bank</span>
                      </label>
                    </div>

                    <button
                      onClick={() => handleProcessBulkQuestions(bulkUploadText, bulkUploadMode)}
                      className="px-5 py-2.5 bg-[#FF9900] hover:bg-[#E08800] text-slate-950 font-extrabold rounded-xl text-xs shadow-xs transition cursor-pointer"
                    >
                      📥 Process &amp; Import Questions
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <div>
                {editingQuiz.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuizToDelete(editingQuiz);
                      setDeleteQuizConfirmText('');
                      setIsDeleteQuizModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <span>🗑️</span>
                    <span>Delete Quiz</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuizModalOpen(false);
                    setEditingQuiz(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleAdminAction('save-quiz', 'QUIZ', { quiz: editingQuiz });
                    setIsQuizModalOpen(false);
                    setEditingQuiz(null);
                    await fetchDashboardData();
                  }}
                  className="px-5 py-2.5 bg-[#FF9900] hover:bg-[#E08800] text-slate-950 font-extrabold rounded-xl text-xs shadow-xs transition cursor-pointer"
                >
                  Save &amp; Schedule Quiz ({editingQuiz.questionBank?.length || 0} Questions)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. DELETE WEEKLY QUIZ CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {isDeleteQuizModalOpen && quizToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold">
              🗑️
            </div>

            <div>
              <h3 className="text-base font-extrabold text-[#0B192C]">
                Permanently Delete Weekly Quiz?
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                You are about to delete <strong className="text-slate-900">{quizToDelete.title}</strong> ({quizToDelete.quizCode}).
              </p>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <div className="font-bold">⚠️ Irreversible Administrative Action:</div>
              <div>• Quiz question pool ({quizToDelete.questionBank?.length || 0} questions) will be deleted.</div>
              <div>• Associated candidate attempts and proctoring telemetry will be cleaned up.</div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder="DELETE"
                value={deleteQuizConfirmText}
                onChange={e => setDeleteQuizConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsDeleteQuizModalOpen(false);
                  setQuizToDelete(null);
                  setDeleteQuizConfirmText('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={deleteQuizConfirmText.trim() !== 'DELETE'}
                onClick={async () => {
                  await handleAdminAction('delete-quiz', 'QUIZ', { quizId: quizToDelete.id });
                  setIsDeleteQuizModalOpen(false);
                  setQuizToDelete(null);
                  setIsQuizModalOpen(false);
                  setEditingQuiz(null);
                  await fetchDashboardData();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Confirm Delete Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. DELETE CANDIDATE ATTEMPT CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {isDeleteAttemptModalOpen && attemptToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold">
              🗑️
            </div>

            <div>
              <h3 className="text-base font-extrabold text-[#0B192C]">
                Delete Candidate Attempt?
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Candidate: <strong className="text-slate-900">{attemptToDelete.studentName}</strong> ({attemptToDelete.rollNumber || attemptToDelete.email})
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
              <div>• Attempt Status: <strong>{attemptToDelete.status}</strong></div>
              <div>• Deleting will remove this attempt record and allow the candidate to restart/retake the quiz cleanly if scheduled.</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsDeleteAttemptModalOpen(false);
                  setAttemptToDelete(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleAdminAction('delete-attempt', attemptToDelete.id || attemptToDelete.attemptId);
                  setIsDeleteAttemptModalOpen(false);
                  setAttemptToDelete(null);
                  if (selectedCandidate?.id === attemptToDelete.id) {
                    closeLiveView();
                  }
                  await fetchDashboardData();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Delete Attempt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. CLEAR ALL QUIZ ATTEMPTS CONFIRMATION MODAL */}
      {/* ======================================================== */}
      {isClearAttemptsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-rose-200 rounded-3xl shadow-2xl p-6 text-slate-900 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl font-bold">
              ⚠️
            </div>

            <div>
              <h3 className="text-base font-extrabold text-[#0B192C]">
                Clear All Quiz Attempts?
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                This will delete all test attempts and proctoring telemetry for the selected quiz. Ideal for resetting after test runs.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsClearAttemptsModalOpen(false);
                  setQuizToClearAttempts(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleAdminAction('clear-quiz-attempts', 'ALL', { quizId: quizToClearAttempts });
                  setIsClearAttemptsModalOpen(false);
                  setQuizToClearAttempts(null);
                  await fetchDashboardData();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Clear All Attempts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. FORMAL WARNING DISPATCH MODAL */}
      {/* ======================================================== */}
      {isWarningModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0B192C] border border-amber-500/40 rounded-3xl shadow-2xl p-6 text-slate-100 space-y-4">
            <h3 className="text-base font-extrabold text-white">Dispatch Proctoring Warning</h3>
            <p className="text-xs text-slate-400">
              Send a formal warning overlay to candidate <strong>{selectedCandidate.studentName}</strong>.
            </p>

            <textarea
              rows={3}
              value={customWarningText}
              onChange={e => setCustomWarningText(e.target.value)}
              placeholder="e.g. Please look directly at the exam screen. Further violations will result in automated test locking."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsWarningModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleAdminAction('send-warning', selectedCandidate.id || selectedCandidate.attemptId, {
                    message: customWarningText.trim() || 'Please stay focused on your test screen.',
                    countViolation: true
                  });
                  setIsWarningModalOpen(false);
                  setCustomWarningText('');
                }}
                className="px-4 py-2 bg-[#FF9900] hover:bg-[#E08800] text-slate-950 font-extrabold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                Dispatch Warning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
