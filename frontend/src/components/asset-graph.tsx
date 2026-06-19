import React, { useState, useEffect, useRef } from "react";
import { Globe, FileText, Layout, Terminal, Cpu, Database, Network } from "lucide-react";

export interface GraphNode {
  id: string;
  asset_id: string;
  label: string;
  meta: {
    asset_type?: string;
    asset_value?: string;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
}

interface AssetGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode?: (assetId: string) => void;
}

export default function AssetGraph({ nodes, edges, onSelectNode }: AssetGraphProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connections, setConnections] = useState<{ source: string; target: string; isHighlighted: boolean }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgLines, setSvgLines] = useState<{ d: string; isHighlighted: boolean; id: string }[]>([]);

  // Categorize nodes into columns
  const getColumnIndex = (type: string) => {
    switch (type) {
      case "domain":
      case "subdomain":
        return 0;
      case "page":
      case "javascript":
        return 1;
      case "form":
        return 2;
      case "endpoint":
      case "parameter":
        return 3;
      case "technology":
        return 4;
      default:
        return 1;
    }
  };

  const columns = [
    { title: "DOMAINS", type: "domain", nodes: [] as GraphNode[] },
    { title: "PAGES", type: "page", nodes: [] as GraphNode[] },
    { title: "FORMS", type: "form", nodes: [] as GraphNode[] },
    { title: "ENDPOINTS", type: "endpoint", nodes: [] as GraphNode[] },
    { title: "TECHNOLOGIES", type: "technology", nodes: [] as GraphNode[] },
  ];

  nodes.forEach((node) => {
    const type = node.meta.asset_type || "page";
    const colIdx = getColumnIndex(type);
    columns[colIdx].nodes.push(node);
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "domain":
      case "subdomain":
        return <Globe className="w-3.5 h-3.5 text-cyber-green" />;
      case "page":
        return <Layout className="w-3.5 h-3.5 text-cyber-cyan" />;
      case "javascript":
        return <FileText className="w-3.5 h-3.5 text-purple-400" />;
      case "form":
        return <Database className="w-3.5 h-3.5 text-yellow-400" />;
      case "endpoint":
        return <Terminal className="w-3.5 h-3.5 text-cyber-cyan" />;
      case "parameter":
        return <Database className="w-3.5 h-3.5 text-cyber-amber" />;
      case "technology":
        return <Cpu className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Globe className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const getNodeColor = (type: string, isHovered: boolean, isSelected: boolean, isRelated: boolean) => {
    if (isHovered || isSelected) {
      return "border-[#00FF88] text-[#00FF88] bg-[#00FF88]/10 shadow-[0_0_10px_rgba(0,255,136,0.15)]";
    }
    if (isRelated) {
      return "border-[#00E5FF] text-[#00E5FF] bg-[#00E5FF]/5 shadow-[0_0_8px_rgba(0,229,255,0.1)]";
    }

    switch (type) {
      case "domain":
      case "subdomain":
        return "border-cyber-green/45 text-cyber-green bg-[#131A1A] hover:border-cyber-green";
      case "page":
      case "javascript":
        return "border-cyber-cyan/45 text-cyber-cyan bg-[#131A1A] hover:border-cyber-cyan";
      case "form":
        return "border-yellow-500/40 text-yellow-500 bg-[#131A1A] hover:border-yellow-500";
      case "technology":
        return "border-purple-500/45 text-purple-400 bg-[#131A1A] hover:border-purple-500";
      default:
        return "border-cyber-cyan/45 text-cyber-cyan bg-[#131A1A] hover:border-cyber-cyan";
    }
  };

  // Find related nodes for highlighting
  const activeNodeId = hoveredNodeId || selectedNodeId;
  const relatedNodeIds = new Set<string>();

  if (activeNodeId) {
    // Upstream & downstream traversal
    const queue = [activeNodeId];
    relatedNodeIds.add(activeNodeId);

    // Run simple BFS/DFS through edges
    let iterations = 0;
    while (queue.length > 0 && iterations < 100) {
      iterations++;
      const current = queue.shift()!;
      edges.forEach((edge) => {
        if (edge.source === current && !relatedNodeIds.has(edge.target)) {
          relatedNodeIds.add(edge.target);
          queue.push(edge.target);
        }
        if (edge.target === current && !relatedNodeIds.has(edge.source)) {
          relatedNodeIds.add(edge.source);
          queue.push(edge.source);
        }
      });
    }
  }

  // Draw curves on mount and when positions change
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const computeLines = () => {
      const containerRect = containerRef.current!.getBoundingClientRect();
      const lines: { d: string; isHighlighted: boolean; id: string }[] = [];

      edges.forEach((edge) => {
        const sourceEl = document.getElementById(`node-${edge.source}`);
        const targetEl = document.getElementById(`node-${edge.target}`);

        if (sourceEl && targetEl) {
          const sRect = sourceEl.getBoundingClientRect();
          const tRect = targetEl.getBoundingClientRect();

          // Calculate connection ports
          const x1 = sRect.right - containerRect.left;
          const y1 = sRect.top + sRect.height / 2 - containerRect.top;

          const x2 = tRect.left - containerRect.left;
          const y2 = tRect.top + tRect.height / 2 - containerRect.top;

          // Drawing cubic bezier curves
          const controlOffset = Math.min(100, Math.abs(x2 - x1) * 0.5);
          const d = `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;

          const isHighlighted =
            activeNodeId !== null &&
            relatedNodeIds.has(edge.source) &&
            relatedNodeIds.has(edge.target);

          lines.push({ d, isHighlighted, id: edge.id });
        }
      });

      setSvgLines(lines);
    };

    // Calculate initially and on resize
    computeLines();
    const resizeObserver = new ResizeObserver(() => computeLines());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Schedule a small delay to make sure elements are positioned correctly
    const timer = setTimeout(computeLines, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, [nodes, edges, hoveredNodeId, selectedNodeId]);

  return (
    <div className="bg-cyber-dark border border-cyber-gray rounded p-4 flex flex-col h-[520px] shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] relative select-none">
      
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-cyber-gray pb-2 mb-4">
        <span className="text-[10px] text-gray-500 tracking-widest uppercase flex items-center gap-1.5">
          <Network className="w-3.5 h-3.5 text-cyber-green animate-pulse" /> ATTACK SURFACE TOPOLOGY
        </span>
        <span className="text-[9px] text-[#00E5FF] font-mono">
          DOMAINS ➔ PAGES ➔ FORMS ➔ ENDPOINTS ➔ TECHS
        </span>
      </div>

      {/* Columns Container */}
      <div
        ref={containerRef}
        className="flex-grow flex gap-4 overflow-x-auto relative z-20 pb-2"
        style={{ minWidth: "850px" }}
      >
        {/* SVG Drawing Canvas underneath content */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <linearGradient id="glow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00FF88" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="dim-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1C2331" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#1C2331" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          
          {/* Base inactive lines */}
          {svgLines
            .filter((l) => !l.isHighlighted)
            .map((line) => (
              <path
                key={`dim-${line.id}`}
                d={line.d}
                fill="none"
                stroke="url(#dim-grad)"
                strokeWidth={1}
              />
            ))}

          {/* Glowing active lines */}
          {svgLines
            .filter((l) => l.isHighlighted)
            .map((line) => (
              <path
                key={`glow-${line.id}`}
                d={line.d}
                fill="none"
                stroke="url(#glow-grad)"
                strokeWidth={2}
                className="animate-pulse"
                style={{
                  filter: "drop-shadow(0px 0px 3px rgba(0, 229, 255, 0.4))",
                }}
              />
            ))}
        </svg>

        {/* Column Lists */}
        {columns.map((col, colIdx) => (
          <div key={col.title} className="flex-1 flex flex-col min-w-[150px] relative z-10">
            {/* Column Header */}
            <div className="text-[9px] font-bold text-gray-500 tracking-widest border-b border-cyber-gray/40 pb-1.5 mb-3 flex items-center justify-between">
              <span>{col.title}</span>
              <span className="text-cyber-green bg-cyber-green/5 border border-cyber-green/10 px-1 py-0.2 rounded-sm text-[8px]">
                {col.nodes.length}
              </span>
            </div>

            {/* Nodes Stack */}
            <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {col.nodes.length === 0 ? (
                <div className="h-12 border border-dashed border-cyber-gray/30 rounded flex items-center justify-center text-[9px] text-gray-600 italic">
                  empty
                </div>
              ) : (
                col.nodes.map((node) => {
                  const nodeType = node.meta.asset_type || "page";
                  const isHovered = hoveredNodeId === node.id;
                  const isSelected = selectedNodeId === node.id;
                  const isRelated = relatedNodeIds.has(node.id);

                  return (
                    <div
                      key={node.id}
                      id={`node-${node.id}`}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        if (onSelectNode) onSelectNode(node.asset_id);
                      }}
                      className={`p-2 border rounded cursor-pointer transition-all duration-150 relative select-none ${getNodeColor(
                        nodeType,
                        isHovered,
                        isSelected,
                        isRelated
                      )}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {getIcon(nodeType)}
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-[9px] block truncate tracking-wide">
                            {node.meta.asset_value || node.label.split(": ").slice(1).join(": ")}
                          </span>
                          <span className="text-[7px] text-gray-500 uppercase tracking-widest block font-mono mt-0.5">
                            {nodeType}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between border-t border-cyber-gray/30 pt-2.5 mt-3 select-none text-[8px] text-gray-500">
        <span>Click node to inspect metadata & connections. Hover to highlight flow.</span>
        <div className="flex gap-2.5">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyber-green" /> DOMAIN</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan" /> PAGE</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> FORM</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> TECH</span>
        </div>
      </div>

    </div>
  );
}
