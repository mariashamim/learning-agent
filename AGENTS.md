# Learning Agent — Harness Engineering Project

## What this is

A stateful learning agent. Given a topic, it generates a short interactive
lesson, evaluates the lesson's quality, revises if necessary, and stores the
result. When the learner returns, the agent loads their history and shapes
future lessons based on what they've already studied.

## Architecture

    Browser (page.tsx)
       │
       │ POST /api/learn  { topic, learnerId }
       ▼
    Next.js API Route (app/api/learn/route.ts)
       │
       ▼
    Harness (lib/harness.ts)
       │
       ├─ load_history  → Supabase: progress table
       ├─ generate      → OpenRouter: lesson JSON
       ├─ evaluate      → OpenRouter: score 0-10
       ├─ revise        → OpenRouter: improved lesson (if score < 8),
       │                  then evaluated again
       ├─ select        → best-scoring *evaluated* version
       ├─ save_lesson   → Supabase: lessons table
       └─ save_progress → Supabase: progress table
       │
       ▼
    Lesson returned to browser + persisted

## Key concepts

**The model is not the agent. The harness is.** The harness is the loop,
state, tools, constraints, and evaluation around the model.

**Structured output.** Every model call uses a JSON schema. The model cannot
return arbitrary prose that breaks the app.

**Evaluation loop.** The harness never trusts the first generation. A separate
model call scores it, and if the score is below 8, the lesson is revised and
the revision is scored too. Only evaluated versions can be shown: the harness
returns the highest-scoring one, with its real score and a `passed` flag
(score >= 8). A revision that fails or can't be evaluated is discarded.

**Valid quiz.** Every lesson must have 2-4 questions with exactly 4 options and
a `correctAnswer` that matches an option. Invalid model output is retried
once, then the request fails with a clear error.

**Bounded iteration.** The loop runs at most 2 iterations. No infinite loops.
Each model call times out after 60s, and no revision starts after 100s, so a
request stays within the route's 300s limit.

**Persistence.** Every lesson and every progress row is written to Supabase.
The next request can read them.

## Files

- `src/lib/harness.ts` — the agent loop
- `src/lib/db.ts` — Supabase access
- `src/lib/requestGuards.ts` — input validation, rate limiting, error responses
- `src/app/api/learn/route.ts` — the endpoint that runs the harness
- `src/app/api/lessons/route.ts` — read endpoint for the library
- `src/app/page.tsx` — the page (state + API calls)
- `src/components/` — UI components
- `src/hooks/` — cursor, magnetic button, tilt, scroll-reveal, motion prefs

## Environment

`.env.local` must contain:

    OPENROUTER_API_KEY=...
    OPENROUTER_MODEL=deepseek/deepseek-v4.1-flash
    SUPABASE_URL=...
    SUPABASE_ANON_KEY=...

## Data model

**lessons**
- id, learner_id, topic, lesson_data (jsonb), score, created_at

**progress**
- id, learner_id, topic, status, last_lesson_id, updated_at
- unique(learner_id, topic)

## Development rules

- Never trust raw model output. Always validate against a schema.
- Every agent loop must have a maximum iteration count.
- The API key must never reach the browser.
- Every lesson that is shown must first pass evaluation.
- Do not remove tests or policies to make things pass.

## What's next (not yet implemented)

- Per-question answer tracking (attempts table)
- Adaptive follow-up based on weak areas
- "Continue learning" flow that resumes a course
- Spaced-repetition scheduling