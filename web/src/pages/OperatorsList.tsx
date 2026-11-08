import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "../components/Header";
import { api } from "../lib/api";
import type { Operator } from "../lib/types";

export function OperatorsList() {
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    void api.operators().then((payload) => setOperators(payload.operators));
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Header title="Operators" />
      <div className="grid grid-cols-1 gap-4 overflow-auto p-6 md:grid-cols-2 xl:grid-cols-3">
        {operators.length === 0 && <div className="text-sm text-muted">No operators saved yet.</div>}
        {operators.map((item) => (
          <Link
            key={item.id}
            to={`/operators/${item.id}`}
            className="rounded-2xl border border-line bg-card p-4 hover:border-accent/40"
          >
            <div className="mb-3 inline-flex rounded-full border border-ok/30 px-2 py-0.5 text-[11px] text-ok">
              {item.status}
            </div>
            <h2 className="text-base font-medium">{item.name}</h2>
            <p className="mt-2 text-xs text-muted">{relative(item.createdAt)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function relative(iso: string) {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.round(delta / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}
