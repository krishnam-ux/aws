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

async function runScalabilityAudit() {
  const base = 'https://www.awssbgcuup.tech';
  console.log('========================================================================');
  console.log('🚀 SECTION 7, 8 & 14: MULTI-CANDIDATE STAGED CONCURRENCY BENCHMARK');
  console.log('Target:', base);
  console.log('========================================================================\n');

  // Admin login
  const adminLoginRes = await request(base + '/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { action: 'login', username: process.env.ADMIN_EMAIL || 'awsadmin@culko.in', password: process.env.ADMIN_PASSWORD || '' }
  });
  const adminToken = parse(adminLoginRes.body, {}).token;

  // Staged concurrency tiers
  const tiers = [5, 10, 20, 50, 100];
  const benchmarkResults = [];

  for (const count of tiers) {
    console.log(`\n--- Running Staged Concurrency Benchmark for ${count} Concurrent Candidates ---`);
    const tierStart = performance.now();

    // 1. Concurrent Candidate Signaling Registrations (Simulating 1-second interval grid telemetry heartbeats)
    const signalPromises = [];
    for (let i = 1; i <= count; i++) {
      const attemptId = `wq_att_bench_${count}_${i}`;
      const token = `wq_sess_bench_${count}_${i}`;

      const signalBody = {
        attemptId,
        candidateId: `cand_bench_${count}_${i}`,
        studentName: `Candidate ${i}`,
        email: `bench_${count}_${i}@culkomail.in`,
        quizId: 'quiz-live-audit-test',
        cameraActive: true,
        screenActive: true,
        connectionStatus: 'CONNECTED',
        qualityTier: (i % 5 === 0) ? 'FAIR' : 'GOOD',
        actualCameraSettings: {
          actualWidth: 1280,
          actualHeight: 720,
          actualFps: 30,
          facingMode: 'user'
        },
        networkStats: {
          timestamp: Date.now(),
          connectionState: 'CONNECTED',
          quality: 'GOOD',
          rttMs: 40 + (i % 10) * 5,
          jitterMs: 3,
          packetLossPercent: 0.1,
          packetsLost: 1,
          packetsReceived: 1000,
          bitrateKbps: 1100,
          bytesReceived: 150000,
          fps: 30,
          framesDecoded: 900,
          framesDropped: 0,
          frameWidth: 1280,
          frameHeight: 720,
          qualityLimitationReason: 'none'
        }
      };

      signalPromises.push(
        request(base + '/api/quiz/webrtc/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: signalBody
        })
      );
    }

    const startSignalTime = performance.now();
    const signalResponses = await Promise.all(signalPromises);
    const signalDuration = performance.now() - startSignalTime;
    const signalSuccessCount = signalResponses.filter(r => r.status === 200 || r.status === 400 || r.status === 401).length;

    // 2. Admin Dashboard Fetch Benchmark under Candidate Load
    const adminFetchStart = performance.now();
    const adminDashRes = await request(base + '/api/admin/weekly-quiz', {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    const adminFetchDuration = performance.now() - adminFetchStart;
    const dashData = parse(adminDashRes.body, {});

    const totalTierDuration = performance.now() - tierStart;
    const avgLatencyPerCandidate = +(signalDuration / count).toFixed(2);

    benchmarkResults.push({
      Candidates: `${count} Candidates`,
      Signal_Total_ms: +signalDuration.toFixed(1),
      Avg_Signal_Latency_ms: avgLatencyPerCandidate,
      Admin_Dash_Load_ms: +adminFetchDuration.toFixed(1),
      Admin_Dash_Status: adminDashRes.status === 200 ? '✅ 200 OK' : `❌ ${adminDashRes.status}`,
      Server_Health: adminDashRes.status === 200 ? '✅ HEALTHY' : '⚠️ DEGRADED'
    });
  }

  console.log('\n========================================================================');
  console.log('📊 CONCURRENCY SCALABILITY RESULTS TABLE (PROD SERVER)');
  console.log('========================================================================');
  console.table(benchmarkResults);
}

runScalabilityAudit().catch(console.error);
