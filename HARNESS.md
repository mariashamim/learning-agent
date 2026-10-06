# Harness engineering, and the harness in this app

## What harness engineering is

A language model on its own only maps text to text. An **agent** is the model
*plus* everything around it: the loop that calls it repeatedly, the tools it
can use, the context it's given, the state it reads and writes, the rules it
can't break, the checks on its output, and the logs that show what happened.
That surrounding system is the **harness**, and designing it is harness
engineering.

The core idea: **the model is a component; the harness is the product.** Two
apps using the same model can behave completely differently, because
reliability comes mostly from the harness: what the model is shown, what it
is allowed to do, and what gets checked before anything reaches a user.

The usual parts of a harness, and where each one lives in this repo:

| Part | What it does | Here |
| --- | --- | --- |
| Control loop | Calls the model, runs the tools it asks for, decides when to stop | `runTutor` in [src/lib/harness.ts](src/lib/harness.ts) |
| Context | What the model sees each turn | `describeState`: course plan, module status, quiz results, other topics |
| Tools | Actions the model can request | `create_course`, `get_quiz_mistakes`, `write_module` |
| State / memory | What persists between runs | Supabase: `courses`, `lessons`, `attempts`, `progress` |
| Guardrails | Rules enforced in code, not in the prompt | Tool preconditions, zod schemas, step/time limits, server-side grading |
| Verification | Checking output before it's used | Quality gate in [src/lib/lessonWriter.ts](src/lib/lessonWriter.ts): evaluator + revise |
| Observability | A record of every decision | The `trace` returned with each response, shown under "Harness trace" |

## Workflows vs agents, and why this app uses both

Anthropic's [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
draws a useful line:

- A **workflow** runs the model through *code-defined* steps. Predictable,
  cheaper, easier to test.
- An **agent** lets the *model* decide the next step, using tools in a loop.
  More flexible, but costlier and errors can compound.

The advice is to start with the simplest thing that works and add agency only
where the path genuinely varies. This app does exactly that:

- **The tutor is an agent.** What to do next really depends on the learner:
  new topic or returning? Which module is next? Did they get questions wrong
  that the next module should revisit? The model decides, using tools.
- **Lesson writing is a workflow.** Every lesson must go through the same
  generate → evaluate → revise steps. That's the *evaluator-optimizer*
  pattern from the same article: one call writes, a separate call scores
  against clear criteria, and a low score triggers a revision. It stays in
  code, because quality checks shouldn't be optional for the model.

The agent can choose *what* to write; it can't choose to skip the checks.

## One tutor run

```
POST /api/learn { topic, learnerId }
  │
  ├─ load course for (learner, topic)
  │    ├─ course finished?          → return overview      (no model call)
  │    └─ current module unfinished? → return that lesson   (no model call)
  │
  └─ agent loop (max 6 turns, 200s budget)
       context: course plan + module status + quiz results + other topics
       │
       ├─ create_course(title, description, modules[3-6])   only if none exists
       ├─ get_quiz_mistakes()                               if quizzes show errors
       ├─ write_module(focus)                               exactly once
       │    └─ quality gate (workflow)
       │         generate → evaluate → [revise → evaluate] → keep best evaluated
       │         → save lesson, update progress
       └─ reply with a 1-2 sentence note to the learner → loop ends

POST /api/attempts { lessonId, answers }   (after the quiz)
  └─ grade on the server → record attempts → mark module done → advance course
```

## Design decisions, and why

**Skip the model when the answer is already known.** Returning to an
unfinished module is a database lookup, not an agent run. It's instant, costs
nothing, and can't go wrong. A good harness spends model calls only where
judgment is needed.

**Rules live in code, not in the prompt.** The prompt *asks* the agent to
write one module per run. The harness *enforces* it: `write_module` refuses a
second call, refuses to run before a course exists, and always writes the
course's current module whatever the model asks for. `create_course` refuses
if a course exists. Prompts guide; code guarantees.

**Tool errors go back to the model; infrastructure errors stop the run.** If
the agent calls a tool wrongly (bad arguments, wrong order), it gets
`{ "error": "..." }` as the tool result and can correct itself on the next
turn. If the database or the lesson writer fails, the run stops with a clear
error. There's no point letting the model reason about an outage.

**Everything is bounded.** Max 6 agent turns, one nudge if the agent tries to
finish without writing, at most one revision per lesson, one retry for
malformed output, one retry for a timed-out or failed call (429/5xx), a 60s
timeout per model call, no revision after 120s, no new agent turn after 200s,
and a hard 280s deadline that every call (and retry) must fit inside the
route's 300s limit. A loop with no bounds is a bill and a hang waiting to
happen.

**Retry what's transient, not what's wrong.** A provider stall or a 503 is
worth one more try; a 400 or bad credentials isn't. Retries only happen if the
run's deadline leaves room for them.

**Never trust model output.** The lesson writer uses JSON-schema structured
output *and* validates with zod: 2-4 questions, exactly 4 options each, and
the correct answer must be one of the options. Tool arguments are validated
the same way.

**Never trust the client either.** The browser sends which option was picked,
not whether it was right. The server grades against the stored lesson. Only
the first completion of a module counts toward progress.

**Show only what was checked.** Only *evaluated* versions of a lesson can be
shown, and the highest-scoring one is kept. A revision that fails or can't be
re-scored is thrown away rather than shown unchecked. If nothing reaches the
8/10 bar, the best attempt is shown with its real score and a visible note.

**State lives in the database, not in the conversation.** Each run rebuilds
the agent's context from Supabase. That's what makes "continue whenever you
come back" work: there's no long chat history to lose, and the context stays
small and focused on what matters for the next decision.

**Make every run inspectable.** Each response includes a trace: which fast
path was taken, every agent turn and tool call (and whether it failed),
evaluator scores, revisions, saves. When something goes wrong, the trace says
where.

## Failures we hit building this, and the harness fix for each

These all happened during development. Each one is a harness problem, not a
model problem:

| What went wrong | Why | Fix |
| --- | --- | --- |
| Lessons arrived with no quiz | Schema allowed an empty `questions` array; only the revise prompt mentioned quiz rules | Schema requires 2-4 valid questions; the same rules go into every prompt; bounded retry |
| A lesson was shown that had never been scored | The loop revised *after* its last evaluation | Every revision is re-evaluated; only the best evaluated version can be returned |
| One request took 4+ minutes | Model calls had no timeout | 60s timeout per call, plus deadlines for revisions and agent turns |
| A run failed with "aborted due to timeout", and we couldn't tell where | One slow call sank the whole run, and the trace was lost on failure | One retry for transient failures within a hard run deadline; per-step timings in the trace; failed runs log their trace |
| Production build crashed | The DB client was created at import time, so the build needed secrets | Create the client on first use |
| Quiz results could be faked | The client decided what was correct | Server-side grading against the stored lesson |

## Limits and next steps

- **Identity is per browser.** A random learner ID in local storage; no
  accounts. Clearing storage loses the courses.
- **Interaction is quiz-at-the-end.** Brilliant-style learning interleaves
  small questions with the explanation; the lesson schema could add inline
  checks between concepts.
- **Spaced repetition.** The `attempts` table already records what was
  missed; a scheduler could bring those questions back days later.
- **Evals for the harness itself.** A fixed set of topics run through the
  agent, checking tool sequences, scores and latency, would catch
  regressions when prompts or models change.

## Further reading

- Anthropic, [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents):
  workflows vs agents, the evaluator-optimizer pattern, keeping agents simple.
- deepset, [Harness engineering: how to build reliable AI agents](https://www.deepset.ai/blog/harness-engineering).
- Databricks, [What is an AI agent harness?](https://www.databricks.com/blog/ai-harness)
- Arize, [Harness engineering](https://arize.com/resources/harness-engineering/).
