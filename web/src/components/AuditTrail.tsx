import type { Run } from "../lib/types";

export function AuditTrail({ run, runs }: { run?: Run | null; runs?: Run[] }) {
  const list = (runs && runs.length ? runs : run ? [run] : []).filter(Boolean) as Run[];
  if (!list.length) {
    return <div className="p-8 text-sm text-muted">Audit Trail appears when a run starts.</div>;
  }

  return (
    <div className="space-y-8 overflow-auto p-5">
      {list.map((item) => (
        <RunBlock key={item.id} run={item} showHeader={list.length > 1} />
      ))}
    </div>
  );
}

function RunBlock({ run, showHeader }: { run: Run; showHeader: boolean }) {
  return (
    <section className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="text-sm font-medium">Run {fmt(run.startedAt)}</div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${statusClass(run.status)}`}>
            {labelFor(run.status)}
          </span>
        </div>
      )}
      {run.activities.map((activity) => (
        <div key={activity.id} className="rounded-2xl border border-line bg-card p-4">
          <div className="flex items-start gap-3">
            <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dot(activity.status)}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">{activity.title}</h3>
                {activity.status === "completed" && (
                  <span className="rounded-full border border-ok/30 px-2 py-0.5 text-[10px] text-ok">Completed</span>
                )}
                {activity.status === "configuring" && (
                  <span className="rounded-full border border-accent/30 px-2 py-0.5 text-[10px] text-accent">Configuring</span>
                )}
                {activity.status === "failed" && (
                  <span className="rounded-full border border-danger/30 px-2 py-0.5 text-[10px] text-danger">Failed</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">{activity.description}</p>
              {activity.startedAt && (
                <p className="mt-2 text-xs text-muted">Started at: {fmt(activity.startedAt)}</p>
              )}
              {activity.completedAt && (
                <p className="text-xs text-muted">Completed at: {fmt(activity.completedAt)}</p>
              )}
              {activity.outputs != null && (
                <details className="mt-3 rounded-lg border border-line bg-raised px-3 py-2 text-xs">
                  <summary className="cursor-pointer text-muted">Outputs</summary>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap text-[11px] text-ink">
                    {JSON.stringify(activity.outputs, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      ))}
      {run.audit
        .filter((event) => event.label.startsWith("Run stopped") || event.label.startsWith("Workflow"))
        .map((event) => (
          <div key={event.id} className="flex items-center gap-2 px-1 text-xs text-muted">
            <span className={`h-2 w-2 rounded-full ${event.status === "failed" ? "bg-danger" : "bg-ok"}`} />
            {event.label}
          </div>
        ))}
    </section>
  );
}

function labelFor(status: string) {
  if (status === "waiting_for_input") return "Waiting";
  return status.replaceAll("_", " ");
}

function statusClass(status: string) {
  if (status === "completed") return "border-ok/30 text-ok";
  if (status === "failed") return "border-danger/30 text-danger";
  if (status === "running" || status === "configuring") return "border-accent/30 text-accent";
  return "border-line text-muted";
}

function dot(status: string) {
  if (status === "completed") return "bg-ok";
  if (status === "failed") return "bg-danger";
  if (status === "configuring") return "bg-accent";
  return "bg-line";
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
