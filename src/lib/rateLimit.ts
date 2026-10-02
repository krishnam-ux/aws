/**
 * Edge-compatible In-Memory Sliding Window Rate Limiter
 * Provides immediate application-layer and edge-middleware DDoS / brute-force mitigation.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

interface ClientRecord {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

// In-memory store for edge/server instances
const store = new Map<string, ClientRecord>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS && store.size < 2000) return;
  lastCleanup = now;

  for (const [key, record] of store.entries()) {
    if (record.blockedUntil && record.blockedUntil > now) continue;
    if (record.resetAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * Checks and increments rate limit for a specific key (e.g. `admin_login:192.168.1.1`).
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanupExpired();
  const now = Date.now();
  const record = store.get(key);

  // If client is in temporary block status
  if (record && record.blockedUntil && record.blockedUntil > now) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.blockedUntil,
      retryAfter: Math.max(1, retryAfter),
    };
  }

  // If no record or current window has expired, create a fresh window
  if (!record || record.resetAt <= now) {
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - 1),
      resetAt,
    };
  }

  // Increment request count within active window
  record.count += 1;

  if (record.count > config.maxRequests) {
    if (config.blockDurationMs && !record.blockedUntil) {
      record.blockedUntil = now + config.blockDurationMs;
      const retryAfter = Math.ceil(config.blockDurationMs / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.blockedUntil,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
      retryAfter: Math.max(1, retryAfter),
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, config.maxRequests - record.count),
    resetAt: record.resetAt,
  };
}

/**
 * Extract client IP from request headers safely.
 */
export function getClientIp(req: Request | { headers: { get(name: string): string | null } }): string {
  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const first = xForwardedFor.split(',')[0].trim();
    if (first) return first;
  }
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  return '127.0.0.1';
}

/**
 * Reset store (primarily for unit testing)
 */
export function resetRateLimitStore(): void {
  store.clear();
}
