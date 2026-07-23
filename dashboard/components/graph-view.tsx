"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { conceptHref, paperHref } from "@/lib/links";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[70vh] items-center justify-center">
      <p className="kicker">assembling graph…</p>
    </div>
  ),
});

export interface GraphNode {
  id: string;
  type: "paper" | "concept";
  label: string;
  score?: number;
  published?: string;
  mentions?: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

// Theme constants (matches globals.css dark intelligence-briefing palette)
const AMBER = "#e0a43a"; // ~ oklch(0.78 0.16 75) — primary
const AMBER_DIM = "rgba(224, 164, 58, 0.28)";
const PAPER_INK = "#ded9cd"; // warm near-white
const PAPER_DIM = "rgba(222, 217, 205, 0.22)";
const LINK_COLOR = "rgba(222, 217, 205, 0.10)";
const LINK_HOT = "rgba(224, 164, 58, 0.45)";
const LABEL_INK = "rgba(237, 233, 224, 0.92)";
const LABEL_MUTED = "rgba(180, 174, 160, 0.85)";
const BG = "rgba(0,0,0,0)"; // transparent — panel supplies the surface

type FGNode = GraphNode & { x?: number; y?: number };
type FGLink = { source: string | FGNode; target: string | FGNode };

function endpointId(v: string | FGNode): string {
  return typeof v === "object" ? v.id : v;
}

function nodeRadius(n: GraphNode): number {
  if (n.type === "concept") return 3 + Math.sqrt(n.mentions ?? 0) * 2.2;
  return 2.5 + ((n.score ?? 0) / 10) * 2.5;
}

export function GraphView({
  nodes,
  links,
  linkedNodeCount,
}: {
  nodes: GraphNode[];
  links: GraphLink[];
  linkedNodeCount: number;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [showUnlinked, setShowUnlinked] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () =>
      setSize({ w: el.clientWidth, h: Math.max(480, window.innerHeight - 320) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => {
    const visible = showUnlinked
      ? nodes
      : nodes.filter((n) => n.type === "paper" || (n.mentions ?? 0) > 0);
    return {
      // fresh copies: the force engine mutates node objects
      nodes: visible.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    };
  }, [nodes, links, showUnlinked]);

  // adjacency + degree for hover highlighting and persistent labels
  const { neighbors, degree, maxDegree } = useMemo(() => {
    const neighbors = new Map<string, Set<string>>();
    const degree = new Map<string, number>();
    for (const l of links) {
      if (!neighbors.has(l.source)) neighbors.set(l.source, new Set());
      if (!neighbors.has(l.target)) neighbors.set(l.target, new Set());
      neighbors.get(l.source)!.add(l.target);
      neighbors.get(l.target)!.add(l.source);
      degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
      degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    }
    let maxDegree = 0;
    for (const d of degree.values()) maxDegree = Math.max(maxDegree, d);
    return { neighbors, degree, maxDegree };
  }, [links]);

  const labelThreshold = Math.max(3, Math.ceil(maxDegree * 0.5));

  const isDimmed = useCallback(
    (id: string) => {
      if (!hoverId) return false;
      if (id === hoverId) return false;
      return !(neighbors.get(hoverId)?.has(id) ?? false);
    },
    [hoverId, neighbors]
  );

  const paintNode = useCallback(
    (node: FGNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const r = nodeRadius(node);
      const dimmed = isDimmed(node.id);
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
      ctx.fillStyle =
        node.type === "concept"
          ? dimmed
            ? AMBER_DIM
            : AMBER
          : dimmed
            ? PAPER_DIM
            : PAPER_INK;
      ctx.fill();
      if (node.id === hoverId) {
        ctx.lineWidth = 1.5 / scale;
        ctx.strokeStyle = AMBER;
        ctx.stroke();
      }

      const hovered =
        hoverId !== null &&
        (node.id === hoverId || (neighbors.get(hoverId)?.has(node.id) ?? false));
      const persistent =
        (degree.get(node.id) ?? 0) >= labelThreshold && scale > 0.6;
      if (hovered || persistent) {
        const fontSize = Math.min(12 / scale, 5);
        ctx.font = `${node.type === "concept" ? "600 " : ""}${fontSize}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = hovered ? LABEL_INK : LABEL_MUTED;
        const label =
          node.label.length > 42 ? node.label.slice(0, 40) + "…" : node.label;
        ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + r + 2 / scale);
      }
    },
    [isDimmed, hoverId, neighbors, degree, labelThreshold]
  );

  const linkColor = useCallback(
    (l: FGLink) => {
      if (!hoverId) return LINK_COLOR;
      const s = endpointId(l.source);
      const t = endpointId(l.target);
      if (s === hoverId || t === hoverId) return LINK_HOT;
      return "rgba(222, 217, 205, 0.03)";
    },
    [hoverId]
  );

  const handleClick = useCallback(
    (node: FGNode) => {
      if (node.type === "paper") router.push(paperHref(node.id));
      else router.push(conceptHref(node.label));
    },
    [router]
  );

  const unlinkedCount = nodes.length - linkedNodeCount;

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: AMBER }}
              aria-hidden
            />
            concept
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: PAPER_INK }}
              aria-hidden
            />
            paper
          </span>
          <span className="kicker">
            {data.nodes.length} nodes · {data.links.length} edges
          </span>
        </div>
        {unlinkedCount > 0 && (
          <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] tracking-[0.12em] uppercase text-muted-foreground">
            <input
              type="checkbox"
              checked={showUnlinked}
              onChange={(e) => setShowUnlinked(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#e0a43a]"
            />
            show unlinked concepts ({unlinkedCount})
          </label>
        )}
      </div>
      <div ref={containerRef} className="relative overflow-hidden">
        {size && (
          <ForceGraph2D
            width={size.w}
            height={size.h}
            graphData={data}
            backgroundColor={BG}
            nodeId="id"
            nodeLabel=""
            nodeVal={(n) => nodeRadius(n as FGNode) ** 2}
            nodeCanvasObject={(n, ctx, scale) =>
              paintNode(n as FGNode, ctx, scale)
            }
            linkColor={(l) => linkColor(l as FGLink)}
            linkWidth={1}
            onNodeClick={(n) => handleClick(n as FGNode)}
            onNodeHover={(n) => setHoverId(n ? (n as FGNode).id : null)}
            cooldownTicks={120}
            warmupTicks={40}
          />
        )}
      </div>
    </section>
  );
}
