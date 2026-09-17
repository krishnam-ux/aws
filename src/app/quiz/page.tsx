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

  // Hardware & Environment Check State
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraDetected, setCameraDetected] = useState(false);
  const [micDetected, setMicDetected] = useState(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [checkingHardware, setCheckingHardware] = useState(false);
  const [faceCheckStatus, setFaceCheckStatus] = useState<FaceStatus>('UNKNOWN');
  const [faceCheckCount, setFaceCheckCount] = useState(0);

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

  // Floating Webcam Widget State
  const [isWebcamMinimized, setIsWebcamMinimized] = useState(false);
  const [webcamPos, setWebcamPos] = useState<{ x: number; y: number }>({ x: 24, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 24,
    initialY: 80
  });

  // Integrity & Security Alerts State
  const [cameraInterrupted, setCameraInterrupted] = useState(false);
  const [cameraGraceSeconds, setCameraGraceSeconds] = useState(30);
  const [fullscreenExited, setFullscreenExited] = useState(false);
  const [fullscreenGraceSeconds, setFullscreenGraceSeconds] = useState(15);
  const [liveFaceStatus, setLiveFaceStatus] = useState<FaceStatus>('ONE_FACE');
  const [integrityWarning, setIntegrityWarning] = useState<string | null>(null);

  // Refs for Media & Signaling
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const floatingVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
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

  // Log Security Event Helper
  const logSecurityEvent = useCallback(
    async (eventType: string, severity: string = 'INFO', metadata?: Record<string, any>, durationSeconds?: number) => {
      if (!attemptId || !sessionToken) return;
      try {
        await fetch('/api/quiz/security-event', {
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
      } catch (err) {
        // Silently handle telemetry log errors
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

      // Bind to preview video
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }

      // Listen for camera track ended (disconnection)
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

  // Start Hardware Check when reaching CAMERA_CHECK phase
  useEffect(() => {
    if (phase === 'CAMERA_CHECK') {
      initializeHardwareCheck();
    }
  }, [phase]);

  // Bind stream when video refs mount
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
  }, [cameraStream, phase]);

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

  // Setup WebRTC Peer Connection & Streaming
  const setupWebRTCConnection = useCallback(
    async (stream: MediaStream, attId: string, tok: string) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        peerConnectionRef.current = pc;

        // Add tracks to peer connection
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // ICE candidate handler
        pc.onicecandidate = async event => {
          if (event.candidate) {
            try {
              await fetch('/api/quiz/webrtc/signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  attemptId: attId,
                  token: tok,
                  iceCandidate: event.candidate
                })
              });
            } catch (e) {}
          }
        };

        // Create WebRTC Offer SDP
        const offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false
        });
        await pc.setLocalDescription(offer);

        // Send offer to server
        await fetch('/api/quiz/webrtc/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId: attId,
            token: tok,
            offer: pc.localDescription,
            cameraActive: true
          })
        });

        // Start polling for proctor answer & ICE candidates
        const pollInterval = setInterval(async () => {
          if (!peerConnectionRef.current || pc.connectionState === 'closed') {
            clearInterval(pollInterval);
            return;
          }

          try {
            const res = await fetch(`/api/quiz/webrtc/signal?attemptId=${encodeURIComponent(attId)}&token=${encodeURIComponent(tok)}`);
            const data = await res.json();

            if (data.success) {
              if (data.answer && !pc.currentRemoteDescription) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
              }
              if (Array.isArray(data.adminIceCandidates)) {
                for (const candidate of data.adminIceCandidates) {
                  try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                  } catch (e) {}
                }
              }
            }
          } catch (e) {}
        }, 2500);
      } catch (err) {
        console.error('WebRTC setup error:', err);
      }
    },
    []
  );

  // Generate lightweight snapshot preview for fallback telemetry
  const capturePreviewFrame = useCallback((): string | null => {
    const video = floatingVideoRef.current || videoPreviewRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, 160, 120);
      return canvas.toDataURL('image/jpeg', 0.6);
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

    // Request fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      // Fullscreen policy may require user gesture; continue gracefully
    }

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

      sessionStorage.setItem('wq_session_token', data.token);
      sessionStorage.setItem('wq_attempt_id', data.attemptId);

      // Start WebRTC Peer Connection
      await setupWebRTCConnection(cameraStream, data.attemptId, data.token);

      setPhase('QUIZ');
    } catch (err: any) {
      alert(err.message || 'Unable to launch quiz.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Face Detection Tracker & Heartbeat during Quiz
  useEffect(() => {
    if (phase !== 'QUIZ' || !attemptId || !sessionToken) return;

    faceTrackerRef.current = new FaceStatusTracker({
      noFaceThresholdSeconds: quiz?.settings?.noFaceThresholdSeconds || 6,
      multipleFacesThresholdSeconds: quiz?.settings?.multipleFacesThresholdSeconds || 4,
      onNoFaceDetected: duration => {
        setLiveFaceStatus('NO_FACE');
        setIntegrityWarning('Face not detected. Please keep your face fully visible in the camera frame.');
        logSecurityEvent('NO_FACE_DETECTED', 'WARNING', { durationSeconds: duration }, duration);
      },
      onMultipleFacesDetected: duration => {
        setLiveFaceStatus('MULTIPLE_FACES');
        setIntegrityWarning('Multiple faces detected. Please ensure only the registered candidate is in view.');
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

    // Heartbeat & Telemetry Snapshots (every 4 seconds)
    heartbeatIntervalRef.current = setInterval(async () => {
      const preview = capturePreviewFrame();
      try {
        await fetch('/api/quiz/webrtc/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attemptId,
            token: sessionToken,
            previewFrame: preview,
            cameraActive: !cameraInterrupted
          })
        });
      } catch (e) {}
    }, 4000);

    return () => {
      if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [phase, attemptId, sessionToken, quiz, cameraInterrupted, capturePreviewFrame, logSecurityEvent]);

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

    // Periodic sync with server status every 15s
    const syncInterval = setInterval(async () => {
      if (!attemptId || !sessionToken) return;
      try {
        const res = await fetch(`/api/quiz/status?attemptId=${encodeURIComponent(attemptId)}&token=${encodeURIComponent(sessionToken)}`);
        const data = await res.json();
        if (data.success) {
          if (data.status === 'PAUSED') {
            setPhase('PAUSED');
          } else if (data.status === 'SUBMITTED') {
            setPhase('SUBMITTED');
          } else if (typeof data.remainingSeconds === 'number') {
            setRemainingSeconds(data.remainingSeconds);
          }
        }
      } catch (e) {}
    }, 15000);

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
      logSecurityEvent('NETWORK_RECOVERED', 'INFO');
    } catch (e) {
      alert('Could not reconnect camera. Please verify device permissions and connections.');
    }
  };

  // Fullscreen & Visibility Event Observers
  useEffect(() => {
    if (phase !== 'QUIZ') return;

    const handleFullscreenChange = () => {
      const isFull = Boolean(document.fullscreenElement);
      if (!isFull) {
        setFullscreenExited(true);
        setFullscreenGraceSeconds(15);
        logSecurityEvent('FULLSCREEN_EXIT', 'WARNING');

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
        logSecurityEvent('TAB_FOCUS_LOST', 'WARNING');
      } else {
        logSecurityEvent('TAB_FOCUS_RESTORED', 'INFO');
      }
    };

    const handleBlur = () => {
      logSecurityEvent('TAB_FOCUS_LOST', 'WARNING');
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
        logSecurityEvent('UNAUTHORIZED_KEY', 'WARNING', { key: e.key });
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
        setPhase('SUBMITTED');
        setIsSubmitModalOpen(false);

        // Clean up media tracks
        if (cameraStream) {
          cameraStream.getTracks().forEach(t => t.stop());
        }
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
        }
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
        x: Math.max(10, Math.min(window.innerWidth - 220, dragRef.current.initialX + dx)),
        y: Math.max(60, Math.min(window.innerHeight - 180, dragRef.current.initialY + dy))
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

  const formatTimer = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // =========================================================================
  // 1. STAGE: AUTHENTICATION
  // =========================================================================
  if (phase === 'AUTH') {
    return (
      <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col justify-between font-sans selection:bg-[#FF9900] selection:text-slate-950">
        {/* Header Branding */}
        <header className="border-b border-slate-800/80 bg-[#0B132B]/80 px-6 py-4 backdrop-blur-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9900] to-amber-600 flex items-center justify-center font-extrabold text-slate-950 text-base shadow-lg shadow-orange-500/20">
                AWS
              </div>
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Weekly AWS Quiz Portal
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  AWS Student Builder Group at Chandigarh University – Uttar Pradesh
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Proctored Assessment Mode</span>
            </div>
          </div>
        </header>

        {/* Login Card */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0E1726]/90 border border-slate-800/90 rounded-2xl p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#FF9900]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="space-y-2 text-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/30">
                Weekly Learning Assessment
              </span>
              <h1 className="text-2xl font-extrabold text-white tracking-tight font-display">
                Candidate Sign In
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your registered university email to access your weekly proctored assessment.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs font-medium flex items-center gap-2">
                <span>⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Registered University Email <span className="text-[#FF9900]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="student@cumail.in"
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#FF9900] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Student Name <span className="text-slate-500 font-normal">(Optional if previously registered)</span>
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#FF9900] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Roll / UID Number <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={e => setRollNumber(e.target.value)}
                  placeholder="e.g. 23BCS10142"
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#FF9900] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF9900] to-amber-600 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-bold text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {authLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Identity...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Assessment Portal</span>
                    <span>&rarr;</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
              Assigned to students attending weekly AWS learning sessions.
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-800/80 bg-[#0B132B]/80 px-6 py-4 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} AWS Student Builder Group at Chandigarh University – Uttar Pradesh.
        </footer>
      </div>
    );
  }

  // =========================================================================
  // 2. STAGE: CANDIDATE DASHBOARD
  // =========================================================================
  if (phase === 'DASHBOARD') {
    return (
      <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col font-sans selection:bg-[#FF9900] selection:text-slate-950">
        <header className="border-b border-slate-800/80 bg-[#0B132B]/80 px-6 py-4 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9900] to-amber-600 flex items-center justify-center font-extrabold text-slate-950 text-base shadow-lg shadow-orange-500/20">
              AWS
            </div>
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-white">
                Weekly AWS Quiz Dashboard
              </div>
              <div className="text-[10px] text-slate-400">
                AWS Student Builder Group at Chandigarh University – Uttar Pradesh
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white">{studentName || 'Candidate'}</span>
              <span className="text-[10px] text-slate-400 font-mono">{email}</span>
            </div>
            <button
              onClick={() => {
                sessionStorage.clear();
                setPhase('AUTH');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-red-950/40 hover:text-red-400 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full p-6 space-y-8">
          {/* Candidate Welcome Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0E1726] via-[#132035] to-[#0E1726] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#FF9900] uppercase tracking-wider">Candidate Portal</span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                Welcome, {studentName || 'AWS Builder'}!
              </h2>
              <p className="text-xs text-slate-300">
                Roll Number: <span className="font-mono text-white font-bold">{rollNumber || 'N/A'}</span> • Email: <span className="font-mono text-white">{email}</span>
              </p>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Identity Verified</span>
            </div>
          </div>

          {/* Active Weekly Quiz Card */}
          {quiz ? (
            <div className="bg-[#0E1726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF9900]/20 text-[#FF9900] border border-[#FF9900]/30">
                      {quiz.quizCode}
                    </span>
                    <span className="text-xs text-slate-400">Live Weekly Assessment</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1 font-display">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 font-medium">
                    Topic: <span className="text-slate-100 font-semibold">{quiz.topic}</span>
                  </p>
                </div>

                <div className="self-start sm:self-auto">
                  {existingAttempt && (existingAttempt.status === 'SUBMITTED' || existingAttempt.status === 'REVIEW_REQUIRED') ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ✓ COMPLETED
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                      ● READY
                    </span>
                  )}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-bold">Duration</div>
                  <div className="text-lg font-extrabold text-white mt-1">{quiz.durationMinutes} Minutes</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-bold">Questions</div>
                  <div className="text-lg font-extrabold text-white mt-1">{quiz.totalQuestionsToSelect} Randomized</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-bold">Passing Score</div>
                  <div className="text-lg font-extrabold text-white mt-1">{quiz.passingPercentage}%</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-bold">Attempts Allowed</div>
                  <div className="text-lg font-extrabold text-amber-400 mt-1">1 Proctored</div>
                </div>
              </div>

              {/* Action Area */}
              {existingAttempt && (existingAttempt.status === 'SUBMITTED' || existingAttempt.status === 'REVIEW_REQUIRED') ? (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-1">
                  <div className="text-sm font-bold text-white">Assessment Submitted</div>
                  <div className="text-xs text-slate-400">
                    Your response has been recorded. Results will be communicated according to AWS SBG policies.
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-slate-900 border border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="text-sm font-bold text-white">Ready for your Weekly AWS Quiz?</div>
                    <div className="text-xs text-slate-300">
                      Requires live camera monitoring and focused environment.
                    </div>
                  </div>
                  <button
                    onClick={() => setPhase('CAMERA_CHECK')}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF9900] to-amber-600 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <span>Enter Weekly Quiz</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 bg-[#0E1726] border border-slate-800 rounded-2xl text-center text-slate-400">
              No live weekly quiz is currently scheduled. Please check back after the next weekly session.
            </div>
          )}
        </main>
      </div>
    );
  }

  // =========================================================================
  // 3. STAGE: CAMERA & ENVIRONMENT CHECK
  // =========================================================================
  if (phase === 'CAMERA_CHECK') {
    return (
      <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col justify-between font-sans">
        <header className="border-b border-slate-800/80 bg-[#0B132B]/80 px-6 py-4 backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF9900] to-amber-600 flex items-center justify-center font-bold text-slate-950 text-sm">
                AWS
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-white">
                Webcam &amp; Environment Check
              </div>
            </div>
            <button
              onClick={() => setPhase('DASHBOARD')}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-[#0E1726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-extrabold text-white font-display">
                Webcam &amp; Environment Check
              </h2>
              <p className="text-xs text-slate-400">
                Please verify your live camera feed and environment before proceeding.
              </p>
            </div>

            {/* Live Camera Viewport */}
            <div className="relative aspect-video w-full max-w-md mx-auto bg-slate-950 rounded-xl overflow-hidden border-2 border-slate-800 shadow-inner flex items-center justify-center">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraDetected ? 'block' : 'hidden'}`}
              />

              {!cameraDetected && (
                <div className="p-6 text-center space-y-2">
                  <div className="text-3xl">🎥</div>
                  <div className="text-xs text-slate-400">
                    {checkingHardware ? 'Detecting camera...' : 'Camera feed not connected.'}
                  </div>
                </div>
              )}

              {cameraDetected && (
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>LIVE CAMERA</span>
                </div>
              )}
            </div>

            {/* Hardware Status Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <span>🎥</span>
                  <span>Camera</span>
                </div>
                {cameraDetected ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    🟢 Detected
                  </span>
                ) : (
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                    ❌ Not Detected
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <span>🎤</span>
                  <span>Microphone</span>
                </div>
                {micDetected ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    🟢 Detected
                  </span>
                ) : (
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                    ❌ Not Detected
                  </span>
                )}
              </div>
            </div>

            {/* Privacy-Preserving Face Status Check */}
            {cameraDetected && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-left">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-200">Face Check</div>
                  <div className="text-[10px] text-slate-400">Privacy-preserving camera frame presence</div>
                </div>
                {faceCheckStatus === 'ONE_FACE' ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    ✓ One face detected
                  </span>
                ) : faceCheckStatus === 'MULTIPLE_FACES' ? (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    ⚠️ Multiple faces detected
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    ⚠️ Face not detected
                  </span>
                )}
              </div>
            )}

            {/* Permission Denied Alert */}
            {cameraPermissionError && (
              <div className="p-4 bg-red-950/50 border border-red-800/80 rounded-xl text-left space-y-2">
                <div className="text-xs font-extrabold text-red-300 flex items-center gap-2">
                  <span>❌</span>
                  <span>Camera permission required</span>
                </div>
                <div className="text-xs text-red-200 leading-relaxed">
                  {cameraPermissionError}
                </div>
                <button
                  onClick={initializeHardwareCheck}
                  className="px-4 py-2 bg-red-800/60 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={() => setPhase('CONSENT')}
              disabled={!cameraDetected || checkingHardware}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#FF9900] to-amber-600 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Allow Camera &amp; Continue</span>
              <span>&rarr;</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // 4. STAGE: PRIVACY & PROCTORING CONSENT
  // =========================================================================
  if (phase === 'CONSENT') {
    return (
      <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col justify-between font-sans">
        <header className="border-b border-slate-800/80 bg-[#0B132B]/80 px-6 py-4 backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF9900] to-amber-600 flex items-center justify-center font-bold text-slate-950 text-sm">
                AWS
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-white">
                Proctoring &amp; Assessment Integrity
              </div>
            </div>
            <button
              onClick={() => setPhase('CAMERA_CHECK')}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Back
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#0E1726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FF9900]/10 border border-[#FF9900]/30 flex items-center justify-center text-2xl">
              🛡️
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                Privacy &amp; Proctoring Notice
              </h2>
              <p className="text-xs text-slate-400">
                Please review the assessment integrity policies before starting.
              </p>
            </div>

            <div className="p-5 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs text-slate-300 text-left space-y-3 leading-relaxed">
              <p className="font-semibold text-white">
                &ldquo;This assessment uses webcam monitoring and technical activity signals to help maintain assessment integrity.
              </p>
              <p>
                Please keep your face visible and remain in a suitable environment while completing the assessment.&rdquo;
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-400 text-[11px]">
                <li>Zero facial recognition or biometric profiling is performed.</li>
                <li>Live camera stream coordinates securely to authorized proctors in real-time.</li>
                <li>Fullscreen mode and browser focus are monitored to ensure fairness.</li>
              </ul>
            </div>

            <div className="flex items-center gap-3 text-left">
              <input
                type="checkbox"
                id="consentCheck"
                checked={consentAcknowledged}
                onChange={e => setConsentAcknowledged(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-[#FF9900] focus:ring-[#FF9900] cursor-pointer"
              />
              <label htmlFor="consentCheck" className="text-xs text-slate-300 cursor-pointer">
                I understand and agree to the assessment monitoring guidelines.
              </label>
            </div>

            <button
              onClick={handleLaunchQuiz}
              disabled={!consentAcknowledged || authLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#FF9900] to-amber-600 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-extrabold text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {authLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Launching Assessment...</span>
                </>
              ) : (
                <>
                  <span>I Understand &amp; Start Quiz</span>
                  <span>&rarr;</span>
                </>
              )}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // =========================================================================
  // 5. STAGE: LIVE PROCTORED QUIZ UI
  // =========================================================================
  if (phase === 'QUIZ' && questions.length > 0) {
    const currentQuestion = questions[currentQIndex];
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col font-sans select-none">
        {/* Fixed Proctored Header */}
        <header className="border-b border-slate-800/90 bg-[#0B132B]/95 px-6 py-3 sticky top-0 z-40 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FF9900] text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
              AWS
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>{quiz?.title || 'Weekly AWS Quiz'}</span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Question {currentQIndex + 1} of {questions.length} • {answeredCount} Answered
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Save indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
              {saveStatus === 'saving' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-spin"></span>
                  <span>Saving...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  <span>Save Error</span>
                </>
              )}
            </div>

            {/* Authoritative Server Countdown Timer */}
            <div
              className={`px-3.5 py-1.5 rounded-xl border font-mono font-extrabold text-sm flex items-center gap-1.5 ${
                remainingSeconds <= 120
                  ? 'bg-red-950/60 border-red-500 text-red-400 animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-white'
              }`}
            >
              <span>⏱️</span>
              <span>{formatTimer(remainingSeconds)}</span>
            </div>

            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Finish Quiz
            </button>
          </div>
        </header>

        {/* Live Integrity Alerts Banner */}
        {integrityWarning && (
          <div className="bg-amber-950/80 border-b border-amber-600/60 px-6 py-2 text-center text-xs font-bold text-amber-200 flex items-center justify-center gap-2 animate-in fade-in">
            <span>⚠️</span>
            <span>{integrityWarning}</span>
          </div>
        )}

        {/* Quiz Layout: Main Question Area + Question Palette */}
        <div className="flex-1 max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Box */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-[#0E1726] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Question {currentQIndex + 1}
                </span>
                <span className="text-xs font-mono font-bold text-[#FF9900] bg-[#FF9900]/10 px-2.5 py-1 rounded-md border border-[#FF9900]/30">
                  {currentQuestion?.marks || 5} Points
                </span>
              </div>

              {/* Question Text */}
              <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {currentQuestion?.question}
              </h3>

              {/* Options */}
              <div className="space-y-3 pt-2">
                {currentQuestion?.options.map((optionText: string, optIdx: number) => {
                  const isSelected = answers[currentQuestion.id] === optIdx;
                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`p-4 rounded-xl border text-sm transition-all cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? 'bg-[#FF9900]/15 border-[#FF9900] text-white shadow-md shadow-orange-500/10'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-200'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-[#FF9900] text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </div>
                      <div className="leading-relaxed">{optionText}</div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Nav Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-800">
                <button
                  onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
                >
                  &larr; Previous
                </button>

                <button
                  onClick={handleToggleReview}
                  className={`px-4 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                    markedForReview.includes(currentQuestion.id)
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {markedForReview.includes(currentQuestion.id) ? '★ Marked for Review' : '☆ Mark for Review'}
                </button>

                {currentQIndex < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-5 py-2 rounded-xl bg-[#FF9900] hover:bg-[#E08800] text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Next &rarr;
                  </button>
                ) : (
                  <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all shadow-md cursor-pointer"
                  >
                    Submit Quiz
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Question Palette Sidebar */}
          <div className="space-y-4">
            <div className="bg-[#0E1726] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                Question Palette
              </div>

              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isMarked = markedForReview.includes(q.id);
                  const isCurrent = idx === currentQIndex;

                  let bg = 'bg-slate-950 border-slate-800 text-slate-400';
                  if (isCurrent) {
                    bg = 'border-2 border-[#FF9900] text-white bg-slate-900';
                  } else if (isMarked) {
                    bg = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                  } else if (isAnswered) {
                    bg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQIndex(idx)}
                      className={`h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${bg}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] space-y-1.5 text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500"></span>
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500"></span>
                  <span>Marked for Review ({markedForReview.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-slate-950 border border-slate-800"></span>
                  <span>Unanswered ({questions.length - answeredCount})</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Movable Webcam Badge */}
        <div
          style={{
            position: 'fixed',
            left: `${webcamPos.x}px`,
            top: `${webcamPos.y}px`,
            zIndex: 50
          }}
          className={`shadow-2xl transition-shadow rounded-2xl overflow-hidden border border-slate-700 bg-slate-900/95 backdrop-blur-md select-none ${
            isDragging ? 'opacity-80 scale-105 cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {/* Draggable Titlebar */}
          <div
            onMouseDown={handleMouseDown}
            className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white uppercase tracking-wider">
              <span>🎥</span>
              <span>PROCTORING</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <button
                onClick={() => setIsWebcamMinimized(!isWebcamMinimized)}
                className="text-slate-400 hover:text-white text-xs px-1"
                title={isWebcamMinimized ? 'Expand' : 'Minimize'}
              >
                {isWebcamMinimized ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {/* Webcam Viewport */}
          {!isWebcamMinimized && (
            <div className="relative w-44 h-32 bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={floatingVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 left-1.5 bg-slate-950/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-400">
                🟢 Active
              </div>
            </div>
          )}

          {/* Minimized Status View */}
          {isWebcamMinimized && (
            <div className="px-3 py-1.5 bg-slate-950 text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
              <span>👤 Camera Active</span>
            </div>
          )}
        </div>

        {/* Camera Disconnection Grace Overlay */}
        {cameraInterrupted && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#0E1726] border-2 border-red-600 rounded-2xl p-6 shadow-2xl text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <h3 className="text-lg font-bold text-white">Webcam Connection Interrupted</h3>
              <p className="text-xs text-slate-300">
                Webcam monitoring is required. Please reconnect your camera immediately.
              </p>
              <div className="p-3 bg-red-950/50 border border-red-800 rounded-xl text-red-300 font-mono font-bold text-sm">
                Grace Period: {cameraGraceSeconds} seconds
              </div>
              <button
                onClick={handleReconnectCamera}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Reconnect Camera
              </button>
            </div>
          </div>
        )}

        {/* Fullscreen Exit Overlay */}
        {fullscreenExited && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#0E1726] border-2 border-amber-500 rounded-2xl p-6 shadow-2xl text-center space-y-4">
              <div className="text-4xl">🖥️</div>
              <h3 className="text-lg font-bold text-white">Fullscreen Mode Required</h3>
              <p className="text-xs text-slate-300">
                Please return to fullscreen mode to continue your assessment.
              </p>
              <div className="p-3 bg-amber-950/50 border border-amber-800 rounded-xl text-amber-300 font-mono font-bold text-sm">
                Grace Period: {fullscreenGraceSeconds} seconds
              </div>
              <button
                onClick={handleReturnToFullscreen}
                className="w-full py-2.5 bg-[#FF9900] hover:bg-[#E08800] text-slate-950 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Return to Fullscreen
              </button>
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-[#0E1726] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
              <h3 className="text-lg font-extrabold text-white font-display">Submit Assessment</h3>
              <p className="text-xs text-slate-300">
                You have answered <strong className="text-white">{answeredCount}</strong> of{' '}
                <strong className="text-white">{questions.length}</strong> questions.
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                Once submitted, your responses cannot be modified.
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Return to Quiz
                </button>
                <button
                  onClick={() => handleSubmitQuiz('MANUAL')}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Confirm Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 6. STAGE: POST-SUBMISSION CONFIRMATION
  // =========================================================================
  if (phase === 'SUBMITTED') {
    return (
      <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col justify-between font-sans">
        <header className="border-b border-slate-800/80 bg-[#0B132B]/80 px-6 py-4 backdrop-blur-md">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF9900] to-amber-600 flex items-center justify-center font-bold text-slate-950 text-sm">
              AWS
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-white">
              Weekly AWS Quiz Portal
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#0E1726] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
              ✓
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl font-extrabold text-white font-display">
                Quiz Submitted Successfully
              </h2>
              <p className="text-xs text-slate-300">
                Your response has been recorded.
              </p>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2 text-left font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Candidate:</span>
                <span className="text-white font-bold">{studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-white">{email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Submission ID:</span>
                <span className="text-[#FF9900] font-bold">{submissionReference || 'Recorded'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
              &ldquo;Your result will be communicated to you.&rdquo;
            </div>

            <button
              onClick={() => {
                sessionStorage.removeItem('wq_session_token');
                sessionStorage.removeItem('wq_attempt_id');
                setPhase('DASHBOARD');
              }}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Return to Candidate Dashboard
            </button>
          </div>
        </main>

        <footer className="border-t border-slate-800/80 bg-[#0B132B]/80 px-6 py-4 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} AWS Student Builder Group at Chandigarh University – Uttar Pradesh.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070D18] flex items-center justify-center text-slate-400">
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 border-2 border-[#FF9900] border-t-transparent rounded-full animate-spin"></span>
        <span>Loading Weekly Quiz Portal...</span>
      </div>
    </div>
  );
}

export default function WeeklyQuizPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070D18] flex items-center justify-center text-slate-400">
          Loading Assessment Portal...
        </div>
      }
    >
      <WeeklyQuizPortalContent />
    </Suspense>
  );
}
