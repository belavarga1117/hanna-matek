export function createRateLimiter({ limit, windowMs }) {
  const buckets = new Map();
  let calls = 0;
  return function consume(key, now = Date.now()) {
    calls += 1;
    if (calls % 500 === 0) {
      for (const [bucketKey, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfter: 0 };
    }
    current.count += 1;
    if (current.count <= limit) return { allowed: true, retryAfter: 0 };
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  };
}
