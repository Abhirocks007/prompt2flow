import type { CatalogItem, Chat, IntegrationMe, Message, Operator, Run, Workflow } from "./types";

async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json() as Promise<T>;
}

export const api = {
  me: () => json<{ name: string; email: string; workspace: string; plan: string }>("/api/me"),
  chats: () => json<{ chats: Chat[] }>("/api/chats"),
  createChat: () => json<Chat>("/api/chats", { method: "POST", body: "{}" }),
  chat: (id: string) => json<Chat>(`/api/chats/${id}`),
  messages: (id: string) =>
    json<{ chat: Chat; messages: Message[]; latestRun: Run | null }>(`/api/chats/${id}/messages`),
  integrations: () => json<{ integrations: CatalogItem[] }>("/api/integrations"),
  integrationsMe: () => json<{ integrations: IntegrationMe[] }>("/api/integrations/me"),
  operators: () => json<{ operators: Operator[] }>("/api/operators"),
  operator: (id: string) => json<Operator>(`/api/operators/${id}`),
  disconnect: (slug: string) => json<{ ok: boolean }>(`/api/integrations/${slug}`, { method: "DELETE" }),
};

export async function runOperator(
  operatorId: string,
  inputs: Record<string, unknown>,
  handlers: Pick<SseHandlers, "onRun" | "onNotification">,
) {
  const response = await fetch(`/api/operators/${operatorId}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ inputs }),
  });
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to run operator");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const event = chunk.match(/^event: (.+)$/m)?.[1];
      const dataLine = chunk
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6))
        .join("\n");
      if (!event || !dataLine) continue;
      const data = JSON.parse(dataLine);
      if (event === "run") handlers.onRun?.(data);
      if (event === "notification") handlers.onNotification?.(data.content);
    }
  }
}

export const LIVE_OAUTH_SLUGS = new Set(["google_gmail", "microsoft_onedrive"]);

export type SseHandlers = {
  onAssistant?: (message: Message) => void;
  onWorkflow?: (workflow: Workflow) => void;
  onRun?: (run: Run) => void;
  onQuickReplies?: (replies: string[]) => void;
  onInterrupt?: () => void;
  onNotification?: (content: string) => void;
  onTitle?: (title: string) => void;
  onOperatorSaved?: (operator: Operator) => void;
};

export async function sendMessage(
  chatId: string,
  payload: { message: string; inputs?: Record<string, unknown>; kind?: string },
  handlers: SseHandlers,
) {
  const response = await fetch(`/api/chats/${chatId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ locale: "en", ...payload }),
  });
  if (!response.ok || !response.body) {
    throw new Error("Failed to send message");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const event = chunk.match(/^event: (.+)$/m)?.[1];
      const dataLine = chunk
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6))
        .join("\n");
      if (!event || !dataLine) continue;
      const data = JSON.parse(dataLine);
      if (event === "assistant") handlers.onAssistant?.(data);
      if (event === "workflow") handlers.onWorkflow?.(data);
      if (event === "run") handlers.onRun?.(data);
      if (event === "quick_replies") handlers.onQuickReplies?.(data);
      if (event === "interrupt") handlers.onInterrupt?.();
      if (event === "notification") handlers.onNotification?.(data.content);
      if (event === "chat-title") handlers.onTitle?.(data.title);
      if (event === "operator-saved") handlers.onOperatorSaved?.(data);
    }
  }
}
