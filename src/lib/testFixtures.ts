// Test fixtures: lessons as the model returns them (flat blocks), and one
// saved before blocks existed. Used by the unit and rendering tests only.

const emptyBlock = { heading: "", body: "", aside: "", ref: 0, language: "", code: "", mode: "", columns: [], items: [], hints: [] };
const item = (o: Partial<{ label: string; text: string; detail: string; correct: boolean; line: number }>) => ({
  label: "",
  text: "",
  detail: "",
  correct: false,
  line: 0,
  ...o,
});
const emptyActivity = {
  title: "",
  prompt: "",
  reveal: "",
  unit: "",
  script: "",
  options: [],
  buckets: [],
  items: [],
  edges: [],
  slider: { label: "", min: 0, max: 0, step: 0, unit: "", initial: 0 },
  bands: [],
};

export const question = (n: number) => ({
  question: `Scenario ${n}: you see a loop run. What happens?`,
  options: [`A${n}`, `B${n}`, `C${n}`, `D${n}`],
  correctAnswer: `B${n}`,
  explanation: `Because of reason ${n}.`,
});

/** A programming lesson: code first, traced, then a bug to fix. */
export function rawProgrammingLesson() {
  return {
    title: "Loops that add up",
    objective: "Predict and trace what a for loop does to a running total.",
    approach: "practice",
    approachReason: "Loops are learned by running them in your head.",
    estimatedMinutes: 8,
    blocks: [
      {
        ...emptyBlock,
        kind: "code",
        heading: "What does this print?",
        body: "Read it once, then pick the output.",
        language: "python",
        code: "total = 0\nfor i in range(3):\n    total += i\nprint(total)",
        mode: "predict",
        items: [
          item({ text: "3", correct: true, detail: "0 + 1 + 2 = 3." }),
          item({ text: "6", detail: "That would be range(4) or 1..3." }),
          item({ text: "0", detail: "The loop body runs three times." }),
        ],
        aside: "range(3) yields 0, 1, 2.",
        hints: ["What numbers does range(3) produce?"],
      },
      {
        ...emptyBlock,
        kind: "code",
        heading: "Step through it",
        body: "Watch total change.",
        language: "python",
        code: "total = 0\nfor i in range(3):\n    total += i\nprint(total)",
        mode: "trace",
        items: [
          item({ line: 1, text: "total starts at 0", detail: "total = 0" }),
          item({ line: 3, text: "first pass adds 0", detail: "i = 0, total = 0" }),
          item({ line: 3, text: "second pass adds 1", detail: "i = 1, total = 1" }),
          item({ line: 3, text: "third pass adds 2", detail: "i = 2, total = 3" }),
          item({ line: 4, text: "prints 3", detail: "total = 3" }),
        ],
      },
      { ...emptyBlock, kind: "check", ref: 0, hints: ["Count the passes."], aside: "Think of range(n) as n steps starting at 0." },
      { ...emptyBlock, kind: "explain", heading: "The accumulator pattern", body: "Start with a neutral value.\n\nUpdate it each pass." },
      {
        ...emptyBlock,
        kind: "code",
        heading: "Fix the bug",
        body: "This should sum 1 to 5 but prints 10.",
        language: "python",
        code: "total = 0\nfor i in range(5):\n    total += i\nprint(total)",
        mode: "bug",
        items: [
          item({ text: "range(1, 6)", correct: true, detail: "Now i runs 1..5." }),
          item({ text: "range(6)", detail: "Close, but it also adds 0. Harmless here, though less clear." }),
          item({ text: "total = 1", detail: "That just shifts the answer." }),
        ],
      },
      { ...emptyBlock, kind: "check", ref: 1 },
      { ...emptyBlock, kind: "activity", ref: 0 },
    ],
    activities: [
      {
        ...emptyActivity,
        type: "order",
        title: "Order the steps",
        prompt: "Put the accumulator steps in order.",
        reveal: "Initialise, loop, update, use.",
        items: ["Set total to 0", "Loop over the values", "Add each value", "Print total"].map((t) => ({ text: t, group: "", detail: "", value: 0 })),
      },
    ],
    questions: [question(1), question(2)],
  };
}

/** A history lesson: story first, a timeline, a comparison and reflection. */
export function rawHistoryLesson() {
  return {
    title: "Why 1789 boiled over",
    objective: "Explain how debt, bread and ideas combined in 1789.",
    approach: "story",
    approachReason: "Causes are easiest to hold as a chain of events.",
    estimatedMinutes: 9,
    blocks: [
      { ...emptyBlock, kind: "activity", ref: 0 },
      { ...emptyBlock, kind: "explain", heading: "A kingdom in debt", body: "France had borrowed heavily." },
      { ...emptyBlock, kind: "check", ref: 0, hints: ["Who paid taxes?"], aside: "Picture a household that can't pay its loans." },
      { ...emptyBlock, kind: "activity", ref: 1 },
      {
        ...emptyBlock,
        kind: "compare",
        heading: "Two estates",
        body: "How the burden fell.",
        columns: ["Nobility", "Third Estate"],
        items: [item({ label: "Taxes", text: "Mostly exempt", detail: "Paid most" }), item({ label: "Votes", text: "One", detail: "One" })],
      },
      { ...emptyBlock, kind: "reflect", body: "Which cause mattered most, and why?", aside: "Debt forced the Estates-General; bread made it urgent." },
      { ...emptyBlock, kind: "check", ref: 1 },
      { ...emptyBlock, kind: "summary", items: [item({ text: "Debt, bread and ideas combined." })] },
    ],
    activities: [
      {
        ...emptyActivity,
        type: "story",
        title: "A baker in Paris",
        prompt: "Follow one family through 1789.",
        reveal: "Prices turned hunger into politics.",
        items: [
          { text: "Bread costs half a day's wage.", group: "Setup", detail: "", value: 0 },
          { text: "The price doubles in spring.", group: "Tension", detail: "", value: 0 },
          { text: "Crowds march on the Bastille.", group: "Turn", detail: "", value: 0 },
        ],
      },
      {
        ...emptyActivity,
        type: "timeline",
        title: "1789",
        prompt: "Step through the year.",
        reveal: "Weeks, not years.",
        items: [
          { text: "May", group: "Estates-General", detail: "Meets at Versailles.", value: 0 },
          { text: "June", group: "Tennis Court Oath", detail: "Third Estate vows to stay.", value: 0 },
          { text: "July", group: "Bastille", detail: "Stormed on the 14th.", value: 0 },
        ],
      },
    ],
    questions: [question(1), question(2)],
  };
}

/** A lesson as stored before blocks existed: concepts, afterConcept activities, end quiz. */
export function legacyLesson() {
  return {
    title: "Stoic control",
    objective: "Tell what you control from what you don't.",
    estimatedMinutes: 7,
    concepts: [
      { name: "The dichotomy of control", explanation: "Some things are up to us.", example: "Your effort, not the weather." },
      { name: "Practice", explanation: "Notice, sort, act.", example: "Missed train." },
    ],
    activities: [
      {
        type: "predict" as const,
        afterConcept: -1,
        title: "Guess first",
        prompt: "What can you control?",
        reveal: "Only your judgements.",
        options: [
          { text: "Traffic", correct: false, feedback: "No." },
          { text: "Your response", correct: true, feedback: "Yes." },
          { text: "Others' opinions", correct: false, feedback: "No." },
        ],
      },
    ],
    questions: [question(1), question(2), question(3)],
  };
}
