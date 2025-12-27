/**
 * Simple in-memory rate limiter for API routes
 * For production with multiple servers, use Redis-based solution like @upstash/ratelimit
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  });
}, 60000); // Clean every minute

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result with success status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  let entry = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    return {
      success: true,
      remaining: config.limit - 1,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  // Check if over limit
  if (entry.count > config.limit) {
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limit configurations for different routes
 */
export const RATE_LIMITS = {
  // Download: 100 requests per minute per user
  download: { limit: 100, windowMs: 60 * 1000 },
  // Auth: 10 requests per minute per IP
  auth: { limit: 10, windowMs: 60 * 1000 },
  // Likes: 60 requests per minute per user
  likes: { limit: 60, windowMs: 60 * 1000 },
  // Webhooks: 100 requests per minute (from Stripe)
  webhooks: { limit: 100, windowMs: 60 * 1000 },
} as const;
