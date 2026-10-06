import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn("Supabase env vars missing. DB calls will fail.");
}

export const supabase = createClient(url ?? "", key ?? "");

// ---------- Learner history ----------
export async function getLearnerHistory(learnerId: string) {
  const { data, error } = await supabase
    .from("progress")
    .select("topic, status, updated_at")
    .eq("learner_id", learnerId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getLearnerHistory error:", error);
    return [];
  }
  return data ?? [];
}

// ---------- Save lesson ----------
export async function saveLesson(
  learnerId: string,
  topic: string,
  lesson: unknown,
  score: number
) {
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      learner_id: learnerId,
      topic,
      lesson_data: lesson,
      score,
    })
    .select("id")
    .single();

  if (error) {
    console.error("saveLesson error:", error);
    return null;
  }
  return data.id as number;
}

// ---------- Upsert progress ----------
export async function upsertProgress(
  learnerId: string,
  topic: string,
  status: "started" | "completed",
  lessonId?: number
) {
  const { error } = await supabase.from("progress").upsert(
    {
      learner_id: learnerId,
      topic,
      status,
      last_lesson_id: lessonId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "learner_id,topic" }
  );

  if (error) {
    console.error("upsertProgress error:", error);
    return false;
  }
  return true;
}

// ---------- List lessons for a learner ----------
// Newest first, capped so a long history can't produce a huge response.
const LIBRARY_LIMIT = 50;

export async function getLearnerLessons(learnerId: string) {
  const { data, error } = await supabase
    .from("lessons")
    .select("id, topic, score, created_at, lesson_data")
    .eq("learner_id", learnerId)
    .order("created_at", { ascending: false })
    .limit(LIBRARY_LIMIT);

  if (error) {
    console.error("getLearnerLessons error:", error);
    return [];
  }
  return data ?? [];
}