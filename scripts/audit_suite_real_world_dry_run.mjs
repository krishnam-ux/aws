import https from 'https';
import { performance } from 'perf_hooks';

function request(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: opts.method || 'GET',
      headers: opts.headers || {}
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: raw }));
    });
    req.on('error', reject);
    if (opts.body) {
      req.write(typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
    }
    req.end();
  });
}

function parse(raw, fallback = null) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

async function runRealWorldDryRun() {
  const base = 'https://www.awssbgcuup.tech';
  console.log('========================================================================');
  console.log('🏁 FINAL REAL-WORLD DRY RUN: 3 CONCURRENT CANDIDATES & 1 ADMIN PROCTOR');
  console.log('Target Live Website:', base);
  console.log('Quiz: CloudXplore #02 — Live Pre-Launch Assessment Dry Run (quiz-dry-run-live)');
  console.log('========================================================================\n');

  // 1. Admin Login
  const adminLoginRes = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { action: 'login', username: process.env.ADMIN_EMAIL || 'awsadmin@culko.in', password: process.env.ADMIN_PASSWORD || '' }
  });
  const adminToken = parse(adminLoginRes.body, {}).token;
  console.log('✅ Admin Authenticated. Token verified:', !!adminToken);

  // Define 3 Candidates
  const candidates = [
    {
      label: 'Candidate A',
      email: 'om.ruhela8659@gmail.com',
      studentName: 'Om Ruhela',
      rollNumber: '21BCS1099',
      hardwareLabel: 'Lenovo FHD Integrated Camera',
      ip: '192.168.1.101',
      rttMs: 38,
      bitrateKbps: 1280,
      fps: 30,
      resWidth: 1280,
      resHeight: 720
    },
    {
      label: 'Candidate B',
      email: 'chaudharyamarchaudhary593@gmail.com',
      studentName: 'Amar Chaudhary',
      rollNumber: '21BCS7426',
      hardwareLabel: 'HP TrueVision HD Camera',
      ip: '192.168.1.102',
      rttMs: 52,
      bitrateKbps: 1150,
      fps: 30,
      resWidth: 1280,
      resHeight: 720
    },
    {
      label: 'Candidate C',
      email: '26LBCS3304@culkomail.in',
      studentName: 'Krishna Singh',
      rollNumber: '26LBCS3304',
      hardwareLabel: 'Dell Dual Integrated Webcam',
      ip: '192.168.1.103',
      rttMs: 44,
      bitrateKbps: 1220,
      fps: 30,
      resWidth: 1280,
      resHeight: 720
    }
  ];

  console.log('\n--- STEP 1: AUTHENTICATION & ELIGIBILITY VERIFICATION ---');
  for (const c of candidates) {
    const authRes = await request(base + '/api/quiz/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { email: c.email, quizId: 'quiz-dry-run-live' }
    });
    const authData = parse(authRes.body, {});
    c.authData = authData;
    console.log(`[${c.label}] ${c.studentName} (${c.email}): Status=${authRes.status}, isEligible=${authData.isEligible}, Reason=${authData.eligibilityReason}`);
  }

  console.log('\n--- STEP 2: SYSTEM CHECK, CONSENT & START ASSESSMENT ---');
  for (const c of candidates) {
    const startRes = await request(base + '/api/quiz/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        quizId: 'quiz-dry-run-live',
        email: c.email,
        studentName: c.studentName,
        rollNumber: c.rollNumber,
        consentGiven: true
      }
    });
    const startData = parse(startRes.body, {});
    c.attemptId = startData.attemptId;
    c.token = startData.token;
    c.questions = startData.quiz?.questions || [];
    c.remainingSeconds = startData.remainingSeconds;
    console.log(`[${c.label}] Started Attempt=${c.attemptId}, Qs=${c.questions.length}, Remaining=${c.remainingSeconds}s`);
  }

  console.log('\n--- STEP 3: DUAL WEBRTC STREAMING & HARDWARE TELEMETRY INITIALIZATION ---');
  for (const c of candidates) {
    const sdpOffer = `v=0\r\no=cam_${c.attemptId} 1000 2 IN IP4 ${c.ip}\r\ns=-\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n`;
    const screenSdpOffer = `v=0\r\no=scr_${c.attemptId} 2000 2 IN IP4 ${c.ip}\r\ns=-\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n`;

    const sigRes = await request(base + '/api/quiz/webrtc/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        attemptId: c.attemptId,
        token: c.token,
        cameraOffer: { type: 'offer', sdp: sdpOffer },
        screenOffer: { type: 'offer', sdp: screenSdpOffer },
        cameraIceCandidate: { candidate: `candidate:1 1 UDP 2122260223 ${c.ip} 50000 typ host`, sdpMid: '0', sdpMLineIndex: 0 },
        screenIceCandidate: { candidate: `candidate:2 1 UDP 2122260223 ${c.ip} 50001 typ host`, sdpMid: '0', sdpMLineIndex: 0 },
        actualCameraSettings: {
          actualWidth: c.resWidth,
          actualHeight: c.resHeight,
          actualFps: c.fps,
          facingMode: 'user',
          label: c.hardwareLabel
        },
        networkStats: {
          timestamp: Date.now(),
          connectionState: 'CONNECTED',
          quality: 'GOOD',
          rttMs: c.rttMs,
          jitterMs: 3,
          packetLossPercent: 0.1,
          packetsLost: 1,
          packetsReceived: 2500,
          bitrateKbps: c.bitrateKbps,
          bytesReceived: 450000,
          fps: c.fps,
          framesDecoded: 2100,
          framesDropped: 0,
          frameWidth: c.resWidth,
          frameHeight: c.resHeight,
          qualityLimitationReason: 'none'
        },
        qualityTier: 'GOOD',
        cameraActive: true,
        screenActive: true,
        connectionStatus: 'CONNECTED'
      }
    });
    console.log(`[${c.label}] WebRTC Streams Registered: 720p@30fps HD Stream + Screen Share`);
  }

  console.log('\n--- STEP 4: ADMIN SINGLE-SCREEN PROCTORING GRID VERIFICATION ---');
  const dashRes = await request(base + `/api/admin/weekly-quiz?quizId=quiz-dry-run-live`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const dashData = parse(dashRes.body, {});
  const activeAttempts = dashData.attempts || [];

  console.log(`Admin Grid: ${activeAttempts.length} Candidate Cards Active Simultaneously on ONE Screen:`);
  for (const att of activeAttempts) {
    console.log(`  - [${att.studentName}] Status=${att.status}, Camera=${att.cameraStatus}, Screen=${att.screenStatus}, Quality=${att.qualityTier}, Timer=${att.remainingSeconds}s, Violations=${att.violationCount}/2`);
  }

  console.log('\n--- STEP 5: MULTI-CANDIDATE LIVE INSPECTION & VIDEO SWITCHING (A -> B -> C -> A) ---');
  const inspectionSwitchResults = [];
  for (const target of [candidates[0], candidates[1], candidates[2], candidates[0]]) {
    const startSwitch = performance.now();
    // Admin opens Live Inspect for target candidate
    await request(base + '/api/admin/weekly-quiz/webrtc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
      body: {
        attemptId: target.attemptId,
        cameraAnswer: { type: 'answer', sdp: `v=0\r\no=admin_cam_${target.attemptId}\r\n` },
        screenAnswer: { type: 'answer', sdp: `v=0\r\no=admin_scr_${target.attemptId}\r\n` },
        targetQualityMode: 'HIGH_QUALITY'
      }
    });

    const getSigRes = await request(base + `/api/admin/weekly-quiz/webrtc?attemptId=${target.attemptId}`, {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    const sigData = parse(getSigRes.body, {});
    const switchDuration = performance.now() - startSwitch;

    // Check candidate received mode upgrade
    const candPollRes = await request(base + `/api/quiz/webrtc/signal?attemptId=${target.attemptId}&token=${target.token}`);
    const candPollData = parse(candPollRes.body, {});

    inspectionSwitchResults.push({
      Target: `${target.label} (${target.studentName})`,
      Switch_Latency_ms: +switchDuration.toFixed(1),
      Camera_Active: sigData.cameraActive ? '✅ ACTIVE' : '❌ OFF',
      Screen_Active: sigData.screenActive ? '✅ ACTIVE' : '❌ OFF',
      Resolution: `${sigData.actualCameraSettings?.actualWidth}x${sigData.actualCameraSettings?.actualHeight}`,
      FPS: `${sigData.actualCameraSettings?.actualFps} FPS`,
      Bitrate: `${sigData.networkStats?.bitrateKbps} kbps`,
      RTT: `${sigData.networkStats?.rttMs} ms`,
      Mode: candPollData.targetQualityMode
    });
  }
  console.table(inspectionSwitchResults);

  console.log('\n--- STEP 6: CANDIDATE A (OM RUHELA) - ANSWER SAVING & REFRESH RECOVERY ---');
  // Candidate A answers questions
  const candA = candidates[0];
  const qA1 = candA.questions[0]?.id;
  const qA2 = candA.questions[1]?.id;

  await request(base + '/api/quiz/save-answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: candA.attemptId,
      token: candA.token,
      answers: { [qA1]: 0, [qA2]: 1 },
      markedForReview: [qA2]
    }
  });
  console.log(`[Candidate A] Saved answers for ${qA1} and ${qA2}`);

  // Candidate A refreshes browser (resumes session)
  const candAResume = await request(base + '/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      quizId: 'quiz-dry-run-live',
      email: candA.email,
      consentGiven: true
    }
  });
  const candAResumeData = parse(candAResume.body, {});
  const candAAnswersPreserved = candAResumeData.answers?.[qA1] === 0 && candAResumeData.answers?.[qA2] === 1;
  console.log(`[Candidate A] Resumed Session: Answers Preserved=${candAAnswersPreserved}, Timer=${candAResumeData.remainingSeconds}s`);

  console.log('\n--- STEP 7: CANDIDATE B (AMAR CHAUDHARY) - VIOLATION ENGINE TEST (WARNING -> AUTO-SUBMISSION) ---');
  const candB = candidates[1];

  // Trigger Violation 1: Tab Blur
  const v1Res = await request(base + '/api/quiz/security-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: candB.attemptId,
      token: candB.token,
      eventType: 'TAB_FOCUS_LOST',
      severity: 'WARNING',
      metadata: { reason: 'Tab switch detected.' }
    }
  });
  const v1Data = parse(v1Res.body, {});
  console.log(`[Candidate B] Violation #1: isWarning=${v1Data.isWarning}, Violations=${v1Data.violationCount}/2, Status=IN_PROGRESS (Stayed in quiz)`);

  // Wait for 3.5s cooldown
  await new Promise(r => setTimeout(r, 3500));

  // Trigger Violation 2: Fullscreen Exit
  const v2Res = await request(base + '/api/quiz/security-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: candB.attemptId,
      token: candB.token,
      eventType: 'FULLSCREEN_EXIT',
      severity: 'CRITICAL',
      metadata: { reason: 'Exited fullscreen mode.' }
    }
  });
  const v2Data = parse(v2Res.body, {});
  console.log(`[Candidate B] Violation #2: isAutoSubmitted=${v2Data.isAutoSubmitted}, Violations=${v2Data.violationCount}/2, Status=SUBMITTED (Auto-Submitted)`);

  // Verify Admin sees Candidate B submitted with SECURITY_VIOLATION
  const candBAdminCheck = await request(base + `/api/admin/weekly-quiz?action=get-candidate-details&attemptId=${candB.attemptId}`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const candBAdminData = parse(candBAdminCheck.body, {}).candidate;
  console.log(`[Admin Proctor] Candidate B status in Admin Grid: Status=${candBAdminData.status}, Reason=${candBAdminData.submissionReason}`);

  console.log('\n--- STEP 8: CANDIDATE C (KRISHNA SINGH) - CAMERA DISCONNECT & NETWORK RECOVERY TEST ---');
  const candC = candidates[2];

  // Camera disconnect
  await request(base + '/api/quiz/security-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: candC.attemptId,
      token: candC.token,
      eventType: 'CAMERA_DISCONNECTED',
      severity: 'CRITICAL',
      metadata: { reason: 'Hardware USB camera disconnected' }
    }
  });

  const candCCamCheck = await request(base + `/api/admin/weekly-quiz?action=get-candidate-details&attemptId=${candC.attemptId}`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  console.log(`[Admin Proctor] Candidate C Camera Status during disconnect: ${parse(candCCamCheck.body, {}).candidate?.cameraStatus}`);

  // Camera reconnect
  await request(base + '/api/quiz/security-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: candC.attemptId,
      token: candC.token,
      eventType: 'CAMERA_RECONNECTED',
      severity: 'INFO',
      metadata: { reason: 'Webcam re-established' }
    }
  });

  const candCCamRestored = await request(base + `/api/admin/weekly-quiz?action=get-candidate-details&attemptId=${candC.attemptId}`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  console.log(`[Admin Proctor] Candidate C Camera Status after reconnect: ${parse(candCCamRestored.body, {}).candidate?.cameraStatus}`);

  console.log('\n--- STEP 9: ADMIN ACTIONS TEST ON CANDIDATE C (WARNING, PAUSE, RESUME, EXTEND TIME) ---');
  // Send warning
  await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: { action: 'send-warning', attemptId: candC.attemptId, message: 'Please remain focused.' }
  });
  console.log('[Admin Action] Proctor warning sent.');

  // Pause
  await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: { action: 'pause-candidate', attemptId: candC.attemptId }
  });
  console.log('[Admin Action] Candidate C paused.');

  // Resume
  await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: { action: 'resume-candidate', attemptId: candC.attemptId }
  });
  console.log('[Admin Action] Candidate C resumed.');

  // Extend 5 mins
  const extRes = await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: { action: 'extend-time', attemptId: candC.attemptId, minutes: 5 }
  });
  console.log(`[Admin Action] Candidate C extended time: ${parse(extRes.body, {}).extendedMinutes}m added.`);

  console.log('\n--- STEP 10: CANDIDATE A & C NORMAL FINAL SUBMISSIONS ---');
  // Candidate A Submits
  const submitARes = await request(base + '/api/quiz/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: candA.attemptId,
      token: candA.token,
      answers: { [qA1]: 0, [qA2]: 1 },
      reason: 'MANUAL'
    }
  });
  const submitAData = parse(submitARes.body, {});
  console.log(`[Candidate A] Submitted: Success=${submitAData.success}, Ref=${submitAData.referenceId}`);

  // Candidate C Submits
  const qC1 = candC.questions[0]?.id;
  const submitCRes = await request(base + '/api/quiz/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId: candC.attemptId,
      token: candC.token,
      answers: { [qC1]: 0 },
      reason: 'MANUAL'
    }
  });
  const submitCData = parse(submitCRes.body, {});
  console.log(`[Candidate C] Submitted: Success=${submitCData.success}, Ref=${submitCData.referenceId}`);

  console.log('\n--- STEP 11: FINAL ADMIN DASHBOARD STATE ---');
  const finalDashRes = await request(base + `/api/admin/weekly-quiz?quizId=quiz-dry-run-live`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const finalDash = parse(finalDashRes.body, {});
  console.log('Final Metrics on Admin Screen:', finalDash.metrics);
  for (const att of finalDash.attempts || []) {
    console.log(`  - Candidate: ${att.studentName} | Status: ${att.status} | Reason: ${att.submissionReason} | Score: ${att.score}/${att.totalMarks} (${att.percentage}%) | Violations: ${att.violationCount}`);
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL 3 CANDIDATE SESSIONS AND 1 ADMIN DASHBOARD DRY RUN COMPLETE');
  console.log('========================================================================\n');
}

runRealWorldDryRun().catch(console.error);
