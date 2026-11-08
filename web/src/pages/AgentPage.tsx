import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChatPane } from "../components/ChatPane";
import { Header } from "../components/Header";
import { RightPanel } from "../components/RightPanel";
import { api } from "../lib/api";
import { useApp } from "../store/app";

export function AgentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const chat = useApp((s) => s.chat);
  const loadThread = useApp((s) => s.loadThread);
  const resetThread = useApp((s) => s.resetThread);
  const send = useApp((s) => s.send);
  const loadChats = useApp((s) => s.loadChats);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!id) {
      resetThread();
      return;
    }
    const current = useApp.getState();
    if (current.chat?.id === id && (current.thinking || current.messages.length > 0)) {
      return;
    }
    void loadThread(id);
  }, [id, loadThread, resetThread]);

  async function onSend(text: string) {
    if (!id) {
      const created = await api.createChat();
      useApp.setState({ chat: created, messages: [], run: null });
      await send(created.id, { message: text });
      navigate(`/c/${created.id}`);
      return;
    }
    await send(id, { message: text });
  }

  async function onSubmitInputs(inputs: Record<string, unknown>) {
    if (!id) return;
    await send(id, { message: "Here are the workflow inputs", inputs, kind: "submit_inputs" });
  }

  return (
    <div className="flex h-full flex-col">
      <Header title={chat?.title ?? "prompt2flow"} />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(320px,42%)_minmax(0,1fr)]">
        <ChatPane empty={!id} onSend={onSend} />
        <RightPanel onSubmitInputs={onSubmitInputs} />
      </div>
    </div>
  );
}
