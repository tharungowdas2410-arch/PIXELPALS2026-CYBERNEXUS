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
        "w-48 rounded-md border bg-[#0c1424] px-3 py-2.5 shadow-lg transition-all",
        data.highlighted ? "border-cyan-400 ring-1 ring-cyan-400/50" : "border-white/15 hover:border-white/30",
        data.node.level === "critical" && "border-rose-500/40"
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-cyan-400 !h-2.5 !w-2.5" />
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-white truncate max-w-[120px]">{data.node.label}</p>
        <RiskBadge level={data.node.level} />
      </div>
      {data.node.businessService && (
        <span className="mt-1 block text-[10px] text-cyan-300 font-mono truncate">
          {data.node.businessService}
        </span>
      )}
      <div className="mt-1.5 flex items-center justify-between border-t border-white/5 pt-1 text-[10px] text-slate-400 font-mono">
        <span>Impact: {formatInr(data.node.impactInr)}</span>
        <span>{(data.node.probability * 100).toFixed(0)}%</span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !h-2.5 !w-2.5" />
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
        position: { x: index * 200, y: 80 + (index % 2) * 20 },
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
          stroke: edge.blockedBy ? "#22c55e" : "#22d3ee",
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: edge.blockedBy ? "#22c55e" : "#22d3ee",
        },
        labelStyle: { fill: "#94a3b8", fontSize: 10 },
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
      onNodeClick={handleClick}
      onPaneClick={() => onSelect?.(null)}
      nodesConnectable={false}
      panOnScroll
      proOptions={{ hideAttribution: true }}
      minZoom={0.4}
      maxZoom={1.6}
      colorMode="dark"
      className="h-full w-full"
      style={{ width: "100%", height: "100%" }}
    >
      <Background color="#1e2a40" gap={18} />
      <Controls className="!bg-[#10182a] !border-white/10 !shadow-none" />
      {showMiniMap ? (
        <MiniMap
          nodeColor={(n) => {
            const node = path.nodes.find((item) => item.id === n.id);
            return node ? levelColor[node.level] : "#22d3ee";
          }}
          maskColor="rgba(7,11,20,0.7)"
          className="!bg-[#0c1322] !border-white/10"
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
        "h-[320px] w-full overflow-hidden rounded-md border border-white/10 bg-[#070b14]",
        className,
      )}
    >
      {mounted ? (
        <div className="h-full w-full">
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
