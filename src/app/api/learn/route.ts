import { NextResponse } from "next/server";
import { runTutor } from "@/lib/harness";
import {
  MAX_TOPIC_LENGTH,
  cleanTopic,
  clientIp,
  isValidLearnerId,
  rateLimit,
  serverError,
  tooManyRequests,
} from "@/lib/requestGuards";

// The tutor agent makes several model calls; give it up to 5 minutes.
export const maxDuration = 300;

// Each new module costs several model calls, so keep this tight (resuming an
// unfinished module is free but goes through the same route).
const LIMIT_PER_IP = 12;
const LIMIT_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const limit = rateLimit(`learn:${clientIp(request)}`, LIMIT_PER_IP, LIMIT_WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON" }, { status: 400 });
  }
  const { topic: rawTopic, learnerId } = (body ?? {}) as Record<string, unknown>;

  const topic = cleanTopic(rawTopic);
  if (!topic) {
    return NextResponse.json(
      { error: `Topic is required (max ${MAX_TOPIC_LENGTH} characters)` },
      { status: 400 }
    );
  }
  if (!isValidLearnerId(learnerId)) {
    return NextResponse.json({ error: "Invalid learnerId" }, { status: 400 });
  }

  try {
    const result = await runTutor(topic, learnerId);
    return NextResponse.json(result);
  } catch (error) {
    return serverError(error, "Failed to generate lesson. Please try again.");
  }
}
