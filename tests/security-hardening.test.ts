import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { generateAdminToken, verifyAdminToken, isAuthorizedAdmin } from '../src/lib/adminAuth';
import { sanitizeSvg, isDangerousSvg, isValidPdfBuffer } from '../src/lib/security';
import { middleware } from '../src/middleware';
import { GET as getEnv } from '../src/app/api/env/route';
import { GET as getTempFeedback } from '../src/app/api/temp-test-feedback/route';
import { POST as adminPost } from '../src/app/api/admin/route';
import { GET as getAdminExams } from '../src/app/api/admin/exams/route';
import { GET as getAdminDigitalIds } from '../src/app/api/admin/digital-ids/route';
import { GET as getAdminDigitalBadges } from '../src/app/api/admin/digital-badges/route';
import { GET as getAdminEmailLogs } from '../src/app/api/admin/email/logs/route';
import { GET as getAdminFoundingMembers } from '../src/app/api/admin/founding-members/route';
import { GET as getAdminFoundingMemberPdf } from '../src/app/api/admin/founding-members/pdf/route';
import { GET as getFoundingMemberForm } from '../src/app/api/founding-members/form/route';
import { GET as getCareerResume } from '../src/app/api/admin/career-applications/[id]/resume/route';
import { siteConfig } from '../src/data/siteConfig';
import { checkRateLimit, resetRateLimitStore } from '../src/lib/rateLimit';

describe('Security Hardening & Protection Test Suite', () => {
  describe('1. Cryptographic Admin Token Verification & Secret Enforcement', () => {
    it('generates and validates signed admin session tokens', () => {
      const token = generateAdminToken('security_admin');
      assert.ok(token);
      assert.strictEqual(token.split('.').length, 3);

      const result = verifyAdminToken(token);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.username, 'security_admin');
    });

    it('rejects expired signed tokens', () => {
      const expiredPayload = Buffer.from(
        JSON.stringify({ sub: 'admin', role: 'admin', iat: Date.now() - 100000, exp: Date.now() - 1000, jti: 'test' })
      ).toString('base64url');
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const data = `${header}.${expiredPayload}`;
      
      const crypto = require('crypto');
      const secret = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'awssbg-admin-secure-signing-secret-key-2026';
      const sig = crypto.createHmac('sha256', secret).update(data).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const expiredToken = `${data}.${sig}`;

      const result = verifyAdminToken(expiredToken);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('expired'));
    });

    it('rejects tampered tokens where payload has been modified', () => {
      const validToken = generateAdminToken('admin');
      const [header, payload, signature] = validToken.split('.');

      // Tamper payload (e.g. changing username or expiry)
      const tamperedPayload = Buffer.from(
        JSON.stringify({ sub: 'hacker', role: 'admin', exp: Date.now() + 100000 })
      ).toString('base64url');

      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;
      const result = verifyAdminToken(tamperedToken);

      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('signature'));
    });

    it('rejects tampered tokens with forged signatures', () => {
      const validToken = generateAdminToken('admin');
      const [header, payload] = validToken.split('.');
      const fakeSig = 'fake_signature_that_does_not_match_hmac_sha256_hash_12345';
      const tamperedToken = `${header}.${payload}.${fakeSig}`;

      const result = verifyAdminToken(tamperedToken);
      assert.strictEqual(result.valid, false);
    });

    it('rejects empty, null, or malformed tokens', () => {
      assert.strictEqual(verifyAdminToken('').valid, false);
      assert.strictEqual(verifyAdminToken(null as any).valid, false);
      assert.strictEqual(verifyAdminToken('invalid.token').valid, false);
      assert.strictEqual(verifyAdminToken('random-garbage-string').valid, false);
    });

    it('extracts and authorizes valid admin tokens from Request headers and cookies', () => {
      const validToken = generateAdminToken('admin_tester');

      // Authorization header
      const reqWithHeader = new Request('http://localhost:3000/api/admin/exams', {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      assert.strictEqual(isAuthorizedAdmin(reqWithHeader), true);

      // Cookie header
      const reqWithCookie = new Request('http://localhost:3000/api/admin/exams', {
        headers: { Cookie: `admin_token=${encodeURIComponent(validToken)}` }
      });
      assert.strictEqual(isAuthorizedAdmin(reqWithCookie), true);

      // Unauthenticated request
      const unauthReq = new Request('http://localhost:3000/api/admin/exams');
      assert.strictEqual(isAuthorizedAdmin(unauthReq), false);
    });

    it('fails safely in production mode when ADMIN_SECRET_KEY is missing (no fallback secret)', () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origSecret = process.env.ADMIN_SECRET_KEY;
      const origJwt = process.env.ADMIN_JWT_SECRET;
      const origNextAuth = process.env.NEXTAUTH_SECRET;

      try {
        (process.env as any).NODE_ENV = 'production';
        delete process.env.ADMIN_SECRET_KEY;
        delete process.env.ADMIN_JWT_SECRET;
        delete process.env.NEXTAUTH_SECRET;

        // In production without secret, verifyAdminToken must safely return invalid
        const result = verifyAdminToken('some.dummy.token');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('ADMIN_SECRET_KEY'));
      } finally {
        (process.env as any).NODE_ENV = origNodeEnv;
        if (origSecret) process.env.ADMIN_SECRET_KEY = origSecret;
        if (origJwt) process.env.ADMIN_JWT_SECRET = origJwt;
        if (origNextAuth) process.env.NEXTAUTH_SECRET = origNextAuth;
      }
    });

    it('actively uses ADMIN_SECRET_KEY for cryptographic signing in production mode', () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origSecret = process.env.ADMIN_SECRET_KEY;
      const customSecret = 'custom-production-hmac-secret-test-key-64chars-long-security-audit';

      try {
        (process.env as any).NODE_ENV = 'production';
        process.env.ADMIN_SECRET_KEY = customSecret;

        // Generate token with customSecret
        const token = generateAdminToken('prod_admin');
        assert.strictEqual(verifyAdminToken(token).valid, true);

        // Token signed with wrong secret must fail
        const crypto = require('crypto');
        const [header, payload] = token.split('.');
        const wrongSig = crypto.createHmac('sha256', 'wrong-secret-key-12345').update(`${header}.${payload}`).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const wrongToken = `${header}.${payload}.${wrongSig}`;

        assert.strictEqual(verifyAdminToken(wrongToken).valid, false);
      } finally {
        (process.env as any).NODE_ENV = origNodeEnv;
        if (origSecret) process.env.ADMIN_SECRET_KEY = origSecret;
        else delete process.env.ADMIN_SECRET_KEY;
      }
    });
  });

  describe('2. Admin Authentication & Credential Security', () => {
    it('strictly rejects default insecure passwords (admin/admin, admin/admin123, admin/password)', async () => {
      const insecureAttempts = [
        { username: 'admin', password: 'admin' },
        { username: 'admin', password: 'admin123' },
        { username: 'admin', password: 'password' },
        { username: 'awsadmin@culko.in', password: 'password123' },
        { username: 'awsadmin@culko.in', password: 'admin' }
      ];

      for (const attempt of insecureAttempts) {
        const req = new Request('http://localhost:3000/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', ...attempt })
        });
        const res = await adminPost(req);
        assert.strictEqual(res.status, 401);
        const data = await res.json();
        assert.strictEqual(data.error, 'Invalid credentials.');
      }
    });

    it('authenticates successfully with configured environment ADMIN_PASSWORD', async () => {
      const origPass = process.env.ADMIN_PASSWORD;
      const testEnvPass = 'TempTestSecretPass!2026';

      try {
        process.env.ADMIN_PASSWORD = testEnvPass;

        const req = new Request('http://localhost:3000/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'login', username: 'admin', password: testEnvPass })
        });
        const res = await adminPost(req);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.ok(data.token);
      } finally {
        if (origPass) process.env.ADMIN_PASSWORD = origPass;
        else delete process.env.ADMIN_PASSWORD;
      }
    });
  });

  describe('3. Direct Admin URL Access & Middleware Route Guard', () => {
    it('redirects unauthenticated direct requests to /admin/digital-ids to /admin login', () => {
      const req = new NextRequest('http://localhost:3000/admin/digital-ids');
      const res = middleware(req);

      assert.strictEqual(res.status, 307);
      const location = res.headers.get('location') || '';
      assert.ok(location.includes('/admin?redirect='));
      assert.ok(location.includes('%2Fadmin%2Fdigital-ids') || location.includes('/admin/digital-ids'));
    });

    it('redirects unauthenticated direct requests to /admin/digital-badges to /admin login', () => {
      const req = new NextRequest('http://localhost:3000/admin/digital-badges');
      const res = middleware(req);

      assert.strictEqual(res.status, 307);
      const location = res.headers.get('location') || '';
      assert.ok(location.includes('/admin?redirect='));
    });

    it('redirects unauthenticated direct requests to /admin/exams to /admin login', () => {
      const req = new NextRequest('http://localhost:3000/admin/exams');
      const res = middleware(req);

      assert.strictEqual(res.status, 307);
      const location = res.headers.get('location') || '';
      assert.ok(location.includes('/admin?redirect='));
    });

    it('allows direct access to /admin sub-pages when valid admin cookie is present', () => {
      const token = generateAdminToken('verified_admin');
      const req = new NextRequest('http://localhost:3000/admin/digital-ids', {
        headers: { Cookie: `admin_token=${encodeURIComponent(token)}` }
      });
      const res = middleware(req);

      // NextResponse.next() returns a normal response without 307 redirect
      assert.notStrictEqual(res.status, 307);
    });
  });

  describe('4. Upload Security & SVG Sanitization', () => {
    it('strips <script> tags from SVG strings', () => {
      const maliciousSvg = '<svg><script>alert("XSS")</script><circle cx="50" cy="50" r="40"/></svg>';
      const sanitized = sanitizeSvg(maliciousSvg);

      assert.ok(!sanitized.includes('<script>'));
      assert.ok(!sanitized.includes('alert('));
      assert.ok(sanitized.includes('<circle'));
    });

    it('strips inline JavaScript event handlers from SVG elements', () => {
      const maliciousSvg = '<svg onload="alert(document.cookie)" onclick="fetch(\'/steal\')"><rect width="10" height="10"/></svg>';
      const sanitized = sanitizeSvg(maliciousSvg);

      assert.ok(!sanitized.toLowerCase().includes('onload'));
      assert.ok(!sanitized.toLowerCase().includes('onclick'));
      assert.ok(!sanitized.includes('alert('));
    });

    it('strips dangerous javascript: URLs from href and xlink:href attributes', () => {
      const maliciousSvg = '<svg><a href="javascript:alert(1)"><text>Click</text></a></svg>';
      const sanitized = sanitizeSvg(maliciousSvg);

      assert.ok(!sanitized.toLowerCase().includes('javascript:'));
    });

    it('correctly detects dangerous SVGs via isDangerousSvg', () => {
      assert.strictEqual(isDangerousSvg('<svg><script>alert(1)</script></svg>'), true);
      assert.strictEqual(isDangerousSvg('<svg onload="evil()"></svg>'), true);
      assert.strictEqual(isDangerousSvg('<svg><iframe src="evil.html"></iframe></svg>'), true);
      assert.strictEqual(isDangerousSvg('<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/></svg>'), false);
    });

    it('validates PDF magic-byte signatures', () => {
      const validPdf = Buffer.from('%PDF-1.7\nSample content');
      const invalidPdf = Buffer.from('<html><body>Not a PDF</body></html>');
      const emptyBuffer = Buffer.from('');

      assert.strictEqual(isValidPdfBuffer(validPdf), true);
      assert.strictEqual(isValidPdfBuffer(invalidPdf), false);
      assert.strictEqual(isValidPdfBuffer(emptyBuffer), false);
    });
  });

  describe('5. Sensitive Endpoint Protection, IDOR & Authorization', () => {
    it('blocks unauthenticated access to /api/env', async () => {
      const req = new Request('http://localhost:3000/api/env');
      const res = await getEnv(req);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.ok(data.error);
    });

    it('allows authenticated admin access to /api/env', async () => {
      const validToken = generateAdminToken('admin');
      const req = new Request('http://localhost:3000/api/env', {
        headers: { Authorization: `Bearer ${validToken}` }
      });
      const res = await getEnv(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'healthy');
      assert.ok(data.timestamp !== undefined);
    });

    it('blocks unauthenticated access to /api/temp-test-feedback', async () => {
      const req = new Request('http://localhost:3000/api/temp-test-feedback');
      const res = await getTempFeedback(req);
      assert.strictEqual(res.status, 401);
    });

    it('blocks unauthenticated access to /api/admin/exams', async () => {
      const req = new Request('http://localhost:3000/api/admin/exams');
      const res = await getAdminExams(req);
      assert.strictEqual(res.status, 401);
    });

    it('blocks unauthenticated access to /api/admin/digital-ids', async () => {
      const req = new Request('http://localhost:3000/api/admin/digital-ids');
      const res = await getAdminDigitalIds(req);
      assert.strictEqual(res.status, 401);
    });

    it('blocks unauthenticated access to /api/admin/digital-badges', async () => {
      const req = new Request('http://localhost:3000/api/admin/digital-badges');
      const res = await getAdminDigitalBadges(req);
      assert.strictEqual(res.status, 401);
    });

    it('blocks unauthenticated access to /api/admin/email/logs', async () => {
      const req = new Request('http://localhost:3000/api/admin/email/logs');
      const res = await getAdminEmailLogs(req);
      assert.strictEqual(res.status, 401);
    });

    it('blocks unauthenticated access to /api/admin/founding-members', async () => {
      const req = new Request('http://localhost:3000/api/admin/founding-members');
      const res = await getAdminFoundingMembers(req);
      assert.strictEqual(res.status, 401);
    });

    it('blocks unauthenticated access to /api/admin/founding-members/pdf', async () => {
      const req = new Request('http://localhost:3000/api/admin/founding-members/pdf?all=true');
      const res = await getAdminFoundingMemberPdf(req);
      assert.strictEqual(res.status, 401);
    });

    it('IDOR Prevention: blocks unauthenticated access to candidate resume attachments', async () => {
      const req = new Request('http://localhost:3000/api/admin/career-applications/candidate_victim_id/resume');
      const res = await getCareerResume(req, { params: Promise.resolve({ id: 'candidate_victim_id' }) });
      assert.strictEqual(res.status, 401);
    });
  });

  describe('6. PII Exposure, Secret Leakage & Harvesting Prevention', () => {
    it('does not expose member personal data on unauthenticated GET /api/founding-members/form with email parameter', async () => {
      const req = new Request('http://localhost:3000/api/founding-members/form?email=victim@example.com');
      const res = await getFoundingMemberForm(req);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      // Ensure that no member record or PII is returned
      assert.strictEqual((data as any).member, undefined);
      assert.strictEqual(data.existingMember, null);
      assert.ok(data.config !== undefined);
    });

    it('verifies siteConfig and client bundles contain no private passwords or DB salts', () => {
      const configStr = JSON.stringify(siteConfig);
      assert.ok(!configStr.includes('passwordHash'));
      assert.ok(!configStr.includes('salt'));
      assert.ok(!configStr.includes('postgres://'));
      assert.ok(!configStr.includes('ADMIN_SECRET_KEY'));
    });
  });

  describe('7. Edge Rate Limiting & Protection Rules', () => {
    it('allows requests within the configured threshold and decrements remaining quota', () => {
      resetRateLimitStore();
      const res1 = checkRateLimit('test_user_1', { maxRequests: 3, windowMs: 10000 });
      assert.strictEqual(res1.allowed, true);
      assert.strictEqual(res1.remaining, 2);

      const res2 = checkRateLimit('test_user_1', { maxRequests: 3, windowMs: 10000 });
      assert.strictEqual(res2.allowed, true);
      assert.strictEqual(res2.remaining, 1);
    });

    it('blocks requests when threshold is exceeded with retryAfter', () => {
      resetRateLimitStore();
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test_brute_ip', { maxRequests: 5, windowMs: 60000 });
      }

      const blockedRes = checkRateLimit('test_brute_ip', { maxRequests: 5, windowMs: 60000 });
      assert.strictEqual(blockedRes.allowed, false);
      assert.strictEqual(blockedRes.remaining, 0);
      assert.ok(blockedRes.retryAfter! > 0);
    });

    it('enforces temporary block duration when configured', () => {
      resetRateLimitStore();
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test_block_ip', { maxRequests: 5, windowMs: 60000, blockDurationMs: 900000 });
      }

      const blockTrigger = checkRateLimit('test_block_ip', { maxRequests: 5, windowMs: 60000, blockDurationMs: 900000 });
      assert.strictEqual(blockTrigger.allowed, false);
      assert.ok(blockTrigger.retryAfter! > 60); // Blocked for 15m
    });

    it('middleware rate limits Admin Login POST /api/admin after 5 requests', () => {
      resetRateLimitStore();
      const ip = '10.0.0.1';
      for (let i = 0; i < 5; i++) {
        const req = new NextRequest('http://localhost:3000/api/admin', {
          method: 'POST',
          headers: { 'x-forwarded-for': ip },
        });
        const res = middleware(req);
        assert.notStrictEqual(res.status, 429);
      }

      // 6th request must trigger HTTP 429
      const req6 = new NextRequest('http://localhost:3000/api/admin', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
      });
      const res6 = middleware(req6);
      assert.strictEqual(res6.status, 429);
      assert.strictEqual(res6.headers.get('Retry-After') !== null, true);
    });

    it('middleware rate limits Exam/Quiz auth POST /api/exam/auth after 10 requests', () => {
      resetRateLimitStore();
      const ip = '10.0.0.2';
      for (let i = 0; i < 10; i++) {
        const req = new NextRequest('http://localhost:3000/api/exam/auth', {
          method: 'POST',
          headers: { 'x-forwarded-for': ip },
        });
        const res = middleware(req);
        assert.notStrictEqual(res.status, 429);
      }

      const req11 = new NextRequest('http://localhost:3000/api/exam/auth', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
      });
      const res11 = middleware(req11);
      assert.strictEqual(res11.status, 429);
    });

    it('middleware rate limits Public Verification /api/digital-ids/verify/* after 30 requests', () => {
      resetRateLimitStore();
      const ip = '10.0.0.3';
      for (let i = 0; i < 30; i++) {
        const req = new NextRequest('http://localhost:3000/api/digital-ids/verify/CU-2026-001', {
          headers: { 'x-forwarded-for': ip },
        });
        const res = middleware(req);
        assert.notStrictEqual(res.status, 429);
      }

      const req31 = new NextRequest('http://localhost:3000/api/digital-ids/verify/CU-2026-001', {
        headers: { 'x-forwarded-for': ip },
      });
      const res31 = middleware(req31);
      assert.strictEqual(res31.status, 429);
    });
  });
});
