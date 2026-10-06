// OpenRouter client. Two call shapes:
//  - callStructured: one prompt in, JSON matching a schema out (lesson writer).
//  - callWithTools:  a chat turn that may request tool calls (tutor agent).

const MODEL = process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4.1-flash";

// A single model call may not hang the request: abort after this long.
const MODEL_TIMEOUT_MS = 60_000;

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

async function chat(body: Record<string, unknown>): Promise<AssistantMessage> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, ...body }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${text}`);
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
  schema: Record<string, unknown>
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
  });
  if (!message.content) throw new Error("Model returned no content");
  return JSON.parse(message.content);
}

/** One agent turn: the model either answers in text or asks for tool calls. */
export async function callWithTools(
  messages: ChatMessage[],
  tools: ToolDefinition[]
): Promise<AssistantMessage> {
  return chat({ messages, tools, tool_choice: "auto" });
}
