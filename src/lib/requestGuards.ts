import { NextResponse } from "next/server";
import { ConfigError } from "./env";
import { ModelHttpError } from "./model";

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

/**
 * A short, safe description of what failed, shown even in production. It names
 * the failing part (config, AI provider, database) without leaking internals,
 * so a deployment problem can be diagnosed from the page itself.
 */
export function errorHint(error: unknown): string | undefined {
  if (error instanceof ConfigError) return `Server setup is incomplete: ${error.message}.`;
  if (error instanceof ModelHttpError) {
    if (error.status === 401 || error.status === 403)
      return "The AI provider rejected the API key (check OPENROUTER_API_KEY).";
    if (error.status === 402) return "The AI provider account has run out of credits.";
    if (error.status === 400 || error.status === 404)
      return "The AI provider refused the request (check OPENROUTER_MODEL).";
    return "The AI provider is busy or down. Try again in a minute.";
  }
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (/TimeoutError|Out of time/.test(message)) return "The AI model took too long. Try again.";
  if (/valid lesson/.test(message)) return "The AI model returned an unusable lesson twice. Try again.";
  if (/without writing a module/.test(message)) return "The tutor didn't finish the module. Try again.";
  if (/^Error: (get|list|create|update|insert|mark)\w*:/.test(message)) {
    if (/schema cache|does not exist|column/i.test(message))
      return "A database table or column is missing (run the Supabase migration).";
    if (/fetch failed|ENOTFOUND|Invalid URL|getaddrinfo/i.test(message))
      return "Couldn't reach the database (check SUPABASE_URL).";
    if (/JWT|api ?key|401|unauthori[sz]ed/i.test(message))
      return "The database rejected the key (check SUPABASE_ANON_KEY).";
    if (/row-level security|permission denied/i.test(message))
      return "A database security policy blocked the request (check RLS policies).";
    return "The database request failed.";
  }
  return undefined;
}

/** Logs the real error server-side; returns a safe hint, plus full details outside production. */
export function serverError(error: unknown, publicMessage: string) {
  console.error(error);
  const details =
    process.env.NODE_ENV === "production"
      ? undefined
      : error instanceof Error
        ? error.message
        : String(error);
  return NextResponse.json(
    { error: publicMessage, hint: errorHint(error), details },
    { status: 500 }
  );
}
