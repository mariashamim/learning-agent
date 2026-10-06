export type Question = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export type Lesson = {
  title: string;
  objective: string;
  estimatedMinutes: number;
  concepts: { name: string; explanation: string; example: string }[];
  questions: Question[];
};

export type LessonRow = {
  id: number;
  topic: string;
  score: number | null;
  created_at: string;
  lesson_data: Lesson;
};

// Shape of a harness trace entry; extra fields vary by step.
export type TraceStep = { step?: string; score?: number; [key: string]: unknown };

/** What the harness reported about a freshly generated lesson. Empty for library lessons. */
export type LessonStatus = { passed?: boolean; saved?: boolean };
