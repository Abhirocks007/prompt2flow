import { create } from "zustand";
import { api, sendMessage } from "../lib/api";
import type { Chat, Message, Operator, Run, Workflow } from "../lib/types";

type RightTab = "workgraph" | "auto-app" | "audit";

type AppState = {
  chats: Chat[];
  chat: Chat | null;
  messages: Message[];
  run: Run | null;
  thinking: boolean;
  status: string | null;
  waitingForInput: boolean;
  rightTab: RightTab;
  inspectedNodeId: string | null;
  toolsOpen: boolean;
  searchOpen: boolean;
  savedOperator: Operator | null;
  loadChats: () => Promise<void>;
  loadThread: (id: string) => Promise<void>;
  resetThread: () => void;
  setRightTab: (tab: RightTab) => void;
  setInspected: (id: string | null) => void;
  setToolsOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  clearSavedOperator: () => void;
  send: (chatId: string, payload: { message: string; inputs?: Record<string, unknown>; kind?: string }) => Promise<void>;
};

export const useApp = create<AppState>((set, get) => ({
  chats: [],
  chat: null,
  messages: [],
  run: null,
  thinking: false,
  status: null,
  waitingForInput: false,
  rightTab: "workgraph",
  inspectedNodeId: null,
  toolsOpen: false,
  searchOpen: false,
  savedOperator: null,
  loadChats: async () => {
    const { chats } = await api.chats();
    set({ chats });
  },
  resetThread: () =>
    set({
      chat: null,
      messages: [],
      run: null,
      thinking: false,
      status: null,
      waitingForInput: false,
      rightTab: "workgraph",
      inspectedNodeId: null,
      savedOperator: null,
    }),
  loadThread: async (id) => {
    const payload = await api.messages(id);
    set({
      chat: payload.chat,
      messages: payload.messages,
      run: payload.latestRun,
      waitingForInput: payload.latestRun?.status === "waiting_for_input",
      rightTab: payload.latestRun ? (payload.latestRun.status === "waiting_for_input" ? "auto-app" : "workgraph") : "workgraph",
      inspectedNodeId: null,
      savedOperator: null,
    });
  },
  setRightTab: (rightTab) => set({ rightTab }),
  setInspected: (inspectedNodeId) => set({ inspectedNodeId, rightTab: "workgraph" }),
  setToolsOpen: (toolsOpen) => set({ toolsOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  clearSavedOperator: () => set({ savedOperator: null }),
  send: async (chatId, payload) => {
    const user: Message = {
      id: `local-${Date.now()}`,
      chatId,
      role: "user",
      content: payload.message,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      thinking: true,
      status: "Thinking…",
      waitingForInput: false,
      messages: [...state.messages.map((item) => ({ ...item, quickReplies: undefined })), user],
    }));
    try {
      await sendMessage(chatId, payload, {
        onAssistant: (message) =>
          set((state) => ({
            messages: [...state.messages.filter((item) => item.id !== message.id), message],
          })),
        onWorkflow: (workflow: Workflow) =>
          set((state) => ({
            chat: state.chat ? { ...state.chat, workflow, title: workflow.title } : state.chat,
          })),
        onRun: (run) =>
          set({
            run,
            waitingForInput: run.status === "waiting_for_input",
            rightTab: run.status === "waiting_for_input" ? "auto-app" : run.audit.length ? "audit" : "workgraph",
          }),
        onInterrupt: () => set({ waitingForInput: true, rightTab: "auto-app" }),
        onNotification: (status) => set({ status }),
        onTitle: (title) =>
          set((state) => ({
            chat: state.chat ? { ...state.chat, title } : state.chat,
            chats: state.chats.map((item) => (item.id === chatId ? { ...item, title } : item)),
          })),
        onOperatorSaved: (savedOperator) => set({ savedOperator }),
      });
      await get().loadChats();
    } finally {
      set({ thinking: false, status: null });
    }
  },
}));
