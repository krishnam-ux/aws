import { describe, it } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { middleware } from '../src/middleware';
import { generateAdminToken } from '../src/lib/adminAuth';
import { resetRateLimitStore } from '../src/lib/rateLimit';

describe('Event Status & Registration Status Rate Limiting and In-Flight Protection', () => {
  it('allows authenticated admin event status updates (30 rapid requests) without HTTP 429', () => {
    resetRateLimitStore();
    const ip = '10.200.1.1';
    const validToken = generateAdminToken('admin');

    const statuses = ['Draft', 'Planned', 'Upcoming', 'Ongoing', 'Completed'];

    for (let i = 0; i < 30; i++) {
      const status = statuses[i % statuses.length];
      const req = new NextRequest('http://localhost:3000/api/admin', {
        method: 'POST',
        headers: {
          'x-forwarded-for': ip,
          'authorization': `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-event',
          event: {
            id: 'event-01',
            status: status,
          },
        }),
      });

      const res = middleware(req);
      assert.notStrictEqual(
        res.status,
        429,
        `Request ${i + 1} (event status update to ${status}) unexpectedly throttled with 429`
      );
    }
  });

  it('allows authenticated admin registration status updates (30 rapid requests) without HTTP 429', () => {
    resetRateLimitStore();
    const ip = '10.200.1.2';
    const validToken = generateAdminToken('admin');

    const regStatuses = ['Not Open', 'Open', 'Closed', 'Full'];

    for (let i = 0; i < 30; i++) {
      const regStatus = regStatuses[i % regStatuses.length];
      const req = new NextRequest('http://localhost:3000/api/admin', {
        method: 'POST',
        headers: {
          'x-forwarded-for': ip,
          'authorization': `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-event',
          event: {
            id: 'event-01',
            registrationStatus: regStatus,
          },
        }),
      });

      const res = middleware(req);
      assert.notStrictEqual(
        res.status,
        429,
        `Request ${i + 1} (registration status update to ${regStatus}) unexpectedly throttled with 429`
      );
    }
  });

  it('strictly preserves brute-force rate limiting on unauthenticated admin login (blocks on 6th request)', () => {
    resetRateLimitStore();
    const ip = '10.200.1.3';

    for (let i = 0; i < 5; i++) {
      const req = new NextRequest('http://localhost:3000/api/admin', {
        method: 'POST',
        headers: {
          'x-forwarded-for': ip,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'login',
          username: 'admin',
          password: 'wrong-password',
        }),
      });

      const res = middleware(req);
      assert.notStrictEqual(res.status, 429, `Unauthenticated attempt ${i + 1} should be within quota`);
    }

    // 6th attempt MUST be blocked with HTTP 429
    const req6 = new NextRequest('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: {
        'x-forwarded-for': ip,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'login',
        username: 'admin',
        password: 'wrong-password',
      }),
    });

    const res6 = middleware(req6);
    assert.strictEqual(res6.status, 429, '6th unauthenticated request must be blocked with HTTP 429');
    assert.ok(res6.headers.get('Retry-After'), 'Response must include Retry-After header');
  });

  it('strictly protects against tampered tokens on POST /api/admin by denying authenticated bucket', () => {
    resetRateLimitStore();
    const ip = '10.200.1.4';
    const validToken = generateAdminToken('admin');
    const [header, payload] = validToken.split('.');
    const tamperedToken = `${header}.${payload}.forged_tampered_signature_999`;

    for (let i = 0; i < 5; i++) {
      const req = new NextRequest('http://localhost:3000/api/admin', {
        method: 'POST',
        headers: {
          'x-forwarded-for': ip,
          'authorization': `Bearer ${tamperedToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-event',
          event: { id: 'event-01', status: 'Completed' },
        }),
      });

      const res = middleware(req);
      assert.notStrictEqual(res.status, 429);
    }

    // 6th request with tampered token MUST be blocked with HTTP 429
    const req6 = new NextRequest('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: {
        'x-forwarded-for': ip,
        'authorization': `Bearer ${tamperedToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update-event',
        event: { id: 'event-01', status: 'Completed' },
      }),
    });

    const res6 = middleware(req6);
    assert.strictEqual(res6.status, 429, 'Tampered token requests must be throttled under unauthenticated bucket');
  });

  it('authenticated rate limit returns proper headers and limits up to 300 req/min', () => {
    resetRateLimitStore();
    const ip = '10.200.1.5';
    const validToken = generateAdminToken('admin');

    const req = new NextRequest('http://localhost:3000/api/admin', {
      method: 'POST',
      headers: {
        'x-forwarded-for': ip,
        'authorization': `Bearer ${validToken}`,
      },
    });

    const res = middleware(req);
    assert.notStrictEqual(res.status, 429);
    assert.strictEqual(res.status, 200);
  });
});
