import type { ReactNode } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { PanelRight } from "lucide-react";
import { AuditTrail } from "./AuditTrail";
import { AutoAppForm } from "./AutoAppForm";
import { StepInspector } from "./StepInspector";
import { Workgraph } from "./Workgraph";
import { useApp } from "../store/app";

export function RightPanel({
  onSubmitInputs,
}: {
  onSubmitInputs: (inputs: Record<string, unknown>) => void;
}) {
  const chat = useApp((s) => s.chat);
  const run = useApp((s) => s.run);
  const rightTab = useApp((s) => s.rightTab);
  const setRightTab = useApp((s) => s.setRightTab);
  const inspectedNodeId = useApp((s) => s.inspectedNodeId);
  const waiting = useApp((s) => s.waitingForInput);
  const workflow = chat?.workflow ?? null;
  const showAudit = Boolean(run);

  return (
    <section className="flex h-full min-w-0 flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <div className="flex items-center gap-1 rounded-full bg-raised p-1 text-sm">
          <Tab active={rightTab === "workgraph"} onClick={() => setRightTab("workgraph")}>
            Workgraph
          </Tab>
          <Tab active={rightTab === "auto-app"} onClick={() => setRightTab("auto-app")}>
            Auto app
          </Tab>
          {showAudit && (
            <Tab active={rightTab === "audit"} onClick={() => setRightTab("audit")}>
              Audit Trail
            </Tab>
          )}
        </div>
        <div className="flex items-center gap-2">
          {waiting && (
            <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[11px] text-accent">Waiting for input</span>
          )}
          <PanelRight size={16} className="text-muted" />
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {rightTab === "workgraph" && inspectedNodeId && workflow ? (
          <StepInspector workflow={workflow} />
        ) : rightTab === "workgraph" ? (
          <ReactFlowProvider>
            <Workgraph workflow={workflow} run={run} />
          </ReactFlowProvider>
        ) : rightTab === "auto-app" ? (
          <AutoAppForm workflow={workflow} onSubmit={onSubmitInputs} />
        ) : (
          <AuditTrail run={run} />
        )}
      </div>
    </section>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 ${active ? "bg-accent text-[#2a2250]" : "text-muted"}`}
    >
      {children}
    </button>
  );
}
