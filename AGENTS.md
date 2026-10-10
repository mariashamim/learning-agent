# Learning Agent — Harness Engineering Project

## What this is

A stateful tutor, in the spirit of Brilliant. A learner names any topic; a
tutor agent plans a course as levels (stages of learning), each grouping a few
5-10 minute modules, writes one module at a time through a quality gate, and
records quiz results. When the
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
            ├─ create_course     → plan levels + modules (lib/coursePlan.ts) → Supabase: courses
            ├─ get_quiz_mistakes → Supabase: attempts
            └─ write_module      → quality gate (lib/lessonWriter.ts)
                 ├─ generate → validate blocks → lint → evaluate → [revise → evaluate]
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

**Course hierarchy.** Course → levels → modules → lesson (whose blocks
are the activities). A level is a stage of learning with its own objective; a
module groups related ideas inside it and is one lesson. The agent plans
2-4 levels of 2-4 modules (4-12 modules in total), sized to the subject;
`lib/coursePlan.ts` validates the plan in code (counts, distinct titles,
levels named for what they cover) and returns problems to the agent as an
error to fix. Storage is still one ordered list (`courses.modules`), so
module positions keep meaning what they meant: `lessons.module_index`,
`courses.current_module`, grading, progression and `/courses/[id]/[n]` are
unchanged. Each new module entry also carries a stable `id`
(`level-2-module-1`), a `description` and its `level` (id, title,
description, objective); `lib/courseHierarchy.ts` rebuilds the levels when a
course is shown. Progression is sequential: a module opens when the one
before it is completed, so a level opens when the level before it is done.
Level status is derived only from saved completions. Courses planned before
levels have no level data and are shown as one unlabelled path; they are
never split into invented levels.

**Lessons are designed, not templated.** A lesson is an ordered list of
teaching blocks (`lib/lessonBlocks.ts`). The writer first picks a teaching
approach that fits the content (mystery, guided discovery, visual, scenario,
worked example, misconception, simulation, case study, story, Socratic,
compare, practice, reflection), then builds the sequence from these blocks:
explain, activity, check, worked example, code (predict output / find the fix
/ step-through trace), problem (work it out and type the answer), compare,
reflect, dialogue, summary. Nothing is fixed:
no mandatory opening prediction, definition or closing quiz. Earlier modules'
approaches are passed in so a course varies. Topic-specific sequences are
never hardcoded; the guide describes what each approach does to a lesson's
shape, and the model chooses.

**Checks live inside the lesson.** Graded questions (2-4, scenario-based,
exactly 4 options, `correctAnswer` matching one) stay in `questions`, so
grading and progress are unchanged; each is placed by a `check` block right
after the idea it tests, with up to 2 progressive hints. A wrong answer
doesn't reveal the right one: the learner sees an alternative explanation and
can try again or ask for the answer. Only the first answer is sent and graded;
retries are practice. The module is saved once every check is answered.

**Typed problems.** A `problem` block asks the learner to work something out
and type the answer. It's checked in the browser (practice, not graded):
integers exactly, other numbers within 1%, fractions and currency symbols
understood, short text after normalizing case and spacing. Anticipated wrong
answers ("traps") get feedback naming the mistake behind them; hints come one
at a time; the worked solution is shown once solved, or on request after two
misses. Validation drops traps that would match an accepted answer.

**Validation in code.** `lib/lessonDesign.ts` validates each block, activity
and question on its own, drops what is malformed, remaps references, and
places any question no block placed. It rejects a lesson (retried once) with
fewer than 2 valid questions, fewer than 3 usable blocks, nothing that
teaches, or fewer than 2 hands-on blocks. `lintStructure()` finds problems
that don't make a lesson unusable (checks stacked at the end, walls of text,
the old template) and hands them to the evaluator, which scores them down.
The reviser sees the lesson in exactly the format it writes
(`toModelFormat()`), so revisions don't lose activities.

**Interactive activities.** Activity blocks place one of 12 activity types:
predict, scenario, drag-and-drop sort, drag-to-order, story, timeline,
infographic chart, slider simulation, interactive diagram, narrated listen
(browser speech), playable sound (Web Audio, music topics only) and graph (a
curve the learner reshapes by dragging a parameter). A graph's formula is
compiled by a small safe parser (`lib/expression.ts`, no eval) and rejected
unless it draws a real curve that is visible in the window the lesson chose.
`lib/activities.ts` validates each for its type. Activities, code exercises,
worked examples, problems, reflections and dialogues are practice: ungraded and not
saved. Progress still comes from the checks.

**Motion.** Animation follows real state only: map nodes show saved
completion, the gold trail runs only out of completed modules, celebrations
fire on server-confirmed results, and the generation overlay shows elapsed
time and what a run does, never invented progress (the API reports nothing
until a run ends; "Stop waiting" stops the wait, not the run). Simple
entrances are CSS (`Reveal`, one shared IntersectionObserver); Motion for
React (`motion`) is used for springs, exits, layout and SVG path drawing,
with shared timing in `components/motion/presets.ts`. `MotionConfig
reducedMotion="user"` plus a global CSS rule honour reduced motion; path
drawing, bursts and springs check it too.

**Visual system.** Editorial "ink and gold": near-black plum ink (#1a0f24),
warm cream (#f6f1e7), gold as the one hot accent, berry secondary; Instrument
Sans for text and headlines, Instrument Serif italic for accent words
(`.accent-word`). Pages alternate ink and cream sections (`PageHero` +
`CreamSection`); lessons read on cream. Colour tokens are roles (`--sand` is
primary text, `--taupe` muted, `--beige` hairlines, `--paper` cards,
`--well` recessed panels, `--gold` accent text and lines, `--gold-fill`
buttons, `--ink` always the darkest ink): `.surface-cream` re-maps them for
light sections, and `.surface-ink` restores the dark ones for islands inside
cream (code windows, the garden, story art). Gold text on cream uses the
deeper #8f6200 (4.8:1); buttons keep the bright fill with ink text (8.3:1).
A minimal top bar replaces the sidebar (tabs at the bottom on phones). Lenis
gives momentum scrolling on browsing pages only; lesson pages keep native
scrolling, and programmatic scrolls go through `scrollToElement()` so Lenis
doesn't undo them.

**Saved lessons keep working.** Lessons saved before blocks existed have
`concepts`, `activities` (placed by `afterConcept`) and `questions`;
`lessonBlocks()` rebuilds them in their original order, so old courses,
progress and grading are untouched. No database migration is needed.

**Bounded iteration.** Max 6 agent turns, at most one revision per lesson, one
retry for malformed output, one retry for transient call failures, 60s per
model call (90s for writing or scoring a lesson), no revision after 120s, no agent turn after 200s, and a hard 280s
deadline for every call (300s route limit).

**Server-side grading.** The browser sends chosen options; the server grades
against the stored lesson. Only a module's first completion counts.

**Persistence.** Courses, lessons, attempts and progress live in Supabase.
Each run rebuilds the agent's context from there.

## Files

- `src/lib/harness.ts` — tutor agent loop, tools, fast paths
- `src/lib/lessonWriter.ts` — quality gate: generate / evaluate / revise
- `src/lib/lessonBlocks.ts` — stored lesson shape: approaches, blocks, old-lesson conversion
- `src/lib/lessonDesign.ts` — lesson writing guide, block validation, structure lint, model format
- `src/lib/activities.ts` — interactive activity schema, writing guide, validation
- `src/lib/model.ts` — OpenRouter client (structured output, tool calling)
- `src/lib/progress.ts` — quiz grading and course progression
- `src/lib/courseView.ts` — client-facing course shape: levels, modules, lessons
- `src/lib/coursePlan.ts` — course plan schema, planning guide, validation
- `src/lib/courseHierarchy.ts` — levels from the stored module list, labels, old-course handling
- `src/lib/db.ts` — Supabase access
- `src/lib/requestGuards.ts` — input validation, rate limiting, error responses
- `src/app/api/learn/route.ts` — runs the tutor
- `src/app/api/attempts/route.ts` — records a finished quiz
- `src/app/api/courses/route.ts` — the learner's courses
- `src/app/api/lessons/route.ts` — standalone lessons from before courses
- `src/app/page.tsx` — Home: welcome + "What do you want to learn?"
- `src/app/courses/page.tsx` — Courses: your courses, explore, how-it-works scrollytelling
- `src/app/courses/[id]/page.tsx` — a course's welcome page and module path
- `src/app/courses/[id]/[module]/page.tsx` — one module: lesson + quiz
- `src/app/progress/page.tsx` — Progress: knowledge garden, bars, streak, milestones
- `src/app/library/page.tsx` — Library: bookmarked (starred) courses
- `src/components/app/AppState.tsx` — shared client state: learner, courses, tutor
  requests with background prefetch, quiz saving, bookmarks
- `src/components/app/AppShell.tsx` — layout: top bar, phone tab bar, overlays
- `src/components/LessonView.tsx` — renders a lesson's blocks in order, session bar, module finish
- `src/components/lesson/` — one component per block kind (code, worked, reflect, dialogue, …)
- `src/components/activities/` — one component per activity type
- `src/components/motion/` — motion presets, primitives (Expand, ProgressFill,
  CountUp, Burst), woven-thread visual
- `src/components/app/CourseMap.tsx` — animated course journey map
- `src/components/app/PageHero.tsx` — ink page header and cream content section
- `src/components/app/HeroCollage.tsx` — the home page's paper collage
- `src/components/app/CourseFan.tsx` — courses to explore as a fan of cards on a wheel (drag, arrows, ←/→)
- `src/components/app/SmoothScroll.tsx` — Lenis momentum scroll (off on lessons), `scrollToElement()`
- `src/lib/expression.ts` — safe formula compiler for graph activities
- `src/components/`, `src/hooks/` — UI pieces

Bookmarks are stored in the browser (localStorage, per learner ID), matching
the per-browser learner identity; they are not in Supabase.
- `supabase/migrations/` — SQL to run in Supabase
- `scripts/sample-lessons.ts` — writes sample modules for several subjects to compare their shapes
- `*.test.ts(x)` — unit and rendering tests (`npm test`)

## Environment

`.env.local` must contain:

    OPENROUTER_API_KEY=...
    OPENROUTER_MODEL=deepseek/deepseek-v4.1-flash
    SUPABASE_URL=...
    SUPABASE_ANON_KEY=...

The model must support tool calling (DeepSeek V4.1 Flash does).

## Data model

**courses** — id, learner_id, topic, topic_key, title, description,
modules (jsonb, ordered: [{id, title, goal, description, level: {id, title,
description, objective}}]; older courses only {title, goal}),
current_module (position in modules), status, created_at, updated_at;
unique(learner_id, topic_key). Level data lives inside `modules`, so the
hierarchy needed no migration.

**lessons** — id, learner_id, topic, lesson_data (jsonb), score, created_at,
course_id, module_index, completed_at. `lesson_data` is a `Lesson`
(`lib/lessonBlocks.ts`): version 2 lessons have `approach`, `blocks`,
`activities`, `questions`; older ones `concepts`, `activities`, `questions`.

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
- Run `npm test`, `npm run lint` and `npm run build` before pushing.
- Don't hardcode topic-specific lesson sequences; describe moves and let the writer choose.

## What's next (not yet implemented)

- Spaced-repetition scheduling from recorded mistakes
- More than one lesson per module (today a module is one lesson of activity blocks)
- Accounts instead of a per-browser learner ID
- An eval suite for the agent (fixed topics, expected tool sequences, scores);
  `scripts/sample-lessons.ts` is a manual start for lesson variety
