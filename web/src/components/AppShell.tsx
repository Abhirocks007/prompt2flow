import { useEffect } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { SearchOverlay } from "./SearchOverlay";
import { Sidebar } from "./Sidebar";
import { ToolsModal } from "./ToolsModal";
import { OperatorSavedModal } from "./OperatorSavedModal";
import { useApp } from "../store/app";

export function AppShell() {
  const [params, setParams] = useSearchParams();
  const setToolsOpen = useApp((s) => s.setToolsOpen);

  useEffect(() => {
    if (!params.get("connected") && !params.get("connect_error")) return;
    setToolsOpen(true);
    const next = new URLSearchParams(params);
    next.delete("connected");
    next.delete("connect_error");
    setParams(next, { replace: true });
  }, [params, setParams, setToolsOpen]);

  return (
    <div className="flex h-full bg-canvas">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
      <SearchOverlay />
      <ToolsModal />
      <OperatorSavedModal />
    </div>
  );
}
