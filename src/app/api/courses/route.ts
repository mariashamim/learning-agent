import { NextResponse } from "next/server";
import { toCourseView } from "@/lib/courseView";
import { listCourses } from "@/lib/db";
import {
  clientIp,
  isValidLearnerId,
  rateLimit,
  serverError,
  tooManyRequests,
} from "@/lib/requestGuards";

const LIMIT_PER_IP = 60;
const LIMIT_WINDOW_MS = 60 * 1000;

/** The learner's courses, most recently active first. */
export async function GET(request: Request) {
  const limit = rateLimit(`courses:${clientIp(request)}`, LIMIT_PER_IP, LIMIT_WINDOW_MS);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSec);

  const learnerId = new URL(request.url).searchParams.get("learnerId");
  if (!isValidLearnerId(learnerId)) {
    return NextResponse.json({ error: "Valid learnerId required" }, { status: 400 });
  }

  try {
    const courses = await listCourses(learnerId);
    return NextResponse.json({ courses: courses.map(toCourseView) });
  } catch (error) {
    return serverError(error, "Failed to load courses.");
  }
}
