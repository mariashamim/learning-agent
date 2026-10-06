import { NextResponse } from "next/server";
import { getLearnerLessons } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const learnerId = searchParams.get("learnerId");

    if (!learnerId) {
      return NextResponse.json({ error: "learnerId required" }, { status: 400 });
    }

    const lessons = await getLearnerLessons(learnerId);
    return NextResponse.json({ lessons });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}