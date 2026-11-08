import { Bot, MessageSquarePlus, MoreHorizontal, Search, Sparkles } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { useApp } from "../store/app";

const item =
  "flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-raised hover:text-ink";

export function Sidebar() {
  const navigate = useNavigate();
  const setSearchOpen = useApp((s) => s.setSearchOpen);
  return (
    <aside className="flex w-14 shrink-0 flex-col items-center border-r border-line bg-canvas py-3">
      <button type="button" className="mb-4" onClick={() => navigate("/")} aria-label="prompt2flow home">
        <Logo />
      </button>
      <nav className="flex flex-1 flex-col items-center gap-1">
        <NavLink to="/" className={({ isActive }) => `${item} ${isActive ? "bg-raised text-ink" : ""}`} title="New Chat">
          <MessageSquarePlus size={18} />
        </NavLink>
        <NavLink
          to="/operators"
          className={({ isActive }) => `${item} ${isActive ? "bg-raised text-ink" : ""}`}
          title="Operators"
        >
          <Bot size={18} />
        </NavLink>
        <NavLink
          to="/workbench"
          className={({ isActive }) => `${item} ${isActive ? "bg-raised text-ink" : ""}`}
          title="Workbench"
        >
          <Sparkles size={18} />
        </NavLink>
        <button type="button" className={item} title="More">
          <MoreHorizontal size={18} />
        </button>
        <div className="my-2 h-px w-6 bg-line" />
        <button type="button" className={item} title="Search chats" onClick={() => setSearchOpen(true)}>
          <Search size={18} />
        </button>
      </nav>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4f7cff] text-sm font-semibold">A</div>
    </aside>
  );
}
