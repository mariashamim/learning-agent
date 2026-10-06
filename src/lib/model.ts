// OpenRouter client. Two call shapes:
//  - callStructured: one prompt in, JSON matching a schema out (lesson writer).
//  - callWithTools:  a chat turn that may request tool calls (tutor agent).

const MODEL = process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4.1-flash";

// A single model call may not hang the request: abort after this long, or
// sooner if the caller's deadline is closer.
const MODEL_TIMEOUT_MS = 60_000;
// Don't start (or retry) a call with less time than this left.
const MIN_CALL_MS = 5_000;

/** Epoch ms by which the whole run must finish. */
export type Deadline = number;

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolDefinition = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

type AssistantMessage = Extract<ChatMessage, { role: "assistant" }>;

// Providers occasionally stall or return 429/5xx. Retry those once; anything
// else (bad request, auth) fails immediately.
const MAX_ATTEMPTS = 2;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

class ModelHttpError extends Error {
  constructor(readonly status: number, body: string) {
    super(`OpenRouter ${status}: ${body}`);
  }
}

function isTransient(e: unknown) {
  if (e instanceof ModelHttpError) return RETRYABLE_STATUS.has(e.status);
  // fetch throws TimeoutError on our abort and TypeError on network failure.
  return e instanceof Error && (e.name === "TimeoutError" || e.name === "TypeError");
}

async function chat(body: Record<string, unknown>, deadline: Deadline): Promise<AssistantMessage> {
  for (let attempt = 1; ; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_CALL_MS) throw new Error("Out of time for another model call");
    try {
      return await chatOnce(body, Math.min(MODEL_TIMEOUT_MS, remaining));
    } catch (e) {
      if (attempt >= MAX_ATTEMPTS || !isTransient(e)) throw e;
      console.warn(`Model call failed (${e instanceof Error ? e.message : e}); retrying`);
    }
  }
}

async function chatOnce(body: Record<string, unknown>, timeoutMs: number): Promise<AssistantMessage> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });

  if (!response.ok) {
    throw new ModelHttpError(response.status, await response.text());
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error("Model returned no message");
  return { role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls };
}

/** Returns parsed JSON constrained by `schema`. Callers must still validate it. */
export async function callStructured(
  system: string,
  user: string,
  schema: Record<string, unknown>,
  deadline: Deadline
): Promise<unknown> {
  const message = await chat({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "response", strict: true, schema },
    },
  }, deadline);
  if (!message.content) throw new Error("Model returned no content");
  return JSON.parse(message.content);
}

/** One agent turn: the model either answers in text or asks for tool calls. */
export async function callWithTools(
  messages: ChatMessage[],
  tools: ToolDefinition[],
  deadline: Deadline
): Promise<AssistantMessage> {
  return chat({ messages, tools, tool_choice: "auto" }, deadline);
}
