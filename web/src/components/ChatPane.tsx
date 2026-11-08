import { Copy, RotateCcw } from "lucide-react";
import { Composer } from "./Composer";
import { useApp } from "../store/app";

export function ChatPane({
  empty,
  onSend,
}: {
  empty?: boolean;
  onSend: (text: string) => void;
}) {
  const messages = useApp((s) => s.messages);
  const thinking = useApp((s) => s.thinking);
  const status = useApp((s) => s.status);
  const lastAssistant = [...messages].reverse().find((item) => item.role === "assistant");

  return (
    <section className="flex h-full min-w-0 flex-col border-r border-line">
      <div className="min-h-0 flex-1 overflow-auto px-5 py-6">
        {empty && messages.length === 0 && (
          <div className="pt-10">
            <h2 className="text-2xl font-medium">Hello Abhiram.</h2>
            <p className="mt-2 text-muted">Welcome to prompt2flow. State a task and I’ll draft a workgraph.</p>
          </div>
        )}
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={message.role === "user" ? "flex justify-end" : ""}>
              <div
                className={
                  message.role === "user"
                    ? "max-w-[90%] rounded-2xl bg-raised px-4 py-3 text-sm"
                    : "max-w-[95%] rounded-2xl border border-line bg-card px-4 py-3 text-sm leading-6"
                }
              >
                {message.content.split("\n").map((line, i) => (
                  <p key={i} className={i ? "mt-2" : ""}>
                    {renderLine(line, message.fileName, message.fileUrl)}
                  </p>
                ))}
              </div>
            </div>
          ))}
          {lastAssistant && !thinking && lastAssistant.quickReplies?.length ? (
            <div>
              <div className="mb-2 flex gap-2 text-muted">
                <button type="button" className="rounded-md p-1 hover:bg-raised" aria-label="Copy">
                  <Copy size={14} />
                </button>
                <button type="button" className="rounded-md p-1 hover:bg-raised" aria-label="Retry">
                  <RotateCcw size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {lastAssistant.quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => onSend(reply)}
                    className="rounded-full bg-raised px-3 py-1.5 text-sm text-reply hover:bg-card"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {thinking && <div className="text-sm text-muted">{status ?? "Thinking…"}</div>}
        </div>
      </div>
      <div className="p-4">
        <Composer onSend={onSend} />
      </div>
    </section>
  );
}

function renderLine(line: string, fileName?: string, fileUrl?: string) {
  if (fileName && line.includes(fileName) && fileUrl) {
    const parts = line.split(fileName);
    return (
      <>
        {parts[0]}
        <a href={fileUrl} className="underline" download>
          {fileName}
        </a>
        {parts[1]}
      </>
    );
  }
  return line;
}
