import { ChevronDown, Maximize2, PanelsTopLeft } from "lucide-react";

export function Header({ title }: { title: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
      <h1 className="truncate text-[15px] font-medium">{title}</h1>
      <div className="flex items-center gap-2">
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted">
          <PanelsTopLeft size={16} />
        </button>
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted">
          <Maximize2 size={16} />
        </button>
        <button type="button" className="ml-2 flex items-center gap-2 rounded-xl border border-line px-3 py-1.5 text-left">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted">Organization & Team</div>
            <div className="text-xs">Abhiram A (Personal)</div>
          </div>
          <ChevronDown size={14} className="text-muted" />
        </button>
      </div>
    </header>
  );
}
