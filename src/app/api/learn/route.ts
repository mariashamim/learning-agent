import { NextResponse } from "next/server";
import { runLearningHarness } from "@/lib/harness";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const topic = body.topic;
    const learnerId = body.learnerId || "demo-user";

    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const result = await runLearningHarness(topic, learnerId);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate lesson", details: message },
      { status: 500 }
    );
  }
}