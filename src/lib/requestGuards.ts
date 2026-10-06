import { NextResponse } from "next/server";

// ---------- Input validation ----------

export const MAX_TOPIC_LENGTH = 120;

// Learner IDs are minted in the browser: "learner-" plus a random UUID (older
// IDs used a shorter base-36 suffix). Anything else is rejected.
const LEARNER_ID = /^learner-[a-z0-9-]{4,64}$/;

export function isValidLearnerId(value: unknown): value is string {
  return typeof value === "string" && LEARNER_ID.test(value);
}

/** Trims and collapses whitespace; returns null if empty or too long. */
export function cleanTopic(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const topic = value.trim().replace(/\s+/g, " ");
  if (!topic || topic.length > MAX_TOPIC_LENGTH) return null;
  return topic;
}

// ---------- Rate limiting ----------

// Fixed-window, in-memory limiter. On serverless hosts each instance keeps its
// own counts, so this is a best-effort brake, not a hard guarantee; pair it
// with a platform rule (e.g. Vercel Firewall rate limiting) in production.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  bucket.count++;
  return {
    ok: bucket.count <= limit,
    retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function tooManyRequests(retryAfterSec: number) {
  return NextResponse.json(
    { error: "Too many requests. Please wait a few minutes and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}

/** Logs the real error server-side; only shows details outside production. */
export function serverError(error: unknown, publicMessage: string) {
  console.error(error);
  const details =
    process.env.NODE_ENV === "production"
      ? undefined
      : error instanceof Error
        ? error.message
        : String(error);
  return NextResponse.json({ error: publicMessage, details }, { status: 500 });
}
