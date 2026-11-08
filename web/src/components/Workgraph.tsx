import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ScanSearch } from "lucide-react";
import { serviceMeta } from "../lib/icons";
import type { Run, Workflow } from "../lib/types";
import { useApp } from "../store/app";

function StartNode() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-ok/50 bg-[#102016] text-[10px] text-ok">
      Start
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

function EndNode() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-danger/50 bg-[#201014] text-[10px] text-danger">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      End
    </div>
  );
}

function StepNode({ data }: { data: { title: string; description: string; service: string; status?: string; onInspect: () => void } }) {
  const meta = serviceMeta(data.service);
  return (
    <div className="w-[260px] rounded-2xl border border-line bg-[#141418] p-3 shadow-lg">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex items-start gap-2">
        <div
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
          style={{ background: meta.bg, color: meta.bg === "#ffffff" ? "#111" : "#fff" }}
        >
          {meta.glyph}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-medium">{data.title}</div>
            <button type="button" onClick={data.onInspect} className="text-muted hover:text-ink" aria-label={`Inspect ${data.title}`}>
              <ScanSearch size={14} />
            </button>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">{data.description}</p>
          {data.status === "completed" && (
            <span className="mt-2 inline-flex rounded-full border border-ok/30 px-2 py-0.5 text-[10px] text-ok">Completed</span>
          )}
          {data.status === "configuring" && (
            <span className="mt-2 inline-flex rounded-full border border-accent/30 px-2 py-0.5 text-[10px] text-accent">Configuring</span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes = { start: StartNode, end: EndNode, step: StepNode };

export function Workgraph({ workflow, run }: { workflow: Workflow | null; run: Run | null }) {
  const setInspected = useApp((s) => s.setInspected);
  const { fitView } = useReactFlow();

  const { nodes, edges } = useMemo(() => {
    if (!workflow) return { nodes: [] as Node[], edges: [] as Edge[] };
    const builtNodes: Node[] = [
      { id: "start", type: "start", position: { x: 110, y: 0 }, data: {}, draggable: false },
    ];
    const builtEdges: Edge[] = [];
    workflow.nodes.forEach((node, index) => {
      const status = run?.activities.find((item) => item.nodeId === node.id)?.status;
      builtNodes.push({
        id: node.id,
        type: "step",
        position: { x: 0, y: 70 + index * 130 },
        data: {
          title: node.title,
          description: node.description,
          service: node.service,
          status,
          onInspect: () => setInspected(node.id),
        },
      });
      const source = index === 0 ? "start" : workflow.nodes[index - 1].id;
      builtEdges.push({
        id: `${source}-${node.id}`,
        source,
        target: node.id,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#6b6b75" },
        style: { stroke: "#6b6b75" },
      });
    });
    const last = workflow.nodes.at(-1);
    builtNodes.push({
      id: "end",
      type: "end",
      position: { x: 114, y: 70 + workflow.nodes.length * 130 },
      data: {},
      draggable: false,
    });
    if (last) {
      builtEdges.push({
        id: `${last.id}-end`,
        source: last.id,
        target: "end",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#6b6b75" },
        style: { stroke: "#6b6b75" },
      });
    }
    return { nodes: builtNodes, edges: builtEdges };
  }, [workflow, run, setInspected]);

  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2 }), 50);
    return () => clearTimeout(t);
  }, [nodes, fitView]);

  return (
    <div className="h-full bg-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        panOnDrag
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#22222a" gap={24} />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  );
}
