import { FormEvent, useMemo, useState } from "react";
import type { Workflow } from "../lib/types";
import { useApp } from "../store/app";

export function AutoAppForm({
  workflow,
  onSubmit,
  forceEnabled = false,
  busy = false,
}: {
  workflow: Workflow | null;
  onSubmit: (inputs: Record<string, unknown>) => void;
  forceEnabled?: boolean;
  busy?: boolean;
}) {
  const waiting = useApp((s) => s.waitingForInput);
  const run = useApp((s) => s.run);
  const showSubmit = forceEnabled || waiting || run?.status === "waiting_for_input";
  const enabled = showSubmit && !busy;
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [retries, setRetries] = useState(false);

  const missing = useMemo(() => {
    if (!workflow) return [];
    return workflow.inputs.filter((input) => input.required && (values[input.id] === undefined || values[input.id] === ""));
  }, [workflow, values]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!enabled || missing.length) return;
    const payload: Record<string, unknown> = { ...values, auto_fix: retries };
    for (const input of workflow?.inputs ?? []) {
      if (input.type === "number" && payload[input.id] != null && payload[input.id] !== "") {
        payload[input.id] = Number(payload[input.id]);
      }
    }
    onSubmit(payload);
  }

  if (!workflow) {
    return <div className="p-8 text-sm text-muted">No Auto app until a workflow is planned.</div>;
  }

  return (
    <form onSubmit={submit} className="space-y-6 p-6">
      {workflow.inputs.map((input) => (
        <label key={input.id} className="block">
          <div className="mb-2 text-sm text-muted">
            {input.label} {input.required ? <span className="text-danger">*</span> : null} <span className="text-muted">?</span>
          </div>
          {input.type === "number" ? (
            <div className="flex items-center overflow-hidden rounded-lg border border-line bg-raised">
              <button
                type="button"
                disabled={!enabled}
                className="px-3 py-2 text-muted disabled:opacity-40"
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    [input.id]: Math.max(1, Number(current[input.id] || 0) - 1),
                  }))
                }
              >
                -
              </button>
              <input
                disabled={!enabled}
                type="number"
                className="w-full bg-transparent py-2 text-center outline-none disabled:opacity-50"
                value={values[input.id] === undefined ? "" : String(values[input.id])}
                onChange={(e) => setValues((current) => ({ ...current, [input.id]: e.target.value }))}
              />
              <button
                type="button"
                disabled={!enabled}
                className="px-3 py-2 text-muted disabled:opacity-40"
                onClick={() =>
                  setValues((current) => ({
                    ...current,
                    [input.id]: Number(current[input.id] || 0) + 1,
                  }))
                }
              >
                +
              </button>
            </div>
          ) : input.type === "checkbox" ? (
            <input
              type="checkbox"
              disabled={!enabled}
              checked={Boolean(values[input.id])}
              onChange={(e) => setValues((current) => ({ ...current, [input.id]: e.target.checked }))}
            />
          ) : (
            <input
              disabled={!enabled}
              className="w-full rounded-lg border border-line bg-raised px-3 py-2 outline-none disabled:opacity-50"
              value={String(values[input.id] ?? "")}
              onChange={(e) => setValues((current) => ({ ...current, [input.id]: e.target.value }))}
            />
          )}
        </label>
      ))}
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" disabled={!enabled} checked={retries} onChange={(e) => setRetries(e.target.checked)} />
        Allow automatic step retries (auto-fix)
      </label>
      {showSubmit && (
        <button
          type="submit"
          disabled={missing.length > 0 || busy}
          className="rounded-lg bg-accent-strong px-4 py-2 text-sm text-black disabled:opacity-40"
        >
          {busy ? "Running…" : "Submit"}
        </button>
      )}
    </form>
  );
}
