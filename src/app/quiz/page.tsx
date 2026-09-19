'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { detectFaceStatus, FaceStatusTracker, FaceStatus } from '@/lib/faceDetection';

interface WeeklyQuizPortalProps {
  initialQuizId?: string;
}

type QuizPhase =
  | 'AUTH'
  | 'DASHBOARD'
  | 'CAMERA_CHECK'
  | 'SCREEN_CHECK'
  | 'CONSENT'
  | 'PRE_QUIZ'
  | 'QUIZ'
  | 'PAUSED'
  | 'SUBMITTED';

function WeeklyQuizPortalContent({ initialQuizId }: WeeklyQuizPortalProps) {
  const searchParams = useSearchParams();
  const params = useParams();
  const routeQuizId = initialQuizId || (params?.quizId as string) || searchParams?.get('quizId') || '';

  // Current Phase
  const [phase, setPhase] = useState<QuizPhase>('AUTH');

  // Candidate Auth State
  const [email, setEmail] = useState('');
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Selected Quiz & Available Quizzes
  const [quiz, setQuiz] = useState<any>(null);
  const [availableQuizzes, setAvailableQuizzes] = useState<any[]>([]);
  const [existingAttempt, setExistingAttempt] = useState<any>(null);

  // Hardware & Camera Check State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraDetected, setCameraDetected] = useState(false);
  const [micDetected, setMicDetected] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [checkingHardware, setCheckingHardware] = useState(false);
  const [faceCheckStatus, setFaceCheckStatus] = useState<FaceStatus>('UNKNOWN');
  const [faceCheckCount, setFaceCheckCount] = useState(0);

  // Screen Share Check State
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenShareActive, setScreenShareActive] = useState(false);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [requestingScreen, setRequestingScreen] = useState(false);

  // Consent State
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);

  // Assessment Session State
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionReference, setSubmissionReference] = useState('');
  const [submissionReason, setSubmissionReason] = useState<string | null>(null);

  // Floating Proctor Widget State
  const [widgetTab, setWidgetTab] = useState<'camera' | 'screen'>('camera');
  const [isWebcamMinimized, setIsWebcamMinimized] = useState(false);
  const [webcamPos, setWebcamPos] = useState<{ x: number; y: number }>({ x: 24, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 24,
    initialY: 80
  });

  // Integrity & Violation Tracking State (Server-Authoritative)
  const [violationCount, setViolationCount] = useState(0);
  const [warningModalMessage, setWarningModalMessage] = useState<string | null>(null);
  const [autoSubmitModalOpen, setAutoSubmitModalOpen] = useState(false);
  const [autoSubmitReason, setAutoSubmitReason] = useState('');
  const [cameraInterrupted, setCameraInterrupted] = useState(false);
  const [cameraGraceSeconds, setCameraGraceSeconds] = useState(30);
  const [screenInterrupted, setScreenInterrupted] = useState(false);
  const [fullscreenExited, setFullscreenExited] = useState(false);
  const [fullscreenGraceSeconds, setFullscreenGraceSeconds] = useState(15);
  const [liveFaceStatus, setLiveFaceStatus] = useState<FaceStatus>('ONE_FACE');
  const [integrityWarning, setIntegrityWarning] = useState<string | null>(null);

  // Refs for Media & Signaling
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const screenPreviewRef = useRef<HTMLVideoElement | null>(null);
  const floatingVideoRef = useRef<HTMLVideoElement | null>(null);
  const floatingScreenRef = useRef<HTMLVideoElement | null>(null);
  const cameraPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const screenPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const faceTrackerRef = useRef<FaceStatusTracker | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cameraGraceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fullscreenGraceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check saved session on mount
  useEffect(() => {
    const savedEmail = sessionStorage.getItem('wq_candidate_email');
    const savedName = sessionStorage.getItem('wq_candidate_name');
    const savedRoll = sessionStorage.getItem('wq_candidate_roll');
    const savedToken = sessionStorage.getItem('wq_session_token');
    const savedAttemptId = sessionStorage.getItem('wq_attempt_id');

    if (savedEmail) setEmail(savedEmail);
    if (savedName) setStudentName(savedName);
    if (savedRoll) setRollNumber(savedRoll);

    if (savedEmail) {
      handleAutoAuth(savedEmail, savedToken, savedAttemptId);
    }
  }, []);

  const handleAutoAuth = async (candidateEmail: string, token?: string | null, attId?: string | null) => {
    try {
      const res = await fetch('/api/quiz/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: candidateEmail, quizId: routeQuizId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCandidateId(data.candidate.id);
        setStudentName(data.candidate.studentName);
        setRollNumber(data.candidate.rollNumber);
        setQuiz(data.quiz);
        setAvailableQuizzes(data.availableQuizzes || []);
        setExistingAttempt(data.existingAttempt);

        if (data.existingAttempt && data.existingAttempt.status === 'IN_PROGRESS' && token && attId) {
          setSessionToken(token);
          setAttemptId(attId);
        }
        setPhase('DASHBOARD');
      }
    } catch (err) {
      // Stay on auth form
    }
  };

  // Auth Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setAuthError('Please enter your registered university email.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch('/api/quiz/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          studentName: studentName.trim(),
          rollNumber: rollNumber.trim().toUpperCase(),
          quizId: routeQuizId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your email.');
      }

      setCandidateId(data.candidate.id);
      setStudentName(data.candidate.studentName);
      setRollNumber(data.candidate.rollNumber);
      setQuiz(data.quiz);
      setAvailableQuizzes(data.availableQuizzes || []);
      setExistingAttempt(data.existingAttempt);

      sessionStorage.setItem('wq_candidate_email', data.candidate.email);
      sessionStorage.setItem('wq_candidate_name', data.candidate.studentName);
      sessionStorage.setItem('wq_candidate_roll', data.candidate.rollNumber);

      setPhase('DASHBOARD');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Log Security Event Helper with 2-Violation Engine Feedback
  const logSecurityEvent = useCallback(
    async (eventType: string, severity: string = 'INFO', metadata?: Record<string, any>, durationSeconds?: number) => {
      if (!attemptId || !sessionToken) return;
      try {
        const res = await fetch('/api/quiz/security-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            token: sessionToken,
            eventType,
            severity,
            durationSeconds,
            metadata
          })
        });

        const data = await res.json();
        if (data.success) {
          if (typeof data.violationCount === 'number') {
            setViolationCount(data.violationCount);
          }

          if (data.isWarning) {
            setWarningModalMessage(
              data.message ||
                'Proctoring Warning (1/2): A security violation was logged. Please correct your testing environment immediately. A second violation will automatically submit your assessment.'
            );
          } else if (data.isAutoSubmitted) {
            setAutoSubmitReason(data.message || 'Automatically submitted due to repeated proctoring violations.');
            setAutoSubmitModalOpen(true);
            setPhase('SUBMITTED');
          }
        }
      } catch (err) {
        // Telemetry failure fallback
      }
    },
    [attemptId, sessionToken]
  );

  // Initialize Hardware (Camera & Microphone) Check
  const initializeHardwareCheck = async () => {
    setCheckingHardware(true);
    setCameraPermissionError(null);
    setCameraDetected(false);
    setMicDetected(false);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support webcam or microphone access.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });

      setCameraStream(stream);
      setCameraDetected(stream.getVideoTracks().length > 0);
      setMicDetected(stream.getAudioTracks().length > 0);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          handleCameraDisconnected();
        };
      }
    } catch (err: any) {
      console.error('Camera check error:', err);
      let errMsg = 'Webcam and Microphone permissions are required to enter the Weekly Quiz.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera and microphone access was denied. Please allow permissions in your browser address bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera or microphone hardware detected on this device.';
      }
      setCameraPermissionError(errMsg);
    } finally {
      setCheckingHardware(false);
    }
  };

  // Initialize Screen Share Check
  const initializeScreenShare = async () => {
    setRequestingScreen(true);
    setScreenShareError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Your browser does not support screen sharing.');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor'
        } as any,
        audio: false
      });

      setScreenStream(stream);
      setScreenShareActive(true);

      if (screenPreviewRef.current) {
        screenPreviewRef.current.srcObject = stream;
        screenPreviewRef.current.play().catch(() => {});
      }

      const screenTrack = stream.getVideoTracks()[0];
      if (screenTrack) {
        screenTrack.onended = () => {
          handleScreenShareStopped();
        };
      }
    } catch (err: any) {
      console.error('Screen share error:', err);
      let errMsg = 'Entire screen sharing is required for the proctored assessment.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Screen sharing was cancelled or denied. You must share your entire screen to proceed.';
      }
      setScreenShareError(errMsg);
      setScreenShareActive(false);
    } finally {
      setRequestingScreen(false);
    }
  };

  // Phase transition listeners
  useEffect(() => {
    if (phase === 'CAMERA_CHECK' && !cameraStream) {
      initializeHardwareCheck();
    }
    if (phase === 'SCREEN_CHECK' && !screenStream) {
      initializeScreenShare();
    }
  }, [phase]);

  // Bind camera stream when video refs mount
  useEffect(() => {
    if (cameraStream) {
      if (videoPreviewRef.current && videoPreviewRef.current.srcObject !== cameraStream) {
        videoPreviewRef.current.srcObject = cameraStream;
        videoPreviewRef.current.play().catch(() => {});
      }
      if (floatingVideoRef.current && floatingVideoRef.current.srcObject !== cameraStream) {
        floatingVideoRef.current.srcObject = cameraStream;
        floatingVideoRef.current.play().catch(() => {});
      }
    }
  }, [cameraStream, phase, widgetTab]);

  // Bind screen stream when screen video refs mount
  useEffect(() => {
    if (screenStream) {
      if (screenPreviewRef.current && screenPreviewRef.current.srcObject !== screenStream) {
        screenPreviewRef.current.srcObject = screenStream;
        screenPreviewRef.current.play().catch(() => {});
      }
      if (floatingScreenRef.current && floatingScreenRef.current.srcObject !== screenStream) {
        floatingScreenRef.current.srcObject = screenStream;
        floatingScreenRef.current.play().catch(() => {});
      }
    }
  }, [screenStream, phase, widgetTab]);

  // Periodic Face Check in CAMERA_CHECK phase
  useEffect(() => {
    if (phase !== 'CAMERA_CHECK' || !cameraStream) return;

    const interval = setInterval(async () => {
      if (videoPreviewRef.current) {
        const res = await detectFaceStatus(videoPreviewRef.current);
        setFaceCheckStatus(res.status);
        setFaceCheckCount(res.count);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [phase, cameraStream]);

  // Setup WebRTC Dual Stream Signaling
  const setupWebRTCSignaling = useCallback(
    async (camStream: MediaStream, scrStream: MediaStream | null, attId: string, tok: string) => {
      try {
        // Setup Camera RTCPeerConnection
        const camPc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
        });
        cameraPeerConnectionRef.current = camPc;

        camStream.getTracks().forEach(track => {
          camPc.addTrack(track, camStream);
        });

        camPc.onicecandidate = async event => {
          if (event.candidate) {
            try {
              await fetch('/api/quiz/webrtc/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  attemptId: attId,
                  token: tok,
                  cameraIceCandidate: event.candidate
                })
              });
            } catch (e) {}
          }
        };

        const camOffer = await camPc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
        await camPc.setLocalDescription(camOffer);

        // Setup Screen Share RTCPeerConnection if available
        let scrOffer: any = null;
        if (scrStream) {
          const scrPc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
          });
          screenPeerConnectionRef.current = scrPc;

          scrStream.getTracks().forEach(track => {
            scrPc.addTrack(track, scrStream);
          });

          scrPc.onicecandidate = async event => {
            if (event.candidate) {
              try {
                await fetch('/api/quiz/webrtc/signal', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    attemptId: attId,
                    token: tok,
                    screenIceCandidate: event.candidate
                  })
                });
              } catch (e) {}
            }
          };

          scrOffer = await scrPc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
          await scrPc.setLocalDescription(scrOffer);
        }

        // Send dual offers to signaling server
        await fetch('/api/quiz/webrtc/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId: attId,
            token: tok,
            cameraOffer: camPc.localDescription,
            screenOffer: scrOffer,
            cameraActive: true,
            screenActive: Boolean(scrStream)
          })
        });

        // Periodic signaling poll
        const pollInterval = setInterval(async () => {
          if (!cameraPeerConnectionRef.current || camPc.connectionState === 'closed') {
            clearInterval(pollInterval);
            return;
          }

          try {
            const res = await fetch(`/api/quiz/webrtc/signal?attemptId=${encodeURIComponent(attId)}&token=${encodeURIComponent(tok)}`);
            const data = await res.json();

            if (data.success) {
              if (data.cameraAnswer && !camPc.currentRemoteDescription) {
                await camPc.setRemoteDescription(new RTCSessionDescription(data.cameraAnswer));
              }
              if (screenPeerConnectionRef.current && data.screenAnswer && !screenPeerConnectionRef.current.currentRemoteDescription) {
                await screenPeerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.screenAnswer));
              }
              if (Array.isArray(data.adminIceCandidates)) {
                for (const candidate of data.adminIceCandidates) {
                  try {
                    await camPc.addIceCandidate(new RTCIceCandidate(candidate));
                  } catch (e) {}
                }
              }
            }
          } catch (e) {}
        }, 3000);
      } catch (err) {
        console.error('WebRTC setup error:', err);
      }
    },
    []
  );

  // Capture low-res preview snapshots for dashboard thumbnails
  const captureCameraPreviewFrame = useCallback((): string | null => {
    const video = floatingVideoRef.current || videoPreviewRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, 160, 120);
      return canvas.toDataURL('image/jpeg', 0.5);
    } catch (e) {
      return null;
    }
  }, []);

  const captureScreenPreviewFrame = useCallback((): string | null => {
    const video = floatingScreenRef.current || screenPreviewRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, 160, 100);
      return canvas.toDataURL('image/jpeg', 0.5);
    } catch (e) {
      return null;
    }
  }, []);

  // Launch Proctored Quiz
  const handleLaunchQuiz = async () => {
    if (!cameraStream) {
      alert('Camera stream is required to proceed.');
      return;
    }

    if (!screenStream) {
      alert('Screen share stream is required to proceed.');
      return;
    }

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {}

    setAuthLoading(true);
    try {
      const res = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.id,
          email,
          studentName,
          rollNumber,
          candidateId,
          consentGiven: true
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start quiz.');
      }

      setSessionToken(data.token);
      setAttemptId(data.attemptId);
      setQuestions(data.quiz.questions || []);
      setRemainingSeconds(data.remainingSeconds);
      setAnswers(data.attempt?.answers || {});
      setMarkedForReview(data.attempt?.markedForReview || []);
      setViolationCount(data.attempt?.violationCount || 0);

      sessionStorage.setItem('wq_session_token', data.token);
      sessionStorage.setItem('wq_attempt_id', data.attemptId);

      // Start WebRTC Peer Connection & Dual Signaling
      await setupWebRTCSignaling(cameraStream, screenStream, data.attemptId, data.token);

      setPhase('QUIZ');
    } catch (err: any) {
      alert(err.message || 'Unable to launch quiz.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Face Detection Tracker & Heartbeat Telemetry during Quiz
  useEffect(() => {
    if (phase !== 'QUIZ' || !attemptId || !sessionToken) return;

    faceTrackerRef.current = new FaceStatusTracker({
      noFaceThresholdSeconds: quiz?.settings?.noFaceThresholdSeconds || 6,
      multipleFacesThresholdSeconds: quiz?.settings?.multipleFacesThresholdSeconds || 4,
      onNoFaceDetected: duration => {
        setLiveFaceStatus('NO_FACE');
        setIntegrityWarning('Face not detected in webcam view. Please keep your face fully centered in the camera.');
        logSecurityEvent('NO_FACE_DETECTED', 'WARNING', { durationSeconds: duration }, duration);
      },
      onMultipleFacesDetected: duration => {
        setLiveFaceStatus('MULTIPLE_FACES');
        setIntegrityWarning('Multiple faces detected. Ensure no other individuals are visible in your camera frame.');
        logSecurityEvent('MULTIPLE_FACES_DETECTED', 'WARNING', { durationSeconds: duration }, duration);
      },
      onFaceRecovered: () => {
        setLiveFaceStatus('ONE_FACE');
        setIntegrityWarning(null);
        logSecurityEvent('FACE_DETECTION_RECOVERED', 'INFO');
      }
    });

    // Face detection scan loop (every 1 second)
    detectionIntervalRef.current = setInterval(async () => {
      const video = floatingVideoRef.current;
      if (video && faceTrackerRef.current) {
        const result = await detectFaceStatus(video);
        faceTrackerRef.current.update(result);
      }
    }, 1000);

    // Heartbeat & Dual Snapshot Telemetry (every 3.5 seconds)
    heartbeatIntervalRef.current = setInterval(async () => {
      const camPreview = captureCameraPreviewFrame();
      const scrPreview = captureScreenPreviewFrame();
      try {
        await fetch('/api/quiz/webrtc/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            token: sessionToken,
            cameraPreviewFrame: camPreview,
            screenPreviewFrame: scrPreview,
            cameraActive: !cameraInterrupted,
            screenActive: !screenInterrupted,
            violationCount
          })
        });
      } catch (e) {}
    }, 3500);

    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [phase, attemptId, sessionToken, quiz, cameraInterrupted, screenInterrupted, violationCount, captureCameraPreviewFrame, captureScreenPreviewFrame, logSecurityEvent]);

  // Authoritative Server Timer & Local Countdown
  useEffect(() => {
    if (phase !== 'QUIZ') return;

    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          handleAutoSubmit('TIME_EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Periodic sync with server status every 10s
    const syncInterval = setInterval(async () => {
      if (!attemptId || !sessionToken) return;
      try {
        const res = await fetch(`/api/quiz/status?attemptId=${encodeURIComponent(attemptId)}&token=${encodeURIComponent(sessionToken)}`);
        const data = await res.json();
        if (data.success) {
          if (typeof data.violationCount === 'number') {
            setViolationCount(data.violationCount);
          }

          if (data.status === 'PAUSED') {
            setPhase('PAUSED');
          } else if (data.status === 'SUBMITTED') {
            setSubmissionReason(data.submissionReason || 'COMPLETED');
            setPhase('SUBMITTED');
          } else if (typeof data.remainingSeconds === 'number') {
            setRemainingSeconds(data.remainingSeconds);
          }
        }
      } catch (e) {}
    }, 10000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      clearInterval(syncInterval);
    };
  }, [phase, attemptId, sessionToken]);

  // Camera Disconnect Handler
  const handleCameraDisconnected = useCallback(() => {
    setCameraInterrupted(true);
    setCameraGraceSeconds(30);
    logSecurityEvent('WEBCAM_DISCONNECTED', 'CRITICAL');

    if (cameraGraceTimerRef.current) clearInterval(cameraGraceTimerRef.current);
    cameraGraceTimerRef.current = setInterval(() => {
      setCameraGraceSeconds(prev => {
        if (prev <= 1) {
          clearInterval(cameraGraceTimerRef.current!);
          setPhase('PAUSED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [logSecurityEvent]);

  // Screen Share Stopped Handler
  const handleScreenShareStopped = useCallback(() => {
    setScreenInterrupted(true);
    setScreenShareActive(false);
    logSecurityEvent('SCREEN_SHARE_STOPPED', 'CRITICAL', { reason: 'Screen sharing track ended.' });
  }, [logSecurityEvent]);

  // Attempt Camera Reconnection
  const handleReconnectCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true
      });
      setCameraStream(stream);
      setCameraInterrupted(false);
      if (cameraGraceTimerRef.current) clearInterval(cameraGraceTimerRef.current);

      if (floatingVideoRef.current) {
        floatingVideoRef.current.srcObject = stream;
        floatingVideoRef.current.play().catch(() => {});
      }

      logSecurityEvent('WEBCAM_CONNECTED', 'INFO');
    } catch (e) {
      alert('Could not reconnect camera. Please verify device permissions and connections.');
    }
  };

  // Attempt Screen Share Reconnection
  const handleReconnectScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as any,
        audio: false
      });
      setScreenStream(stream);
      setScreenInterrupted(false);
      setScreenShareActive(true);

      if (floatingScreenRef.current) {
        floatingScreenRef.current.srcObject = stream;
        floatingScreenRef.current.play().catch(() => {});
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          handleScreenShareStopped();
        };
      }

      logSecurityEvent('SCREEN_SHARE_STARTED', 'INFO');
    } catch (e) {
      alert('Could not reconnect screen share. Please select your entire screen.');
    }
  };

  // Fullscreen & Focus Loss Observers
  useEffect(() => {
    if (phase !== 'QUIZ') return;

    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      if (!isFull) {
        setFullscreenExited(true);
        setFullscreenGraceSeconds(15);
        logSecurityEvent('FULLSCREEN_EXIT', 'WARNING', { reason: 'Candidate exited fullscreen mode.' });

        if (fullscreenGraceTimerRef.current) clearInterval(fullscreenGraceTimerRef.current);
        fullscreenGraceTimerRef.current = setInterval(() => {
          setFullscreenGraceSeconds(prev => {
            if (prev <= 1) {
              clearInterval(fullscreenGraceTimerRef.current!);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setFullscreenExited(false);
        if (fullscreenGraceTimerRef.current) clearInterval(fullscreenGraceTimerRef.current);
        logSecurityEvent('FULLSCREEN_RESTORED', 'INFO');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logSecurityEvent('TAB_FOCUS_LOST', 'WARNING', { reason: 'Browser tab lost focus or switched away.' });
      } else {
        logSecurityEvent('TAB_FOCUS_RESTORED', 'INFO');
      }
    };

    const handleBlur = () => {
      logSecurityEvent('TAB_FOCUS_LOST', 'WARNING', { reason: 'Browser window blurred.' });
    };

    const handleFocus = () => {
      logSecurityEvent('TAB_FOCUS_RESTORED', 'INFO');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logSecurityEvent('COPY_ATTEMPT', 'INFO');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && (e.key === 'r' || e.key === 'u' || e.key === 'p' || e.key === 'c' || e.key === 'v')) ||
        e.key === 'F5'
      ) {
        e.preventDefault();
        logSecurityEvent('UNAUTHORIZED_KEY', 'WARNING', { key: e.key, reason: `Unauthorized key combination pressed: ${e.key}` });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [phase, logSecurityEvent]);

  // Return to Fullscreen
  const handleReturnToFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setFullscreenExited(false);
    } catch (e) {}
  };

  // Option Selection
  const handleSelectOption = (optionIndex: number) => {
    if (violationCount >= 2) return; // Locked due to violations
    const currentQ = questions[currentQIndex];
    if (!currentQ) return;

    const newAnswers = { ...answers, [currentQ.id]: optionIndex };
    setAnswers(newAnswers);
    triggerAutoSave(newAnswers, markedForReview);
  };

  // Toggle Mark for Review
  const handleToggleReview = () => {
    const currentQ = questions[currentQIndex];
    if (!currentQ) return;

    const newMarked = markedForReview.includes(currentQ.id)
      ? markedForReview.filter(id => id !== currentQ.id)
      : [...markedForReview, currentQ.id];

    setMarkedForReview(newMarked);
    triggerAutoSave(answers, newMarked);
  };

  // Incremental Autosave
  const triggerAutoSave = async (ans: Record<string, number>, marked: string[]) => {
    if (!attemptId || !sessionToken) return;
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/quiz/save-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          token: sessionToken,
          answers: ans,
          markedForReview: marked
        })
      });
      if (res.ok) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      setSaveStatus('error');
    }
  };

  // Submit Quiz
  const handleSubmitQuiz = async (reason: string = 'MANUAL') => {
    if (!attemptId || !sessionToken || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          token: sessionToken,
          answers,
          reason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmissionReference(data.referenceId || `WQ-${attemptId.slice(-8).toUpperCase()}`);
        setSubmissionReason(reason);
        setPhase('SUBMITTED');
        setIsSubmitModalOpen(false);

        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
        if (screenStream) screenStream.getTracks().forEach(t => t.stop());
        if (cameraPeerConnectionRef.current) cameraPeerConnectionRef.current.close();
        if (screenPeerConnectionRef.current) screenPeerConnectionRef.current.close();
      } else {
        alert(data.error || 'Failed to submit assessment.');
      }
    } catch (e) {
      alert('Network error submitting quiz. Your answers are autosaved.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = (reason: string) => {
    handleSubmitQuiz(reason);
  };

  // Draggable Floating Webcam handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: webcamPos.x,
      initialY: webcamPos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setWebcamPos({
        x: Math.max(10, Math.min(window.innerWidth - 240, dragRef.current.initialX + dx)),
        y: Math.max(60, Math.min(window.innerHeight - 200, dragRef.current.initialY + dy))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ----------------------------------------------------
  // RENDER: Phase-based layouts
  // ----------------------------------------------------

  // 1. AUTH PHASE
  if (phase === 'AUTH') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
        {/* Background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-amber-500/10 via-blue-600/10 to-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20 mb-4">
              <svg className="w-7 h-7 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">AWS Weekly Session Quiz</h1>
            <p className="text-xs text-slate-400 mt-1">Live Multi-Candidate Proctored Assessment</p>
          </div>

          {authError && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2.5">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Registered Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="student@chandigarh.university"
                className="w-full bg-slate-950/70 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Full Name (Optional)</label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-slate-950/70 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Roll / Registration Number</label>
              <input
                type="text"
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value)}
                placeholder="21BCS1019"
                className="w-full bg-slate-950/70 border border-slate-700/70 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold py-3 rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {authLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Session...</span>
                </>
              ) : (
                <>
                  <span>Enter Assessment Portal</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Proctored Environment Active
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. DASHBOARD PHASE
  if (phase === 'DASHBOARD') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 max-w-4xl mx-auto font-sans">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 border border-slate-800/80 p-5 rounded-2xl mb-8 backdrop-blur-md">
          <div>
            <div className="text-xs text-amber-400 font-semibold tracking-wide uppercase">Candidate Profile</div>
            <h2 className="text-xl font-bold text-white mt-0.5">{studentName || email}</h2>
            <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
              <span>Roll: <strong className="text-slate-200">{rollNumber || 'N/A'}</strong></span>
              <span>•</span>
              <span>Email: <strong className="text-slate-200">{email}</strong></span>
            </div>
          </div>
          <button
            onClick={() => {
              sessionStorage.clear();
              setPhase('AUTH');
            }}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700 transition"
          >
            Switch Account
          </button>
        </div>

        {/* Selected Quiz Card */}
        {quiz ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-semibold">
                  {quiz.quizCode || 'AWS-WEEKLY'}
                </span>
                {quiz.scheduleStatus === 'UPCOMING' ? (
                  <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Upcoming Scheduled
                  </span>
                ) : quiz.scheduleStatus === 'ENDED' ? (
                  <span className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Quiz Ended
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Live Active
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">Duration: <strong className="text-white">{quiz.durationMinutes} Minutes</strong></div>
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">{quiz.title}</h1>
            
            {/* Linked Session Info */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
              <span className="text-amber-400 font-semibold">Linked Session:</span>
              <span className="text-slate-200">{quiz.sessionTitle || 'AWS Technical Session'}</span>
              {quiz.sessionId && (
                <span className="font-mono text-[11px] text-slate-500">({quiz.sessionId})</span>
              )}
            </div>

            {/* Schedule Window Preview */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400">Scheduled Window: </span>
                <strong className="text-slate-200 font-medium">
                  {quiz.scheduledDate ? `${quiz.scheduledDate} (${quiz.startTime || '10:00'} – ${quiz.endTime || '10:30'} ${quiz.timezone || 'IST'})` : 'Active Window'}
                </strong>
              </div>
              <div className="text-slate-400">
                Passing Score: <strong className="text-amber-400">{quiz.passingPercentage || 60}%</strong>
              </div>
            </div>

            <p className="text-sm text-slate-400 mb-6">{quiz.description || 'Weekly AWS session assessment covering cloud architectural concepts and practical implementation.'}</p>

            {/* Assessment Checklist / Proctoring Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="text-xs text-amber-400 font-semibold mb-1">📹 Webcam Proctoring</div>
                <div className="text-xs text-slate-400">Continuous face & environment monitoring throughout.</div>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="text-xs text-blue-400 font-semibold mb-1">🖥️ Screen Share Required</div>
                <div className="text-xs text-slate-400">Full desktop sharing to verify isolated testing.</div>
              </div>
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div className="text-xs text-rose-400 font-semibold mb-1">⚠️ 2-Violation Auto-Submit</div>
                <div className="text-xs text-slate-400">1st violation = warning. 2nd violation = auto-submit.</div>
              </div>
            </div>

            {/* Upcoming State Countdown Box */}
            {quiz.scheduleStatus === 'UPCOMING' && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">Weekly Quiz Not Started Yet</div>
                <p className="text-xs text-slate-300 mb-2">
                  This assessment is scheduled for <strong>{quiz.scheduledDate || 'Today'}</strong> at <strong>{quiz.startTime || '10:00 AM'} {quiz.timezone || 'IST'}</strong>.
                </p>
                {typeof quiz.startsInSeconds === 'number' && quiz.startsInSeconds > 0 && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-300 font-mono text-sm font-bold">
                    <span>Starts in:</span>
                    <span>{formatTimer(quiz.startsInSeconds)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Ended State Box */}
            {quiz.scheduleStatus === 'ENDED' && (
              <div className="mb-6 p-4 bg-slate-800/60 border border-slate-700 rounded-xl text-center text-slate-300 text-xs">
                <strong className="text-white block mb-1">Weekly Quiz Has Ended</strong>
                The scheduled time window for this assessment has concluded. No further attempts can be started.
              </div>
            )}

            {existingAttempt && (existingAttempt.status === 'SUBMITTED' || existingAttempt.status === 'REVIEW_REQUIRED') ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center justify-between">
                <div>
                  <strong>Assessment Completed:</strong> You have submitted your response for this weekly quiz.
                  {existingAttempt.submissionReason && existingAttempt.submissionReason !== 'MANUAL' && (
                    <div className="text-xs text-amber-400 mt-0.5">Reason: {existingAttempt.submissionReason}</div>
                  )}
                </div>
                <span className="text-xs font-mono bg-emerald-500/20 px-2 py-1 rounded">SUBMITTED</span>
              </div>
            ) : (
              <button
                onClick={() => setPhase('CAMERA_CHECK')}
                disabled={quiz.scheduleStatus === 'UPCOMING' || quiz.scheduleStatus === 'ENDED'}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>
                  {quiz.scheduleStatus === 'UPCOMING'
                    ? 'Quiz Not Started Yet (Locked)'
                    : quiz.scheduleStatus === 'ENDED'
                    ? 'Assessment Ended'
                    : 'Proceed to System Compatibility Check'}
                </span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-400 text-sm">No live weekly quiz found matching the specified ID.</p>
          </div>
        )}
      </div>
    );
  }

  // 3. CAMERA & HARDWARE CHECK PHASE
  if (phase === 'CAMERA_CHECK') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 max-w-3xl mx-auto font-sans flex flex-col justify-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {/* Step Indicator */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Step 1 of 3: Hardware Diagnostics</span>
              <h2 className="text-xl font-bold text-white mt-0.5">Webcam & Microphone Verification</h2>
            </div>
            <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-mono">1 / 3</span>
          </div>

          {cameraPermissionError ? (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
              <div className="font-semibold mb-1">Permission or Device Error:</div>
              <p className="text-xs text-rose-400 mb-3">{cameraPermissionError}</p>
              <button
                onClick={initializeHardwareCheck}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-lg transition"
              >
                Retry Camera Access
              </button>
            </div>
          ) : null}

          {/* Camera Viewport */}
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 mb-6 flex items-center justify-center">
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />

            {checkingHardware && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-300">Requesting Camera & Microphone...</span>
              </div>
            )}

            {/* Live Face Status Badge */}
            {cameraDetected && (
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    faceCheckStatus === 'ONE_FACE'
                      ? 'bg-emerald-400 animate-pulse'
                      : faceCheckStatus === 'MULTIPLE_FACES'
                      ? 'bg-rose-400 animate-ping'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="text-xs font-semibold text-white">
                  {faceCheckStatus === 'ONE_FACE'
                    ? '1 Face Detected (Optimal)'
                    : faceCheckStatus === 'MULTIPLE_FACES'
                    ? `Warning: ${faceCheckCount} Faces Detected`
                    : 'Searching for Face...'}
                </span>
              </div>
            )}
          </div>

          {/* Hardware Checks Checklist */}
          <div className="grid grid-cols-2 gap-3 mb-6 text-xs">
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${cameraDetected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
              <span className={`w-2 h-2 rounded-full ${cameraDetected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span>Webcam Feed Active</span>
            </div>
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${micDetected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
              <span className={`w-2 h-2 rounded-full ${micDetected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span>Microphone Detected</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('DASHBOARD')}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
            >
              Back
            </button>
            <button
              onClick={() => setPhase('SCREEN_CHECK')}
              disabled={!cameraDetected}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              <span>Continue to Screen Share Check</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. SCREEN SHARE CHECK PHASE
  if (phase === 'SCREEN_CHECK') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 max-w-3xl mx-auto font-sans flex flex-col justify-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {/* Step Indicator */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Step 2 of 3: Desktop Telemetry</span>
              <h2 className="text-xl font-bold text-white mt-0.5">Screen Share Verification</h2>
            </div>
            <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-mono">2 / 3</span>
          </div>

          {screenShareError && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
              <div className="font-semibold mb-1">Screen Sharing Required:</div>
              <p className="text-xs text-rose-400 mb-3">{screenShareError}</p>
              <button
                onClick={initializeScreenShare}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition"
              >
                Share Full Desktop Screen
              </button>
            </div>
          )}

          {/* Screen Share Viewport */}
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 mb-6 flex items-center justify-center">
            <video
              ref={screenPreviewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />

            {!screenShareActive && !requestingScreen && (
              <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white mb-1">Share Entire Screen</h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4">You must choose <strong>"Entire Screen"</strong> in the browser prompt to satisfy proctoring requirements.</p>
                <button
                  onClick={initializeScreenShare}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/25 transition"
                >
                  Start Screen Share
                </button>
              </div>
            )}

            {screenShareActive && (
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-white">Screen Feed Active (Full Desktop)</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('CAMERA_CHECK')}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
            >
              Back
            </button>
            <button
              onClick={() => setPhase('CONSENT')}
              disabled={!screenShareActive}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              <span>Proceed to Assessment Consent</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 5. CONSENT & POLICY PHASE
  if (phase === 'CONSENT') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 max-w-2xl mx-auto font-sans flex flex-col justify-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div>
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Step 3 of 3: Proctoring Integrity Agreement</span>
              <h2 className="text-xl font-bold text-white mt-0.5">Assessment Rules & Integrity Terms</h2>
            </div>
            <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-mono">3 / 3</span>
          </div>

          <div className="space-y-3.5 mb-6 text-xs text-slate-300">
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
              <span className="text-amber-400 text-base font-bold">1</span>
              <div>
                <strong className="text-white">Dual Video Proctoring:</strong> Your webcam and screen share streams are transmitted live to the assessment invigilator during the entire test duration.
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
              <span className="text-amber-400 text-base font-bold">2</span>
              <div>
                <strong className="text-white">Mandatory Fullscreen:</strong> You must remain in Fullscreen mode. Exiting fullscreen or navigating away will be flagged immediately.
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-rose-500/20 bg-rose-500/5 rounded-xl flex items-start gap-3">
              <span className="text-rose-400 text-base font-bold">3</span>
              <div>
                <strong className="text-rose-300">Two-Violation Automatic Submission Policy:</strong>
                <p className="mt-1 text-slate-400">
                  - <strong>1st Violation:</strong> A proctor warning is logged and an alert is shown on your screen.<br />
                  - <strong>2nd Violation:</strong> Your assessment is <strong>immediately submitted and locked</strong>.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
              <span className="text-amber-400 text-base font-bold">4</span>
              <div>
                <strong className="text-white">Automatic Answer Preservation:</strong> All selected answers are automatically saved upon every option click.
              </div>
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={consentAcknowledged}
              onChange={e => setConsentAcknowledged(e.target.checked)}
              className="w-5 h-5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
            />
            <span className="text-xs text-amber-200 font-medium">
              I understand and explicitly agree to the dual proctoring terms, audio/visual transmission, and the two-violation automatic submission rule.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={() => setPhase('SCREEN_CHECK')}
              className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
            >
              Back
            </button>
            <button
              onClick={() => setPhase('PRE_QUIZ')}
              disabled={!consentAcknowledged}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              <span>Ready for Assessment</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 6. PRE-QUIZ READINESS PHASE
  if (phase === 'PRE_QUIZ') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 max-w-xl mx-auto font-sans flex flex-col justify-center text-center">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Ready to Begin Assessment</h2>
          <p className="text-xs text-slate-400 mb-6">
            Clicking Start will enter <strong>Fullscreen Assessment Mode</strong> and start the timer ({quiz?.durationMinutes || 20} min).
          </p>

          <div className="space-y-2.5 mb-8 text-left text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-300">
              <span>Candidate:</span>
              <strong className="text-white">{studentName || email}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Assessment:</span>
              <strong className="text-white">{quiz?.title}</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Time Allowed:</span>
              <strong className="text-amber-400">{quiz?.durationMinutes} Minutes</strong>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Violations Permitted:</span>
              <strong className="text-rose-400">1 Warning (2nd = Auto-Submit)</strong>
            </div>
          </div>

          <button
            onClick={handleLaunchQuiz}
            disabled={authLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-4 rounded-xl shadow-xl shadow-amber-500/25 transition flex items-center justify-center gap-2 text-base disabled:opacity-50"
          >
            {authLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Launching Quiz...</span>
              </>
            ) : (
              <>
                <span>Enter Fullscreen & Start Quiz</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 7. QUIZ PHASE
  if (phase === 'QUIZ') {
    const currentQ = questions[currentQIndex];
    const totalQ = questions.length;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none relative">
        {/* Top Assessment Navigation Bar */}
        <header className="h-16 bg-slate-900/90 border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-bold font-mono">
              {quiz?.quizCode || 'AWS-QUIZ'}
            </span>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-white truncate max-w-xs">{quiz?.title}</h1>
              <p className="text-[11px] text-slate-400">{studentName || email}</p>
            </div>
          </div>

          {/* Center: Authoritative Timer */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border font-mono font-bold text-sm tracking-wider ${
                remainingSeconds < 300
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 animate-pulse'
                  : 'bg-slate-950 border-slate-800 text-amber-400'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTimer(remainingSeconds)}</span>
            </div>
          </div>

          {/* Right: Autosave Status & Finish Button */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
              {saveStatus === 'saving' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <span className="text-rose-400">Autosave Error</span>
                </>
              )}
            </div>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition"
            >
              Submit Quiz
            </button>
          </div>
        </header>

        {/* Main Quiz Body */}
        <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Question Viewport (3 cols) */}
          <div className="lg:col-span-3 flex flex-col justify-between bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-sm min-h-[500px]">
            {currentQ ? (
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 bg-slate-800 text-amber-400 rounded-lg text-xs font-bold font-mono">
                      Question {currentQIndex + 1} of {totalQ}
                    </span>
                    <span className="text-xs text-slate-400">Marks: {currentQ.marks || 1}</span>
                  </div>
                  <button
                    onClick={handleToggleReview}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                      markedForReview.includes(currentQ.id)
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill={markedForReview.includes(currentQ.id) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <span>{markedForReview.includes(currentQ.id) ? 'Marked for Review' : 'Mark for Review'}</span>
                  </button>
                </div>

                <div className="text-base sm:text-lg font-medium text-white mb-6 leading-relaxed">
                  {currentQ.question}
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {currentQ.options.map((optText: string, idx: number) => {
                    const isSelected = answers[currentQ.id] === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        className={`w-full text-left p-4 rounded-xl border transition flex items-start gap-3.5 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/60 text-amber-100 shadow-md shadow-amber-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 text-xs font-bold transition mt-0.5 ${
                            isSelected
                              ? 'bg-amber-500 border-amber-400 text-slate-950'
                              : 'border-slate-700 text-slate-400'
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="text-sm leading-relaxed">{optText}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">Loading question...</div>
            )}

            {/* Bottom Nav Buttons */}
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-6 mt-8">
              <button
                onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQIndex === 0}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold disabled:opacity-30 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>

              <button
                onClick={() => setCurrentQIndex(prev => Math.min(totalQ - 1, prev + 1))}
                disabled={currentQIndex === totalQ - 1}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold disabled:opacity-30 transition flex items-center gap-2"
              >
                <span>Next</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: Question Palette (1 col) */}
          <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Question Palette</h3>
              <div className="grid grid-cols-5 gap-2 mb-6">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentQIndex;
                  const isAnswered = answers[q.id] !== undefined;
                  const isMarked = markedForReview.includes(q.id);

                  let bgClass = 'bg-slate-950 border-slate-800 text-slate-400';
                  if (isMarked) {
                    bgClass = 'bg-amber-500/20 border-amber-500/50 text-amber-300';
                  } else if (isAnswered) {
                    bgClass = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`h-9 rounded-lg border text-xs font-bold transition flex items-center justify-center relative ${bgClass} ${
                        isCurrent ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900' : ''
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="space-y-2 text-[11px] border-t border-slate-800 pt-4 text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/60" />
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/60" />
                  <span>Marked for Review ({markedForReview.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-950 border border-slate-800" />
                  <span>Unanswered ({totalQ - answeredCount})</span>
                </div>
              </div>
            </div>

            {/* Proctoring Status Pill */}
            <div className="mt-6 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Violations:</span>
                <span className={`font-bold ${violationCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {violationCount} / 2
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Webcam:</span>
                <span className="text-emerald-400 font-semibold">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Screen Share:</span>
                <span className="text-emerald-400 font-semibold">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------
            FLOATING PROCTORING WIDGET (Dual Media)
        ---------------------------------------------------- */}
        <div
          style={{ top: `${webcamPos.y}px`, left: `${webcamPos.x}px` }}
          className="fixed z-40 w-56 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md cursor-grab active:cursor-grabbing"
        >
          {/* Widget Drag Handle & Tabs */}
          <div
            onMouseDown={handleMouseDown}
            className="p-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between select-none"
          >
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setWidgetTab('camera')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  widgetTab === 'camera' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Webcam
              </button>
              <button
                onClick={() => setWidgetTab('screen')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  widgetTab === 'screen' ? 'bg-blue-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Screen
              </button>
            </div>

            <button
              onClick={() => setIsWebcamMinimized(prev => !prev)}
              className="text-slate-400 hover:text-white text-xs px-1.5"
            >
              {isWebcamMinimized ? '▲' : '▼'}
            </button>
          </div>

          {!isWebcamMinimized && (
            <div className="p-2 relative bg-black aspect-[4/3] flex items-center justify-center">
              {/* Webcam View */}
              <video
                ref={floatingVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover rounded-lg transform scale-x-[-1] ${
                  widgetTab === 'camera' ? 'block' : 'hidden'
                }`}
              />

              {/* Screen View */}
              <video
                ref={floatingScreenRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-contain rounded-lg ${
                  widgetTab === 'screen' ? 'block' : 'hidden'
                }`}
              />

              {/* Live Face Badge on camera tab */}
              {widgetTab === 'camera' && (
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      liveFaceStatus === 'ONE_FACE'
                        ? 'bg-emerald-400'
                        : liveFaceStatus === 'MULTIPLE_FACES'
                        ? 'bg-rose-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <span>{liveFaceStatus === 'ONE_FACE' ? 'Face OK' : 'Check Face'}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------
            ALERT MODAL 1: PROCTOR WARNING (Violation 1 of 2)
        ---------------------------------------------------- */}
        {warningModalMessage && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-2xl p-6 shadow-2xl text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/40">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-bold uppercase tracking-wider">
                Proctoring Warning (1 / 2)
              </span>

              <h3 className="text-xl font-bold text-white mt-3 mb-2">Attention Required</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-6 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                {warningModalMessage}
              </p>

              <p className="text-[11px] text-rose-400 font-semibold mb-6">
                ⚠️ Notice: A second violation will automatically lock and submit your quiz.
              </p>

              <button
                onClick={() => setWarningModalMessage(null)}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 rounded-xl transition text-sm"
              >
                I Acknowledge and Rectified Environment
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            ALERT MODAL 2: FULLSCREEN EXIT WARNING
        ---------------------------------------------------- */}
        {fullscreenExited && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-2xl p-6 shadow-2xl text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/40">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Fullscreen Exited</h3>
              <p className="text-xs text-slate-400 mb-6">
                You must return to fullscreen immediately. Grace period: <strong className="text-rose-400">{fullscreenGraceSeconds}s</strong>
              </p>

              <button
                onClick={handleReturnToFullscreen}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-600/25 transition text-sm"
              >
                Return to Fullscreen Mode
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SUBMIT CONFIRMATION MODAL
        ---------------------------------------------------- */}
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">Submit Weekly Quiz?</h3>
              <p className="text-xs text-slate-400 mb-4">
                Are you sure you want to finish? You have answered <strong>{answeredCount} of {totalQ}</strong> questions.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Continue Quiz
                </button>
                <button
                  onClick={() => handleSubmitQuiz('MANUAL')}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-1.5"
                >
                  {submitting ? 'Submitting...' : 'Yes, Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 8. PAUSED PHASE
  if (phase === 'PAUSED') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 font-sans text-center">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-8 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Assessment Temporarily Paused</h2>
          <p className="text-xs text-slate-400 mb-6">
            The assessment invigilator has paused your session or a device reconnect is required. Your answers and timer are preserved safely.
          </p>
          <div className="space-y-3">
            {cameraInterrupted && (
              <button
                onClick={handleReconnectCamera}
                className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Reconnect Webcam
              </button>
            )}
            {screenInterrupted && (
              <button
                onClick={handleReconnectScreen}
                className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Reconnect Screen Share
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 9. SUBMITTED PHASE
  if (phase === 'SUBMITTED') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 font-sans text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Assessment Completed</h2>
          <p className="text-xs text-slate-400 mb-6">
            Your responses have been recorded and locked.
          </p>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-left text-xs space-y-2 mb-6">
            <div className="flex justify-between text-slate-300">
              <span>Candidate:</span>
              <strong className="text-white">{studentName || email}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Roll Number:</span>
              <strong className="text-white">{rollNumber || 'N/A'}</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Questions Answered:</span>
              <strong className="text-emerald-400">{Object.keys(answers).length} / {questions.length || 20}</strong>
            </div>
            {submissionReference && (
              <div className="flex justify-between text-slate-300">
                <span>Reference ID:</span>
                <strong className="font-mono text-amber-400">{submissionReference}</strong>
              </div>
            )}
            {submissionReason && submissionReason !== 'MANUAL' && (
              <div className="flex justify-between text-slate-300">
                <span>Submission Reason:</span>
                <strong className="text-rose-400">{submissionReason}</strong>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              sessionStorage.clear();
              window.location.href = '/quiz';
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl text-xs transition"
          >
            Return to Portal Home
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function WeeklyQuizPortal() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Assessment Portal...</div>}>
      <WeeklyQuizPortalContent />
    </Suspense>
  );
}
