# Learning Agent — Harness Engineering Project

## What this is

A stateful tutor, in the spirit of Brilliant. A learner names any topic; a
tutor agent plans a short course (3-6 modules of 5-10 minutes), writes one
module at a time through a quality gate, and records quiz results. When the
learner comes back, the course resumes where they left off, and the agent
adapts the next module to what they got wrong.

See [HARNESS.md](HARNESS.md) for the design rationale and research notes.

## Architecture

    Browser (page.tsx)
       │
       │ POST /api/learn  { topic, learnerId }
       ▼
    Tutor harness (lib/harness.ts → runTutor)
       │
       ├─ load_course   → Supabase: courses (+ lessons)
       ├─ fast paths    → course finished: overview; module unfinished: resume
       │                  (no model call)
       └─ agent loop    → OpenRouter tool calling, max 6 turns
            ├─ create_course     → Supabase: courses
            ├─ get_quiz_mistakes → Supabase: attempts
            └─ write_module      → quality gate (lib/lessonWriter.ts)
                 ├─ generate → evaluate → [revise → evaluate]
                 ├─ select best *evaluated* version
                 ├─ save_lesson   → Supabase: lessons (course_id, module_index)
                 └─ save_progress → Supabase: progress
       │
       ▼
    Lesson + course + tutor note + trace returned to browser

    POST /api/attempts { learnerId, lessonId, answers }
       └─ grade on server → attempts → mark lesson done → advance course

## Key concepts

**The model is not the agent. The harness is.** The harness is the loop,
state, tools, constraints, and evaluation around the model.

**Agent outside, workflow inside.** The tutor is an agent: it decides whether
to plan a course, whether to look at quiz mistakes, and what the next module
should focus on. Lesson writing is a fixed workflow the agent can't skip.

**Rules in code, not prompts.** Tool calls are validated with zod. The
harness enforces one course per topic, exactly one module per run, and that
only the current module is written. Tool misuse is returned to the model as an
error it can correct; infrastructure failures end the run.

**Structured output.** Every lesson and evaluation uses a JSON schema and is
validated with zod.

**Evaluation loop.** A separate model call scores each lesson; below 8 it is
revised and re-scored. Only evaluated versions can be shown: the
highest-scoring one, with its real score and a `passed` flag. A revision that
fails or can't be evaluated is discarded.

**Valid quiz.** Every lesson has 2-4 questions with exactly 4 options and a
`correctAnswer` that matches an option. Invalid output is retried once.

**Bounded iteration.** Max 6 agent turns, at most one revision per lesson, one
retry for malformed output, one retry for transient call failures, 60s per
model call, no revision after 120s, no agent turn after 200s, and a hard 280s
deadline for every call (300s route limit).

**Server-side grading.** The browser sends chosen options; the server grades
against the stored lesson. Only a module's first completion counts.

**Persistence.** Courses, lessons, attempts and progress live in Supabase.
Each run rebuilds the agent's context from there.

## Files

- `src/lib/harness.ts` — tutor agent loop, tools, fast paths
- `src/lib/lessonWriter.ts` — quality gate: generate / evaluate / revise
- `src/lib/model.ts` — OpenRouter client (structured output, tool calling)
- `src/lib/progress.ts` — quiz grading and course progression
- `src/lib/courseView.ts` — client-facing course shape
- `src/lib/db.ts` — Supabase access
- `src/lib/requestGuards.ts` — input validation, rate limiting, error responses
- `src/app/api/learn/route.ts` — runs the tutor
- `src/app/api/attempts/route.ts` — records a finished quiz
- `src/app/api/courses/route.ts` — the learner's courses
- `src/app/api/lessons/route.ts` — standalone lessons from before courses
- `src/app/page.tsx` — the page (state + API calls)
- `src/components/`, `src/hooks/` — UI
- `supabase/migrations/` — SQL to run in Supabase

## Environment

`.env.local` must contain:

    OPENROUTER_API_KEY=...
    OPENROUTER_MODEL=deepseek/deepseek-v4.1-flash
    SUPABASE_URL=...
    SUPABASE_ANON_KEY=...

The model must support tool calling (DeepSeek V4.1 Flash does).

## Data model

**courses** — id, learner_id, topic, topic_key, title, description,
modules (jsonb: [{title, goal}]), current_module, status, created_at,
updated_at; unique(learner_id, topic_key)

**lessons** — id, learner_id, topic, lesson_data (jsonb), score, created_at,
course_id, module_index, completed_at

**attempts** — id, learner_id, lesson_id, question_index, chosen, correct,
created_at

**progress** — id, learner_id, topic, status, last_lesson_id, updated_at;
unique(learner_id, topic)

## Development rules

- Never trust raw model output. Always validate against a schema.
- Every agent loop must have a maximum iteration count.
- The API key must never reach the browser.
- Every lesson that is shown must first pass evaluation.
- Grade quizzes on the server, never in the browser.
- Do not remove tests or policies to make things pass.

## What's next (not yet implemented)

- Inline checks between concepts (Brilliant-style), not only an end quiz
- Spaced-repetition scheduling from recorded mistakes
- Accounts instead of a per-browser learner ID
- An eval suite for the agent (fixed topics, expected tool sequences, scores)
