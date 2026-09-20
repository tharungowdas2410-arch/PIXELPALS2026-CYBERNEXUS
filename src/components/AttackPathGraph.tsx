"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  MarkerType,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RiskBadge } from "@/components/RiskBadge";
import type { AttackPath, AttackPathNode, RiskLevel } from "@/lib/types";
import { formatInr } from "@/lib/format";
import { cn } from "@/lib/utils";

const levelColor: Record<RiskLevel, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#3b82f6",
  low: "#94a3b8",
  protected: "#22c55e",
};

type PathGraphNode = Node<{ node: AttackPathNode; highlighted: boolean }, "path">;

function PathNode({ data }: NodeProps<PathGraphNode>) {
  return (
    <div
      className={cn(
        "w-48 rounded-md border bg-white px-3 py-2.5 shadow-sm transition-all text-slate-900",
        data.highlighted ? "border-blue-600 ring-2 ring-blue-600/20" : "border-[#E2E8F0] hover:border-slate-400",
        data.node.level === "critical" && "border-red-300 ring-1 ring-red-200"
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-blue-600 !h-2.5 !w-2.5" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{data.node.label}</p>
        <RiskBadge level={data.node.level} />
      </div>
      {data.node.businessService && (
        <span className="mt-1 block text-[10px] text-blue-600 font-mono font-medium truncate">
          {data.node.businessService}
        </span>
      )}
      <div className="mt-1.5 flex items-center justify-between border-t border-[#F1F5F9] pt-1 text-[10px] text-slate-500 font-mono">
        <span>Impact: {formatInr(data.node.impactInr)}</span>
        <span className="font-semibold text-slate-700">{(data.node.probability * 100).toFixed(0)}%</span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-blue-600 !h-2.5 !w-2.5" />
    </div>
  );
}

const nodeTypes = { path: PathNode };

function GraphCanvas({
  path,
  selectedId,
  onSelect,
  showMiniMap = false,
}: {
  path: AttackPath;
  selectedId?: string | null;
  onSelect?: (node: AttackPathNode | null) => void;
  showMiniMap?: boolean;
}) {
  const nodes: PathGraphNode[] = useMemo(
    () =>
      path.nodes.map((node, index) => ({
        id: node.id,
        type: "path" as const,
        position: { x: index * 270 + 40, y: 120 + (index % 2) * 40 },
        data: { node, highlighted: selectedId === node.id },
      })),
    [path.nodes, selectedId],
  );

  const edges: Edge[] = useMemo(
    () =>
      path.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: !edge.blockedBy,
        label: edge.blockedBy ? `Blocked: ${edge.blockedBy}` : edge.technique,
        style: {
          stroke: edge.blockedBy ? "#16a34a" : "#2563eb",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: edge.blockedBy ? "#16a34a" : "#2563eb",
        },
        labelStyle: { fill: "#475569", fontSize: 10, fontWeight: 500 },
      })),
    [path.edges],
  );

  const handleClick: NodeMouseHandler = (_event, node) => {
    const found = path.nodes.find((item) => item.id === node.id) ?? null;
    onSelect?.(found);
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      onNodeClick={handleClick}
      onPaneClick={() => onSelect?.(null)}
      nodesConnectable={false}
      panOnScroll
      proOptions={{ hideAttribution: true }}
      minZoom={0.4}
      maxZoom={1.6}
      colorMode="light"
      className="h-full w-full"
      style={{ width: "100%", height: "100%", minHeight: "460px", background: "#f8fafc" }}
    >
      <Background color="#cbd5e1" gap={20} />
      <Controls className="!bg-white !border-[#E2E8F0] !shadow-xs" />
      {showMiniMap ? (
        <MiniMap
          nodeColor={(n) => {
            const node = path.nodes.find((item) => item.id === n.id);
            return node ? levelColor[node.level] : "#2563eb";
          }}
          maskColor="rgba(241, 245, 249, 0.7)"
          className="!bg-white !border-[#E2E8F0]"
        />
      ) : null}
    </ReactFlow>
  );
}

export function AttackPathGraph({
  path,
  selectedId,
  onSelect,
  showMiniMap = false,
  className,
}: {
  path: AttackPath;
  selectedId?: string | null;
  onSelect?: (node: AttackPathNode | null) => void;
  showMiniMap?: boolean;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={cn(
        "h-[500px] w-full min-h-[460px] overflow-hidden rounded-md border border-[#E2E8F0] bg-[#F8FAFC] relative",
        className,
      )}
      style={{ height: "500px", width: "100%", minHeight: "460px" }}
    >
      {mounted ? (
        <div className="h-full w-full" style={{ height: "100%", width: "100%", minHeight: "460px" }}>
          <ReactFlowProvider>
            <GraphCanvas
              path={path}
              selectedId={selectedId}
              onSelect={onSelect}
              showMiniMap={showMiniMap}
            />
          </ReactFlowProvider>
        </div>
      ) : (
        <p className="grid h-full place-items-center text-xs text-slate-500">Loading attack path…</p>
      )}
      <p className="sr-only">
        Modeled path exposure {formatInr(path.potentialExposureInr)}. Illustrative model output.
      </p>
    </div>
  );
}
