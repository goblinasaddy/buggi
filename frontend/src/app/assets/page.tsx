"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import AssetGraph, { GraphNode, GraphEdge } from "@/components/asset-graph";
import { 
  Database, Search, Filter, ArrowUpDown, Clock, Calendar, Info, 
  ChevronRight, X, Globe, Layout, Terminal, FileText, Cpu, Eye, Network, List
} from "lucide-react";

export default function AssetsPage() {
  const [scans, setScans] = useState<any[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>("");
  
  // Loaded assets data
  const [assets, setAssets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter & Sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState<string>("domains");

  // Visual layout toggles
  const [viewMode, setViewMode] = useState<"list" | "graph">("list");
  
  // Asset drawer details state
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load scans on mount
  useEffect(() => {
    const fetchScans = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/scans/");
        const data = await res.json();
        setScans(data);
        if (data.length > 0) {
          // Select the latest scan automatically
          setSelectedScanId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch scans:", err);
      }
    };
    fetchScans();
  }, []);

  // Fetch asset details when scan selection changes
  useEffect(() => {
    if (!selectedScanId) return;

    const fetchScanAssets = async () => {
      setLoading(true);
      try {
        // Fetch all assets
        const assetsRes = await fetch(`http://localhost:8000/api/assets/?scan_id=${selectedScanId}`);
        const assetsData = await assetsRes.json();
        setAssets(assetsData);

        // Fetch summary counts
        const summaryRes = await fetch(`http://localhost:8000/api/assets/${selectedScanId}/summary`);
        const summaryData = await summaryRes.json();
        setSummary(summaryData);

        // Fetch graph nodes & edges
        const graphRes = await fetch(`http://localhost:8000/api/assets/${selectedScanId}/graph/data`);
        const graphData = await graphRes.json();
        setGraphNodes(graphData.nodes);
        setGraphEdges(graphData.edges);
      } catch (err) {
        console.error("Failed to load assets for scan:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchScanAssets();
    // Poll updates every 6 seconds to update live assets
    const interval = setInterval(fetchScanAssets, 6000);
    return () => clearInterval(interval);
  }, [selectedScanId]);

  // Handle active tab nodes mapping
  const getTabAssetTypes = (tab: string): string[] => {
    switch (tab) {
      case "domains": return ["domain", "subdomain"];
      case "pages": return ["page"];
      case "endpoints": return ["endpoint"];
      case "forms": return ["form"];
      case "javascript": return ["javascript"];
      case "technologies": return ["technology"];
      default: return [];
    }
  };

  // Filter and sort assets
  const filteredAssets = assets
    .filter((asset) => {
      // Filter by Tab Type
      const targetTypes = getTabAssetTypes(activeTab);
      if (!targetTypes.includes(asset.asset_type)) return false;

      // Filter by Search Query
      if (searchQuery && !asset.asset_value.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by Source Provider
      if (selectedSource && asset.source !== selectedSource) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  // Extract unique sources for filtering dropdown
  const uniqueSources = Array.from(new Set(assets.map((a) => a.source).filter(Boolean)));

  // Find relationships for selected asset
  const getAssetRelationships = (assetId: string) => {
    if (!selectedAsset) return [];

    // Find the graph node corresponding to this asset
    const node = graphNodes.find((n) => n.asset_id === assetId);
    if (!node) return [];

    // Find edges where this node is source or target
    const connectedEdges = graphEdges.filter(
      (e) => e.source === node.id || e.target === node.id
    );

    return connectedEdges.map((edge) => {
      const isOutgoing = edge.source === node.id;
      const targetNodeId = isOutgoing ? edge.target : edge.source;
      const targetNode = graphNodes.find((n) => n.id === targetNodeId);
      const targetAsset = assets.find((a) => a.id === targetNode?.asset_id);

      return {
        edgeId: edge.id,
        relationship: edge.relationship,
        direction: isOutgoing ? "outgoing" : "incoming",
        nodeLabel: targetNode?.label || "Unknown Node",
        asset: targetAsset,
      };
    });
  };

  const relationships = selectedAsset ? getAssetRelationships(selectedAsset.id) : [];

  const handleOpenAssetDetail = (asset: any) => {
    setSelectedAsset(asset);
    setIsDrawerOpen(true);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "domain":
      case "subdomain":
        return <Globe className="w-4 h-4 text-cyber-green" />;
      case "page":
        return <Layout className="w-4 h-4 text-cyber-cyan" />;
      case "form":
        return <Database className="w-4 h-4 text-yellow-400" />;
      case "endpoint":
        return <Terminal className="w-4 h-4 text-cyber-cyan" />;
      case "javascript":
        return <FileText className="w-4 h-4 text-purple-400" />;
      case "technology":
        return <Cpu className="w-4 h-4 text-purple-400" />;
      default:
        return <Database className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSourceLabel = (src: string) => {
    if (!src) return "N/A";
    return src.replace("Provider", "").replace("Discovery", "");
  };

  const activeScans = scans.filter((s: any) => s.status === "running" || s.status === "pending");

  return (
    <div className="flex min-h-screen bg-cyber-black text-foreground font-mono">
      <Sidebar statusText={activeScans.length > 0 ? "SCANNING" : "STANDBY"} activeScanCount={activeScans.length} />

      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto max-h-screen relative">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between border-b border-cyber-gray pb-4 select-none">
          <div>
            <h1 className="text-xl font-bold tracking-widest text-cyber-green">ASSET INTELLIGENCE MANAGER</h1>
            <p className="text-xs text-gray-500 mt-1">MODULE: RECON_DATABASE // ALL_DISCOVERED: {assets.length}</p>
          </div>

          {/* Scan selection selector */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-500 font-bold tracking-widest">ACTIVE SCAN TARGET:</span>
            <select
              value={selectedScanId}
              onChange={(e) => setSelectedScanId(e.target.value)}
              className="bg-cyber-dark border border-cyber-gray text-gray-300 text-xs rounded p-2 outline-none font-mono focus:border-cyber-green"
            >
              {scans.length === 0 ? (
                <option value="">NO TARGET SCANS</option>
              ) : (
                scans.map((s) => (
                  <option key={s.id} value={s.id}>{s.target_url}</option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Top Row Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 select-none">
          {[
            { label: "Total Assets", val: summary?.total_assets || 0, color: "text-[#00FF88] border-cyber-green/30" },
            { label: "Domains", val: (summary?.by_type?.domain || 0) + (summary?.by_type?.subdomain || 0), color: "text-[#00E5FF] border-cyber-cyan/30" },
            { label: "Pages", val: summary?.by_type?.page || 0, color: "text-purple-400 border-purple-500/30" },
            { label: "Endpoints", val: summary?.by_type?.endpoint || 0, color: "text-cyber-cyan border-cyber-cyan/30" },
            { label: "Technologies", val: summary?.by_type?.technology || 0, color: "text-yellow-500 border-yellow-500/30" }
          ].map((card) => (
            <div 
              key={card.label} 
              className={`bg-cyber-dark border rounded-md p-4 flex flex-col justify-between h-20 shadow-[0_0_10px_rgba(0,0,0,0.5)] border-l-4 border-l-cyber-green`}
              style={{ borderColor: card.color.split(" ")[1]?.split("/")[0] }}
            >
              <span className="text-[9px] text-gray-500 tracking-wider uppercase font-semibold">{card.label}</span>
              <span className={`text-2xl font-black ${card.color.split(" ")[0]} animate-pulse-slow`}>{card.val}</span>
            </div>
          ))}
        </div>

        {/* Layout Control Tab Area */}
        <div className="flex items-center justify-between border-b border-cyber-gray/40 pb-2 select-none">
          <div className="flex gap-2">
            {[
              { id: "domains", label: "DOMAINS" },
              { id: "pages", label: "PAGES" },
              { id: "endpoints", label: "ENDPOINTS" },
              { id: "forms", label: "FORMS" },
              { id: "javascript", label: "JAVASCRIPT" },
              { id: "technologies", label: "TECHNOLOGIES" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setViewMode("list");
                }}
                className={`px-3 py-1.5 border rounded-sm text-[10px] tracking-widest font-black transition-all ${
                  activeTab === tab.id && viewMode === "list"
                    ? "bg-cyber-green/10 border-cyber-green text-cyber-green shadow-[0_0_10px_rgba(0,255,102,0.1)]"
                    : "bg-cyber-dark border-cyber-gray text-gray-500 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Toggle between Card List and Graph view */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 border rounded-sm transition-all ${
                viewMode === "list"
                  ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan"
                  : "bg-cyber-dark border-cyber-gray text-gray-500 hover:text-white"
              }`}
              title="Card List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`p-2 border rounded-sm transition-all ${
                viewMode === "graph"
                  ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-[0_0_10px_rgba(0,229,255,0.15)]"
                  : "bg-cyber-dark border-cyber-gray text-gray-500 hover:text-white"
              }`}
              title="Graph View Topology"
            >
              <Network className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-xs text-gray-500 italic select-none">
            Querying active scan asset databases...
          </div>
        ) : viewMode === "graph" ? (
          /* Graph visualization panel */
          <div className="flex-grow">
            <AssetGraph 
              nodes={graphNodes} 
              edges={graphEdges} 
              onSelectNode={(assetId) => {
                const asset = assets.find((a) => a.id === assetId);
                if (asset) handleOpenAssetDetail(asset);
              }}
            />
          </div>
        ) : (
          /* List Card view with Search / Sort Toolbar */
          <div className="space-y-4 flex-grow flex flex-col justify-between">
            {/* Search & Sort & Filter Bar */}
            <div className="bg-cyber-dark border border-cyber-gray p-3 rounded flex flex-wrap gap-4 items-center justify-between select-none">
              <div className="flex items-center gap-3 bg-cyber-black border border-cyber-gray rounded px-2.5 py-1.5 focus-within:border-cyber-cyan w-full max-w-sm">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-xs text-gray-300 placeholder-gray-600 w-full"
                />
              </div>

              <div className="flex items-center gap-4 text-xs">
                {/* Source filtering */}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-gray-500 text-[10px] uppercase font-bold">SOURCE:</span>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="bg-cyber-black border border-cyber-gray text-gray-300 rounded p-1.5 outline-none font-mono"
                  >
                    <option value="">ALL SOURCES</option>
                    {uniqueSources.map((src) => (
                      <option key={src} value={src}>{getSourceLabel(src)}</option>
                    ))}
                  </select>
                </div>

                {/* Sort Order */}
                <button
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                  className="flex items-center gap-1 bg-cyber-black border border-cyber-gray hover:border-gray-500 text-gray-400 hover:text-white px-2.5 py-1.5 rounded"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">SORT: {sortOrder.toUpperCase()}</span>
                </button>
              </div>
            </div>

            {/* Assets Grid List */}
            {filteredAssets.length === 0 ? (
              <div className="h-48 border border-dashed border-cyber-gray rounded flex items-center justify-center text-xs text-gray-600 italic select-none">
                No discovered assets match the active filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssets.map((asset) => (
                  <div
                    key={asset.id}
                    onClick={() => handleOpenAssetDetail(asset)}
                    className="bg-cyber-dark border border-cyber-gray rounded p-4 flex flex-col justify-between gap-3 cursor-pointer hover:border-cyber-green transition-all duration-150 hover:translate-x-0.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getIcon(asset.asset_type)}
                        <span className="text-[8px] bg-cyber-gray border border-cyber-gray/50 text-gray-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">
                          {asset.asset_type}
                        </span>
                      </div>
                      <span className="text-[8px] text-gray-500">
                        {new Date(asset.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-200 truncate tracking-wide">
                        {asset.asset_value}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[8px] border-t border-cyber-gray/30 pt-2.5 mt-1 text-gray-500 select-none">
                      <span>SRC: <span className="font-bold text-gray-400">{getSourceLabel(asset.source)}</span></span>
                      <span>STATUS: <span className="font-bold text-cyber-green">ACTIVE</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            ASSET DETAIL DRAWER (SLIDES OUT FROM RIGHT)
            ======================================================== */}
        {isDrawerOpen && selectedAsset && (
          <div className="fixed inset-0 bg-[#05070a]/75 backdrop-blur-sm z-50 animate-fade-in flex justify-end select-none">
            <div className="w-full max-w-md bg-cyber-dark border-l border-cyber-gray h-full p-5 flex flex-col justify-between shadow-[-5px_0_25px_rgba(0,0,0,0.5)] relative">
              
              <div className="flex flex-col gap-4 flex-grow overflow-y-auto pr-1">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-cyber-gray pb-3">
                  <span className="text-xs font-bold tracking-widest text-cyber-green flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> ASSET TELEMETRY RECORD
                  </span>
                  <button 
                    onClick={() => setIsDrawerOpen(false)} 
                    className="text-gray-500 hover:text-white p-1 hover:bg-cyber-gray/30 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Asset Info */}
                <div className="space-y-4">
                  <div className="bg-cyber-black p-3.5 border border-cyber-gray/50 rounded flex items-center gap-3">
                    {getIcon(selectedAsset.asset_type)}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">VALUE / LOCATION</span>
                      <span className="text-xs font-black text-gray-200 block truncate tracking-wide">{selectedAsset.asset_value}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-cyber-black/40 border border-cyber-gray/30 p-2.5 rounded">
                      <span className="text-[8px] text-gray-500 uppercase tracking-wider block font-bold mb-1">ASSET TYPE</span>
                      <span className="font-semibold text-gray-300 uppercase">{selectedAsset.asset_type}</span>
                    </div>
                    <div className="bg-cyber-black/40 border border-cyber-gray/30 p-2.5 rounded">
                      <span className="text-[8px] text-gray-500 uppercase tracking-wider block font-bold mb-1">DISCOVERY SOURCE</span>
                      <span className="font-semibold text-gray-300 truncate block">{getSourceLabel(selectedAsset.source)}</span>
                    </div>
                  </div>

                  {/* Created Time */}
                  <div className="bg-cyber-black/40 border border-cyber-gray/30 p-2.5 rounded text-xs flex items-center justify-between">
                    <span className="text-[8px] text-gray-500 uppercase font-bold tracking-wider">Discovered At</span>
                    <span className="font-mono text-[10px] text-gray-400">{new Date(selectedAsset.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Metadata JSON display */}
                <div className="space-y-2 text-xs">
                  <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block border-b border-cyber-gray/30 pb-1 mt-2">METADATA FIELDS</span>
                  
                  {Object.keys(selectedAsset.meta || {}).length === 0 ? (
                    <div className="text-gray-600 italic py-2 text-[10px]">No structured metadata fields parsed for this asset.</div>
                  ) : (
                    <div className="border border-cyber-gray rounded overflow-hidden">
                      <table className="w-full text-left text-[10px] border-collapse bg-cyber-black/20">
                        <thead>
                          <tr className="border-b border-cyber-gray bg-cyber-black/50 text-gray-500 font-bold uppercase">
                            <th className="p-2 w-1/3">Key</th>
                            <th className="p-2">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(selectedAsset.meta || {}).map(([k, v]) => (
                            <tr key={k} className="border-b border-cyber-gray/20 hover:bg-cyber-gray/10">
                              <td className="p-2 font-bold text-gray-400 break-all">{k}</td>
                              <td className="p-2 text-cyber-cyan break-all">
                                {typeof v === "object" ? JSON.stringify(v) : String(v)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Relationships & Connections Section */}
                <div className="space-y-2 text-xs flex-grow">
                  <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block border-b border-cyber-gray/30 pb-1 mt-2">GRAPH RELATIONSHIPS</span>
                  
                  {relationships.length === 0 ? (
                    <div className="text-gray-600 italic py-2 text-[10px]">No active links mapped in attack surface topology.</div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {relationships.map((rel, idx) => (
                        <div 
                          key={rel.edgeId || idx}
                          onClick={() => {
                            if (rel.asset) handleOpenAssetDetail(rel.asset);
                          }}
                          className={`p-2.5 border rounded flex items-center justify-between cursor-pointer transition-all ${
                            rel.asset
                              ? "bg-cyber-black/60 border-cyber-cyan/35 text-gray-300 hover:border-cyber-cyan hover:text-white"
                              : "bg-cyber-black/10 border-cyber-gray/30 text-gray-600"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-[7px] text-[#00E5FF] uppercase font-bold tracking-widest block mb-0.5">
                              {rel.relationship.toUpperCase()} ({rel.direction})
                            </span>
                            <span className="text-[10px] block truncate font-bold">{rel.nodeLabel.split(": ").slice(1).join(": ")}</span>
                          </div>
                          {rel.asset && <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer footer */}
              <div className="border-t border-cyber-gray/30 pt-3 mt-4 text-[9px] text-gray-600 leading-relaxed">
                Clicking linked relationships will update selection and focus details drawer on target asset.
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
