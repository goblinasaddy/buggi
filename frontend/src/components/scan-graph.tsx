import React from "react";
import { ShieldAlert, Globe, Link2, KeyRound } from "lucide-react";

export interface GraphNode {
  id: string;
  type: "domain" | "url" | "parameter" | "api";
  label: string;
  url?: string;
  method?: string;
  metadata?: any;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface ScanGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function ScanGraph({ nodes, edges }: ScanGraphProps) {
  // Simple styling helper based on node types
  const getNodeColor = (type: string) => {
    switch (type) {
      case "domain":
        return "border-cyber-green text-cyber-green bg-cyber-green/5";
      case "url":
        return "border-cyber-cyan text-cyber-cyan bg-cyber-cyan/5";
      case "parameter":
        return "border-cyber-amber text-cyber-amber bg-cyber-amber/5";
      default:
        return "border-purple-500 text-purple-400 bg-purple-500/5";
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "domain":
        return <Globe className="w-3.5 h-3.5" />;
      case "url":
        return <Link2 className="w-3.5 h-3.5" />;
      case "parameter":
        return <KeyRound className="w-3.5 h-3.5" />;
      default:
        return <ShieldAlert className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="bg-cyber-dark border border-cyber-gray rounded p-4 flex flex-col justify-between h-[400px] shadow-[inset_0_0_12px_rgba(0,0,0,0.8)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyber-gray pb-2 mb-4 select-none">
        <span className="text-[10px] text-gray-500 tracking-widest uppercase">ATTACK_SURFACE_GRAPH // VISUALIZER</span>
        <span className="text-[10px] text-cyber-cyan font-mono">
          NODES: {nodes.length} | EDGES: {edges.length}
        </span>
      </div>

      {/* Main visualization grid */}
      <div className="flex-grow overflow-y-auto pr-1">
        {nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600 italic select-none text-xs">
            Awaiting recon activity to populate network graph topology...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[9px] border-b border-cyber-gray/20 pb-2 mb-2 select-none">
              <span className="flex items-center gap-1 text-cyber-green">
                <Globe className="w-3 h-3" /> DOMAIN/HOST
              </span>
              <span className="flex items-center gap-1 text-cyber-cyan">
                <Link2 className="w-3 h-3" /> URL ENDPOINT
              </span>
              <span className="flex items-center gap-1 text-cyber-amber">
                <KeyRound className="w-3 h-3" /> PARAMETER
              </span>
            </div>

            {/* Render Nodes as structural listing mimicking network hierarchy */}
            <div className="space-y-2.5">
              {nodes.map((node) => {
                // Find parent edge
                const parentEdge = edges.find(e => e.target === node.id);
                const parentNode = parentEdge ? nodes.find(n => n.id === parentEdge.source) : null;

                return (
                  <div
                    key={node.id}
                    className={`p-2.5 rounded border flex items-center justify-between gap-3 text-[11px] transition-all hover:translate-x-1 ${getNodeColor(
                      node.type
                    )}`}
                  >
                    <div className="flex items-center gap-2">
                      {getNodeIcon(node.type)}
                      <div>
                        <span className="font-bold tracking-wider">{node.label}</span>
                        {node.url && (
                          <div className="text-[9px] text-gray-500 truncate max-w-sm mt-0.5">
                            {node.url}
                          </div>
                        )}
                      </div>
                    </div>

                    {parentNode && (
                      <span className="text-[9px] bg-cyber-gray border border-cyber-gray/40 text-gray-400 px-1.5 py-0.5 rounded font-mono uppercase">
                        linked to: {parentNode.label.split(" ")[0]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
