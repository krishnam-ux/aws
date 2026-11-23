import https from 'https';

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

async function runWebRTCAudit() {
  const base = 'https://www.awssbgcuup.tech';
  console.log('========================================================================');
  console.log('📹 SECTION 6, 8 & 10: WEBCAM, DUAL STREAM & WEBRTC SIGNALING AUDIT');
  console.log('Target:', base);
  console.log('========================================================================\n');

  const results = [];

  // Admin login
  const adminLoginRes = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { action: 'login', username: process.env.ADMIN_EMAIL || 'awsadmin@culko.in', password: process.env.ADMIN_PASSWORD || '' }
  });
  const adminToken = parse(adminLoginRes.body, {}).token;

  // Setup dedicated quiz for WebRTC signaling
  const now = new Date();
  const quizPayload = {
    action: 'save-quiz',
    quiz: {
      id: 'quiz-webrtc-audit',
      quizCode: 'AWS-WEBRTC-AUDIT',
      title: 'WebRTC Dual Stream Signaling Audit',
      sessionId: 'event-1790339112799',
      scheduledDate: '2026-10-07',
      startTime: '18:00',
      endTime: '23:30',
      timezone: 'Asia/Kolkata',
      durationMinutes: 30,
      status: 'Live',
      questionBank: [{ id: 'q1', question: 'Q1', options: ['A', 'B'], correctOptionIndex: 0, marks: 1 }]
    }
  };
  await request(base + '/api/admin/weekly-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: quizPayload
  });

  // Start fresh candidate attempt with registered email
  const startRes = await request(base + '/api/quiz/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      quizId: 'quiz-webrtc-audit',
      email: 'om.ruhela8659@gmail.com',
      studentName: 'Om Ruhela',
      rollNumber: '21BCS1099',
      consentGiven: true
    }
  });
  const startData = parse(startRes.body, {});
  const attemptId = startData.attemptId;
  const token = startData.token;

  if (!attemptId || !token) {
    throw new Error('Could not start attempt: ' + JSON.stringify(startData));
  }

  console.log(`Testing WebRTC signaling channel for attempt: ${attemptId}`);

  // 1. Candidate sends Dual Stream SDP Offers (Camera Offer + Screen Offer) & Hardware Settings
  const candidateOfferSdp = 'v=0\r\no=candidate_cam 12345 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n';
  const screenOfferSdp = 'v=0\r\no=candidate_scr 67890 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n';

  const candidateSignalRes = await request(base + '/api/quiz/webrtc/signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      attemptId,
      token,
      cameraOffer: { type: 'offer', sdp: candidateOfferSdp },
      screenOffer: { type: 'offer', sdp: screenOfferSdp },
      cameraIceCandidate: { candidate: 'candidate:1 1 UDP 2122260223 192.168.1.50 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 },
      screenIceCandidate: { candidate: 'candidate:2 1 UDP 2122260223 192.168.1.50 50001 typ host', sdpMid: '0', sdpMLineIndex: 0 },
      actualCameraSettings: {
        actualWidth: 1280,
        actualHeight: 720,
        actualFps: 30,
        facingMode: 'user',
        label: 'Live HD Integrated Webcam'
      },
      networkStats: {
        timestamp: Date.now(),
        connectionState: 'CONNECTED',
        quality: 'GOOD',
        rttMs: 38,
        jitterMs: 4,
        packetLossPercent: 0.1,
        packetsLost: 2,
        packetsReceived: 2100,
        bitrateKbps: 1250,
        bytesReceived: 320000,
        fps: 30,
        framesDecoded: 1800,
        framesDropped: 0,
        frameWidth: 1280,
        frameHeight: 720,
        qualityLimitationReason: 'none'
      },
      qualityTier: 'GOOD',
      cameraActive: true,
      screenActive: true,
      connectionStatus: 'CONNECTED'
    }
  });
  const candidateSignalData = parse(candidateSignalRes.body, {});

  results.push({
    Test: '1. Candidate Dual Stream SDP Offer & Hardware Telemetry Registration',
    Status: candidateSignalRes.status === 200 && candidateSignalData.success ? 'PASS' : 'FAIL',
    Details: `Status: ${candidateSignalRes.status}, QualityTier: ${candidateSignalData.qualityTier}, Connection: ${candidateSignalData.connectionStatus}`
  });

  // 2. Admin queries candidate WebRTC signals
  const adminGetSignalRes = await request(base + `/api/admin/weekly-quiz/webrtc?attemptId=${attemptId}`, {
    headers: { Authorization: 'Bearer ' + adminToken }
  });
  const adminSignalData = parse(adminGetSignalRes.body, {});

  const hasBothOffers = adminSignalData.hasCameraStream && adminSignalData.hasScreenStream;
  const hasHardwareData = adminSignalData.actualCameraSettings?.actualWidth === 1280 && adminSignalData.actualCameraSettings?.actualFps === 30;

  results.push({
    Test: '2. Admin Signal Query: Dual Stream Verification & 720p@30fps Hardware Detection',
    Status: adminGetSignalRes.status === 200 && hasBothOffers && hasHardwareData ? 'PASS' : 'FAIL',
    Details: `CameraStream: ${adminSignalData.hasCameraStream}, ScreenStream: ${adminSignalData.hasScreenStream}, Res: ${adminSignalData.actualCameraSettings?.actualWidth}x${adminSignalData.actualCameraSettings?.actualHeight} @ ${adminSignalData.actualCameraSettings?.actualFps}fps`
  });

  // 3. Admin answers candidate SDP and exchanges ICE candidates
  const adminCamAnswerSdp = 'v=0\r\no=admin_cam 54321 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n';
  const adminScreenAnswerSdp = 'v=0\r\no=admin_scr 98765 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\n';

  const adminAnswerRes = await request(base + '/api/admin/weekly-quiz/webrtc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: {
      attemptId,
      cameraAnswer: { type: 'answer', sdp: adminCamAnswerSdp },
      screenAnswer: { type: 'answer', sdp: adminScreenAnswerSdp },
      cameraIceCandidate: { candidate: 'candidate:3 1 UDP 2122260223 10.0.0.1 50002 typ host', sdpMid: '0', sdpMLineIndex: 0 },
      targetQualityMode: 'HIGH_QUALITY'
    }
  });
  const adminAnswerData = parse(adminAnswerRes.body, {});

  results.push({
    Test: '3. Admin WebRTC Answer Registration & High-Quality Mode Command',
    Status: adminAnswerRes.status === 200 && adminAnswerData.success ? 'PASS' : 'FAIL',
    Details: `Status: ${adminAnswerRes.status}, Message: ${adminAnswerData.message}`
  });

  // 4. Candidate receives Admin Answer and targetQualityMode
  const candidatePollRes = await request(base + `/api/quiz/webrtc/signal?attemptId=${attemptId}&token=${token}`, {
    method: 'GET'
  });
  const candidatePollData = parse(candidatePollRes.body, {});

  const receivedCamAnswer = Boolean(candidatePollData.cameraAnswer?.sdp);
  const receivedScreenAnswer = Boolean(candidatePollData.screenAnswer?.sdp);
  const receivedQualityMode = candidatePollData.targetQualityMode === 'HIGH_QUALITY';

  results.push({
    Test: '4. Candidate Poll: Full Duplex SDP Handshake Completion',
    Status: candidatePollRes.status === 200 && receivedCamAnswer && receivedScreenAnswer && receivedQualityMode ? 'PASS' : 'FAIL',
    Details: `CameraAnswer: ${receivedCamAnswer}, ScreenAnswer: ${receivedScreenAnswer}, QualityMode: ${candidatePollData.targetQualityMode}`
  });

  // 5. Grid Resource Management: Admin exits Live View (downgrade signal to GRID mode)
  await request(base + '/api/admin/weekly-quiz/webrtc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: {
      attemptId,
      targetQualityMode: 'GRID'
    }
  });

  const candGridPoll = await request(base + `/api/quiz/webrtc/signal?attemptId=${attemptId}&token=${token}`, {
    method: 'GET'
  });
  const candGridData = parse(candGridPoll.body, {});

  results.push({
    Test: '5. Dynamic Bandwidth Optimization (GRID Mode Resource Throttling)',
    Status: candGridData.targetQualityMode === 'GRID' ? 'PASS' : 'FAIL',
    Details: `TargetQualityMode received: ${candGridData.targetQualityMode} (Ensures unselected video streams do not overload client/admin bandwidth)`
  });

  console.table(results);
}

runWebRTCAudit().catch(console.error);
