type Bucket = {
  minute: { count: number; reset: number };
  day: { count: number; reset: number };
};

const store = new Map<string, Bucket>();

function now() {
  return Date.now();
}

export type RateLimitResult =
  | { ok: true; remainingMinute: number; remainingDay: number }
  | { ok: false; reason: "minute" | "day"; retryAfterSec: number };

export function checkRateLimit(
  key: string,
  perMinute: number,
  perDay: number,
): RateLimitResult {
  const t = now();
  let bucket = store.get(key);
  if (!bucket) {
    bucket = {
      minute: { count: 0, reset: t + 60_000 },
      day: { count: 0, reset: t + 86_400_000 },
    };
    store.set(key, bucket);
  }

  if (t > bucket.minute.reset) {
    bucket.minute = { count: 0, reset: t + 60_000 };
  }
  if (t > bucket.day.reset) {
    bucket.day = { count: 0, reset: t + 86_400_000 };
  }

  if (bucket.minute.count >= perMinute) {
    return {
      ok: false,
      reason: "minute",
      retryAfterSec: Math.max(1, Math.ceil((bucket.minute.reset - t) / 1000)),
    };
  }
  if (bucket.day.count >= perDay) {
    return {
      ok: false,
      reason: "day",
      retryAfterSec: Math.max(1, Math.ceil((bucket.day.reset - t) / 1000)),
    };
  }

  bucket.minute.count += 1;
  bucket.day.count += 1;

  return {
    ok: true,
    remainingMinute: perMinute - bucket.minute.count,
    remainingDay: perDay - bucket.day.count,
  };
}

export function clientKeyFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "local";
  return ip;
}
