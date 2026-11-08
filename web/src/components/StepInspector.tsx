import { ChevronDown, ChevronUp, Copy, Expand, ArrowLeft } from "lucide-react";
import { serviceMeta } from "../lib/icons";
import type { Workflow } from "../lib/types";
import { useApp } from "../store/app";

export function StepInspector({ workflow }: { workflow: Workflow }) {
  const inspectedNodeId = useApp((s) => s.inspectedNodeId);
  const setInspected = useApp((s) => s.setInspected);
  const index = workflow.nodes.findIndex((node) => node.id === inspectedNodeId);
  const node = workflow.nodes[index];
  if (!node) return null;
  const meta = serviceMeta(node.service);

  return (
    <div className="flex h-full flex-col bg-canvas" role="region" aria-label={`Step inspector: ${node.title}`}>
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <button type="button" onClick={() => setInspected(null)} className="text-muted hover:text-ink" aria-label="Back to graph">
          <ArrowLeft size={16} />
        </button>
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold text-white"
          style={{ background: meta.bg }}
        >
          {meta.glyph}
        </div>
        <div className="flex-1 text-sm font-medium">{node.title}</div>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setInspected(workflow.nodes[index - 1]?.id ?? null)}
          className="text-muted disabled:opacity-30"
          aria-label="Previous"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          disabled={index === workflow.nodes.length - 1}
          onClick={() => setInspected(workflow.nodes[index + 1]?.id ?? null)}
          className="text-muted disabled:opacity-30"
          aria-label="Next step"
        >
          <ChevronDown size={16} />
        </button>
        <button
          type="button"
          className="text-muted"
          aria-label="Copy prompt"
          onClick={() => void navigator.clipboard.writeText(node.prompt)}
        >
          <Copy size={15} />
        </button>
        <button type="button" className="text-muted" aria-label="Expand">
          <Expand size={15} />
        </button>
      </div>
      <div className="border-b border-line px-4">
        <button type="button" className="border-b-2 border-ink py-2 text-sm">
          Prompt
        </button>
      </div>
      <div className="flex-1 overflow-auto px-5 py-4 text-sm leading-7 text-[#d5d5dc]">
        {node.prompt}
      </div>
    </div>
  );
}
