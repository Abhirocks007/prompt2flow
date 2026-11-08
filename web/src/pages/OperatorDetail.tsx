import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import { AuditTrail } from "../components/AuditTrail";
import { AutoAppForm } from "../components/AutoAppForm";
import { Workgraph } from "../components/Workgraph";
import { api, runOperator } from "../lib/api";
import type { Operator, Run } from "../lib/types";

type Tab = "workgraph" | "auto-app" | "audit" | "schedule" | "policy";

export function OperatorDetail() {
  const { id } = useParams();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [tab, setTab] = useState<Tab>("workgraph");
  const [liveRun, setLiveRun] = useState<Run | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void api.operator(id).then(setOperator);
  }, [id]);

  const runs = useMemo(() => {
    const history = operator?.runs ?? [];
    if (!liveRun) return history;
    if (history.some((item) => item.id === liveRun.id)) {
      return history.map((item) => (item.id === liveRun.id ? liveRun : item));
    }
    return [liveRun, ...history];
  }, [operator?.runs, liveRun]);

  if (!operator) {
    return <div className="p-8 text-sm text-muted">Loading operator…</div>;
  }

  const current = operator;
  const onSubmit = async (inputs: Record<string, unknown>) => {
    setError(null);
    setRunning(true);
    setStatus("Starting workflow…");
    setTab("audit");
    try {
      await runOperator(current.id, inputs, {
        onRun: (run) => {
          setLiveRun(run);
          setOperator((prev) =>
            prev ? { ...prev, latestRun: run, latestRunId: run.id } : prev,
          );
        },
        onNotification: (content) => setStatus(content),
      });
      const next = await api.operator(current.id);
      setOperator(next);
      setLiveRun(next.latestRun ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run workflow");
    } finally {
      setRunning(false);
      setStatus(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 items-center gap-3 border-b border-line px-4">
        <Link to="/operators" className="text-muted" aria-label="Back">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="flex items-center gap-1 text-[15px] font-medium">
          {operator.name} <ChevronDown size={14} className="text-muted" />
        </h1>
        <div className="ml-6 flex items-center gap-1 rounded-full bg-raised p-1 text-sm">
          {(["workgraph", "auto-app", "audit", "schedule", "policy"] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-full px-3 py-1 capitalize ${tab === item ? "bg-accent text-[#2a2250]" : "text-muted"}`}
            >
              {item === "auto-app" ? "Auto app" : item === "audit" ? "Audit Trail" : item}
            </button>
          ))}
        </div>
        {status && <div className="ml-auto text-xs text-accent">{status}</div>}
      </header>
      <div className="min-h-0 flex-1">
        {tab === "workgraph" && (
          <ReactFlowProvider>
            <Workgraph workflow={operator.workflow} run={liveRun ?? operator.latestRun ?? null} />
          </ReactFlowProvider>
        )}
        {tab === "auto-app" && (
          <div>
            <div className="px-6 pt-4 text-sm text-muted">Checking required integrations</div>
            {error && <div className="px-6 pt-2 text-sm text-danger">{error}</div>}
            <AutoAppForm workflow={operator.workflow} onSubmit={onSubmit} forceEnabled busy={running} />
          </div>
        )}
        {tab === "audit" && <AuditTrail run={liveRun ?? operator.latestRun ?? null} runs={runs} />}
        {tab === "schedule" && (
          <div className="p-8 text-sm text-muted">No schedule configured for this workflow.</div>
        )}
        {tab === "policy" && (
          <div className="p-8 text-sm text-muted">Policies linked to this workflow's steps… none linked yet.</div>
        )}
      </div>
    </div>
  );
}
