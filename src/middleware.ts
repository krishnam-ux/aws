import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

function isEdgeTokenValid(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') return false;
  const clean = token.trim();
  if (clean.length < 10) return false;

  const parts = clean.split('.');
  if (parts.length === 3) {
    try {
      let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const json = atob(b64);
      const payload = JSON.parse(json);
      if (payload.exp && Date.now() > payload.exp) return false;
      if (payload.role !== 'admin') return false;
      if (!parts[2] || parts[2].length < 10) return false;
      return true;
    } catch {
      return false;
    }
  }

  if (clean.startsWith('adm_') || clean.includes('session') || clean.startsWith('admin_')) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();
  const ip = getClientIp(request);

  // =========================================================================
  // 1. Edge-Layer Rate Limiting Rules
  // =========================================================================

  // A. Admin Login: POST /api/admin (5 requests/minute/IP with 15m block)
  if (pathname === '/api/admin' && method === 'POST') {
    const rl = checkRateLimit(`admin_login:${ip}`, {
      maxRequests: 5,
      windowMs: 60 * 1000,
      blockDurationMs: 15 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Too many admin login attempts. Please wait before retrying.',
          retryAfter: rl.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfter || 60),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.resetAt),
          },
        }
      );
    }
  }

  // B. Admin APIs: /api/admin/* (60 requests/minute/IP)
  else if (pathname.startsWith('/api/admin/')) {
    const rl = checkRateLimit(`admin_api:${ip}`, {
      maxRequests: 60,
      windowMs: 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded on admin API endpoints. Please slow down.',
          retryAfter: rl.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfter || 60),
            'X-RateLimit-Limit': '60',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.resetAt),
          },
        }
      );
    }
  }

  // C. Exam + Quiz Authentication: POST /api/exam/auth, POST /api/quiz/auth (10 requests/minute/IP)
  else if (
    (pathname === '/api/exam/auth' || pathname === '/api/quiz/auth') &&
    method === 'POST'
  ) {
    const rl = checkRateLimit(`exam_quiz_auth:${ip}`, {
      maxRequests: 10,
      windowMs: 60 * 1000,
      blockDurationMs: 5 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Too many candidate authentication attempts. Please wait.',
          retryAfter: rl.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfter || 60),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.resetAt),
          },
        }
      );
    }
  }

  // D. Public Forms: POST /api/event-register, POST /api/founding-members/form, POST /api/career-applications (15 requests/minute/IP)
  else if (
    (pathname === '/api/event-register' ||
      pathname === '/api/founding-members/form' ||
      pathname === '/api/career-applications') &&
    method === 'POST'
  ) {
    const rl = checkRateLimit(`public_forms:${ip}`, {
      maxRequests: 15,
      windowMs: 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Submission rate limit exceeded. Please wait a moment before trying again.',
          retryAfter: rl.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfter || 60),
            'X-RateLimit-Limit': '15',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.resetAt),
          },
        }
      );
    }
  }

  // E. Public Verification: /api/digital-ids/verify/*, /api/digital-badges/verify/*, /api/verify-certificate/* (30 requests/minute/IP)
  else if (
    pathname.startsWith('/api/digital-ids/verify/') ||
    pathname.startsWith('/api/digital-badges/verify/') ||
    pathname.startsWith('/api/verify-certificate/')
  ) {
    const rl = checkRateLimit(`public_verify:${ip}`, {
      maxRequests: 30,
      windowMs: 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Verification lookup rate limit reached. Please wait a moment.',
          retryAfter: rl.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rl.retryAfter || 60),
            'X-RateLimit-Limit': '30',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rl.resetAt),
          },
        }
      );
    }
  }

  // =========================================================================
  // 2. Direct URL Route Protection for /admin sub-pages
  // =========================================================================
  if (pathname.startsWith('/admin/') && pathname !== '/admin') {
    const token =
      request.cookies.get('admin_token')?.value ||
      request.cookies.get('adminToken')?.value;

    if (!isEdgeTokenValid(token)) {
      const loginUrl = new URL('/admin', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // =========================================================================
  // 3. Attach standard security headers to all responses
  // =========================================================================
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static assets (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)',
  ],
};
