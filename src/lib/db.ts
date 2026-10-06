import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";
import type { Lesson } from "./lessonWriter";

// Created on first use, not at import: `next build` loads route modules, and
// the build must not need (or crash without) runtime secrets.
let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (client) return client;
  client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"));
  return client;
}

// ---------- Types ----------

export type ModulePlan = { title: string; goal: string };

export type CourseRow = {
  id: number;
  learner_id: string;
  topic: string;
  topic_key: string;
  title: string;
  description: string;
  modules: ModulePlan[];
  current_module: number;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
};

export type LessonRow = {
  id: number;
  course_id: number | null;
  module_index: number | null;
  topic: string;
  score: number | null;
  created_at: string;
  completed_at: string | null;
  lesson_data: Lesson;
};

export type CourseWithLessons = CourseRow & { lessons: LessonRow[] };

export type AttemptRow = { question_index: number; chosen: string; correct: boolean };

const LESSON_COLUMNS = "id, course_id, module_index, topic, score, created_at, completed_at, lesson_data";
const COURSE_WITH_LESSONS = `*, lessons(${LESSON_COLUMNS})`;

// ---------- Health check ----------
/** Reads one row's worth of the columns the app needs from each table. */
export async function checkTables() {
  const checks: [string, string][] = [
    ["courses", "id, topic_key, modules, current_module, status"],
    ["lessons", "id, course_id, module_index, completed_at"],
    ["attempts", "id, lesson_id, correct"],
    ["progress", "id, topic, status"],
  ];
  const results: Record<string, string> = {};
  for (const [table, columns] of checks) {
    const { error } = await supabase().from(table).select(columns).limit(1);
    results[table] = error ? `error: ${error.message}` : "ok";
  }
  return results;
}

// ---------- Learner history ----------
export async function getLearnerHistory(learnerId: string) {
  const { data, error } = await supabase()
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

// ---------- Courses ----------
export async function getCourse(learnerId: string, topicKey: string) {
  const { data, error } = await supabase()
    .from("courses")
    .select(COURSE_WITH_LESSONS)
    .eq("learner_id", learnerId)
    .eq("topic_key", topicKey)
    .maybeSingle();
  if (error) throw new Error(`getCourse: ${error.message}`);
  return data as CourseWithLessons | null;
}

export async function getCourseById(courseId: number, learnerId: string) {
  const { data, error } = await supabase()
    .from("courses")
    .select(COURSE_WITH_LESSONS)
    .eq("id", courseId)
    .eq("learner_id", learnerId)
    .maybeSingle();
  if (error) throw new Error(`getCourseById: ${error.message}`);
  return data as CourseWithLessons | null;
}

// Most recently active first, capped so the response stays small.
const COURSE_LIMIT = 20;

export async function listCourses(learnerId: string) {
  const { data, error } = await supabase()
    .from("courses")
    .select(COURSE_WITH_LESSONS)
    .eq("learner_id", learnerId)
    .order("updated_at", { ascending: false })
    .limit(COURSE_LIMIT);
  if (error) throw new Error(`listCourses: ${error.message}`);
  return (data ?? []) as CourseWithLessons[];
}

export async function createCourse(course: {
  learnerId: string;
  topic: string;
  topicKey: string;
  title: string;
  description: string;
  modules: ModulePlan[];
}) {
  const { data, error } = await supabase()
    .from("courses")
    .insert({
      learner_id: course.learnerId,
      topic: course.topic,
      topic_key: course.topicKey,
      title: course.title,
      description: course.description,
      modules: course.modules,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createCourse: ${error.message}`);
  return data as CourseRow;
}

export async function updateCourse(
  id: number,
  patch: Partial<Pick<CourseRow, "current_module" | "status">>
) {
  const { error } = await supabase()
    .from("courses")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`updateCourse: ${error.message}`);
}

/** Every course lesson with its recorded quiz answers. */
export async function getCourseAttempts(courseId: number) {
  const { data, error } = await supabase()
    .from("lessons")
    .select("id, module_index, lesson_data, attempts(question_index, chosen, correct)")
    .eq("course_id", courseId)
    .order("module_index", { ascending: true });
  if (error) throw new Error(`getCourseAttempts: ${error.message}`);
  return (data ?? []) as {
    id: number;
    module_index: number | null;
    lesson_data: Lesson;
    attempts: AttemptRow[];
  }[];
}

// ---------- Lessons ----------
export async function saveLesson(
  learnerId: string,
  topic: string,
  lesson: unknown,
  score: number,
  placement?: { courseId: number; moduleIndex: number }
) {
  const { data, error } = await supabase()
    .from("lessons")
    .insert({
      learner_id: learnerId,
      topic,
      lesson_data: lesson,
      score,
      course_id: placement?.courseId ?? null,
      module_index: placement?.moduleIndex ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("saveLesson error:", error);
    return null;
  }
  return data.id as number;
}

export async function getLessonForLearner(lessonId: number, learnerId: string) {
  const { data, error } = await supabase()
    .from("lessons")
    .select(LESSON_COLUMNS)
    .eq("id", lessonId)
    .eq("learner_id", learnerId)
    .maybeSingle();
  if (error) throw new Error(`getLessonForLearner: ${error.message}`);
  return data as LessonRow | null;
}

/** Marks a lesson complete. Returns false if it was already complete. */
export async function markLessonCompleted(lessonId: number) {
  const { data, error } = await supabase()
    .from("lessons")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", lessonId)
    .is("completed_at", null)
    .select("id");
  if (error) throw new Error(`markLessonCompleted: ${error.message}`);
  return (data ?? []).length > 0;
}

export async function insertAttempts(
  learnerId: string,
  lessonId: number,
  attempts: AttemptRow[]
) {
  const { error } = await supabase()
    .from("attempts")
    .insert(attempts.map((a) => ({ ...a, learner_id: learnerId, lesson_id: lessonId })));
  if (error) throw new Error(`insertAttempts: ${error.message}`);
}

// ---------- Upsert progress ----------
export async function upsertProgress(
  learnerId: string,
  topic: string,
  status: "started" | "completed",
  lessonId?: number
) {
  const { error } = await supabase().from("progress").upsert(
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

// ---------- Standalone lessons (made before courses existed) ----------
// Newest first, capped so a long history can't produce a huge response.
const LIBRARY_LIMIT = 50;

export async function getLearnerLessons(learnerId: string) {
  const { data, error } = await supabase()
    .from("lessons")
    .select("id, topic, score, created_at, lesson_data")
    .eq("learner_id", learnerId)
    .is("course_id", null)
    .order("created_at", { ascending: false })
    .limit(LIBRARY_LIMIT);

  if (error) {
    console.error("getLearnerLessons error:", error);
    return [];
  }
  return data ?? [];
}
