import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../store/app";

export function SearchOverlay() {
  const open = useApp((s) => s.searchOpen);
  const chats = useApp((s) => s.chats);
  const setSearchOpen = useApp((s) => s.setSearchOpen);
  const loadChats = useApp((s) => s.loadChats);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) void loadChats();
  }, [open, loadChats]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 p-8" onClick={() => setSearchOpen(false)}>
      <div
        className="mx-auto max-w-lg rounded-2xl border border-line bg-panel p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-sm text-muted">Search chats</div>
        <div className="max-h-80 space-y-1 overflow-auto">
          {chats.length === 0 && <div className="text-sm text-muted">No chats yet.</div>}
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              className="block w-full rounded-lg px-3 py-2 text-left hover:bg-raised"
              onClick={() => {
                setSearchOpen(false);
                navigate(`/c/${chat.id}`);
              }}
            >
              <div className="truncate text-sm">{chat.title}</div>
              <div className="text-xs text-muted">{new Date(chat.updatedAt).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
