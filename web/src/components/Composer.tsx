import { FormEvent, useState, type ReactNode } from "react";
import { ArrowUp, HelpCircle, Mic, Paperclip, Square, Wrench } from "lucide-react";
import { useApp } from "../store/app";

export function Composer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const thinking = useApp((s) => s.thinking);
  const setToolsOpen = useApp((s) => s.setToolsOpen);
  const canSend = text.trim().length > 0 && !thinking && !disabled;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-raised p-3">
      <textarea
        name="message"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit(e);
          }
        }}
        rows={2}
        placeholder="State your task to complete…"
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <IconButton label="Add context">
            <Paperclip size={16} />
          </IconButton>
          <button
            type="button"
            onClick={() => setToolsOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-ink"
          >
            <Wrench size={14} />
            Tools
          </button>
          <IconButton label="Workflow help">
            <HelpCircle size={16} />
          </IconButton>
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="Voice input">
            <Mic size={16} />
          </IconButton>
          <button
            type="submit"
            disabled={!canSend && !thinking}
            className="chat-send-btn flex h-8 w-8 items-center justify-center rounded-full bg-[#d6d6dc] text-black disabled:bg-[#2c2c32] disabled:text-muted"
            aria-label={thinking ? "Stop" : "Send"}
          >
            {thinking ? <Square size={12} /> : <ArrowUp size={16} />}
          </button>
        </div>
      </div>
    </form>
  );
}

function IconButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button type="button" title={label} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-card hover:text-ink">
      {children}
    </button>
  );
}
