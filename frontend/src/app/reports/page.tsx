"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import { FileText, Eye, Shield, List, ChevronRight, FileArchive, Download } from "lucide-react";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  
  // Selected Report Viewing
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportContent, setReportContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [scans, setScans] = useState<any[]>([]);

  // Selected Artifact Viewing
  const [selectedArtifactName, setSelectedArtifactName] = useState<string | null>(null);
  const [artifactContent, setArtifactContent] = useState<string>("");

  // Asset Intelligence Report specific states
  const [assetSummary, setAssetSummary] = useState<any>(null);
  const [techSummary, setTechSummary] = useState<any>(null);
  const [graphStats, setGraphStats] = useState<any>(null);
  const [assetTimeline, setAssetTimeline] = useState<any[]>([]);
  const [reportViewMode, setReportViewMode] = useState<"dashboard" | "markdown">("dashboard");

  const loadInitialData = async () => {
    try {
      const scansRes = await fetch("http://localhost:8000/api/scans/");
      const scansData = await scansRes.json();
      setScans(scansData);

      const repRes = await fetch("http://localhost:8000/api/reports/");
      const repData = await repRes.json();
      setReports(repData);
      
      const artRes = await fetch("http://localhost:8000/api/reports/artifacts/list");
      const artData = await artRes.json();
      setArtifacts(artData);

      // Auto-select first report if available
      if (repData.length > 0) {
        viewReport(repData[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const viewReport = async (reportId: string) => {
    setSelectedReportId(reportId);
    setSelectedArtifactName(null);
    setLoadingContent(true);
    
    // Find active report object to check its title
    const activeRep = reports.find(r => r.id === reportId);
    const isAssetRep = activeRep && activeRep.title.toLowerCase().includes("asset");

    try {
      const res = await fetch(`http://localhost:8000/api/reports/${reportId}/content`);
      if (res.ok) {
        const text = await res.text();
        setReportContent(text);
      } else {
        setReportContent("Error: Failed to fetch report markdown content from server disk.");
      }

      if (isAssetRep && activeRep) {
        const scanId = activeRep.scan_id;
        
        // 1. Fetch asset summary
        try {
          const sumRes = await fetch(`http://localhost:8000/api/assets/${scanId}/summary`);
          if (sumRes.ok) {
            const sumData = await sumRes.json();
            setAssetSummary(sumData);
          }
        } catch (e) {
          console.error("Failed to load asset summary:", e);
        }

        // 2. Fetch technologies
        try {
          const techRes = await fetch(`http://localhost:8000/api/assets/${scanId}/technologies`);
          if (techRes.ok) {
            const techData = await techRes.json();
            setTechSummary(techData);
          }
        } catch (e) {
          console.error("Failed to load tech stack:", e);
        }

        // 3. Fetch graph stats
        try {
          const graphRes = await fetch(`http://localhost:8000/api/assets/${scanId}/graph`);
          if (graphRes.ok) {
            const graphData = await graphRes.json();
            setGraphStats(graphData);
          }
        } catch (e) {
          console.error("Failed to load graph stats:", e);
        }

        // 4. Fetch asset timeline (ordered assets list)
        try {
          const assetsRes = await fetch(`http://localhost:8000/api/assets/?scan_id=${scanId}`);
          if (assetsRes.ok) {
            const assetsData = await assetsRes.json();
            // Sort by created_at ascending to show chronological timeline
            const sorted = [...assetsData].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            setAssetTimeline(sorted);
          }
        } catch (e) {
          console.error("Failed to load asset timeline:", e);
        }
      }
    } catch (err) {
      setReportContent("Error connecting to server to retrieve report file.");
    } finally {
      setLoadingContent(false);
    }
  };

  const viewArtifact = async (filename: string) => {
    setSelectedArtifactName(filename);
    setSelectedReportId(null);
    setLoadingContent(true);
    try {
      const res = await fetch(`http://localhost:8000/api/reports/artifacts/view/${filename}`);
      if (res.ok) {
        const text = await res.text();
        setArtifactContent(text);
      } else {
        setArtifactContent("Error loading artifact content.");
      }
    } catch (err) {
      setArtifactContent("Error connecting to server.");
    } finally {
      setLoadingContent(false);
    }
  };

  const activeReport = reports.find(r => r.id === selectedReportId);
  const isAssetReport = activeReport && activeReport.title.toLowerCase().includes("asset");

  const activeScans = scans.filter((s: any) => s.status === "running" || s.status === "pending");

  return (
    <div className="flex min-h-screen bg-cyber-black text-foreground">
      <Sidebar statusText={activeScans.length > 0 ? "SCANNING" : "STANDBY"} activeScanCount={activeScans.length} />

      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto max-h-screen">
        {/* Title */}
        <div className="flex items-center justify-between border-b border-cyber-gray pb-4 select-none">
          <div>
            <h1 className="text-xl font-bold tracking-widest text-purple-400">ASSESSMENT REPORTS</h1>
            <p className="text-xs text-gray-500 mt-1">MODULE: REPORTS_ARCHIVE // GENERATED: {reports.length}</p>
          </div>
        </div>

        {/* Layout: Left index lists + Right content viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
          
          {/* Left Index (Lists of Reports & List of Raw Artifacts) */}
          <div className="space-y-6 lg:col-span-1">
            {/* Reports Index */}
            <div className="bg-cyber-dark border border-cyber-gray p-4 rounded select-none">
              <span className="text-xs font-bold tracking-widest text-cyber-green flex items-center gap-2 border-b border-cyber-gray/30 pb-2.5 mb-3">
                <FileText className="w-4 h-4 text-cyber-green" /> COMPILED_REPORTS
              </span>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {reports.length === 0 ? (
                  <div className="text-xs text-gray-600 italic text-center py-4">No reports compiled yet.</div>
                ) : (
                  reports.map((rep) => (
                    <div
                      key={rep.id}
                      onClick={() => viewReport(rep.id)}
                      className={`p-2.5 border rounded cursor-pointer transition-all flex items-center justify-between text-[11px] ${
                        selectedReportId === rep.id
                          ? "bg-cyber-gray/40 border-purple-500 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.15)]"
                          : "bg-cyber-black border-cyber-gray text-gray-400 hover:text-white"
                      }`}
                    >
                      <span className="truncate font-semibold">{rep.title}</span>
                      <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Artifacts Index */}
            <div className="bg-cyber-dark border border-cyber-gray p-4 rounded select-none">
              <span className="text-xs font-bold tracking-widest text-cyber-green flex items-center gap-2 border-b border-cyber-gray/30 pb-2.5 mb-3">
                <FileArchive className="w-4 h-4 text-cyber-green" /> RAW_SCAN_ARTIFACTS
              </span>

              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {artifacts.length === 0 ? (
                  <div className="text-xs text-gray-600 italic text-center py-4">No artifacts captured.</div>
                ) : (
                  artifacts.map((art) => (
                    <div
                      key={art.filename}
                      onClick={() => viewArtifact(art.filename)}
                      className={`p-2.5 border rounded cursor-pointer transition-all flex items-center justify-between text-[10px] ${
                        selectedArtifactName === art.filename
                          ? "bg-cyber-gray/40 border-cyber-cyan text-cyber-cyan shadow-[0_0_8px_rgba(0,240,255,0.15)]"
                          : "bg-cyber-black border-cyber-gray text-gray-500 hover:text-white"
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold block truncate text-gray-300">{art.filename}</span>
                        <span className="text-[9px] text-gray-500">{(art.size_bytes / 1024).toFixed(1)} KB</span>
                      </div>
                      <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Content Viewer */}
          <div className="lg:col-span-2 bg-cyber-dark border border-cyber-gray rounded p-5 flex flex-col justify-between min-h-[450px]">
            {loadingContent ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-500 italic">
                Decompressing file and reading streams...
              </div>
            ) : selectedReportId ? (
              /* Markdown / Dashboard Report rendering container */
              <div className="flex-grow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-cyber-gray pb-2 mb-4 select-none">
                    <span className="text-[10px] text-gray-500 tracking-widest uppercase">
                      REPORT_READER // {isAssetReport ? "ASSET_INTELLIGENCE" : "OUTPUT_VIEW"}
                    </span>
                    <div className="flex items-center gap-2">
                      {isAssetReport && (
                        <div className="flex border border-cyber-gray/60 rounded overflow-hidden mr-2">
                          <button
                            onClick={() => setReportViewMode("dashboard")}
                            className={`px-2 py-0.5 text-[9px] font-bold ${
                              reportViewMode === "dashboard"
                                ? "bg-cyber-green text-cyber-black"
                                : "bg-transparent text-gray-400"
                            }`}
                          >
                            DASHBOARD
                          </button>
                          <button
                            onClick={() => setReportViewMode("markdown")}
                            className={`px-2 py-0.5 text-[9px] font-bold ${
                              reportViewMode === "markdown"
                                ? "bg-cyber-green text-cyber-black"
                                : "bg-transparent text-gray-400"
                            }`}
                          >
                            MARKDOWN
                          </button>
                        </div>
                      )}
                      <span className="text-[10px] text-purple-400 font-bold">
                        FORMAT: {isAssetReport && reportViewMode === "dashboard" ? "DASHBOARD" : "MARKDOWN"}
                      </span>
                    </div>
                  </div>
                  
                  {isAssetReport && reportViewMode === "dashboard" ? (
                    /* Graphical dashboard for Asset Intelligence Report */
                    <div className="space-y-4 overflow-y-auto max-h-[420px] pr-2">
                      
                      {/* Stat summary row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 select-none">
                        <div className="bg-cyber-black/40 border border-cyber-gray p-2.5 rounded text-center">
                          <span className="text-[8px] text-gray-500 uppercase tracking-widest block font-bold">TOTAL ASSETS</span>
                          <span className="text-lg font-black text-cyber-green">{assetSummary?.total_assets || 0}</span>
                        </div>
                        <div className="bg-cyber-black/40 border border-cyber-gray p-2.5 rounded text-center">
                          <span className="text-[8px] text-gray-500 uppercase tracking-widest block font-bold">DOMAINS</span>
                          <span className="text-lg font-black text-cyber-cyan">
                            {(assetSummary?.by_type?.domain || 0) + (assetSummary?.by_type?.subdomain || 0)}
                          </span>
                        </div>
                        <div className="bg-cyber-black/40 border border-cyber-gray p-2.5 rounded text-center">
                          <span className="text-[8px] text-gray-500 uppercase tracking-widest block font-bold">ENDPOINTS</span>
                          <span className="text-lg font-black text-cyber-cyan">
                            {assetSummary?.by_type?.endpoint || 0}
                          </span>
                        </div>
                        <div className="bg-cyber-black/40 border border-cyber-gray p-2.5 rounded text-center">
                          <span className="text-[8px] text-gray-500 uppercase tracking-widest block font-bold">TECHS</span>
                          <span className="text-lg font-black text-purple-400">
                            {assetSummary?.by_type?.technology || 0}
                          </span>
                        </div>
                      </div>

                      {/* Tech stack and graph stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 select-none">
                        {/* Technologies list */}
                        <div className="bg-cyber-black/25 border border-cyber-gray p-3 rounded">
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black block border-b border-cyber-gray/30 pb-1 mb-2">
                            IDENTIFIED TECHNOLOGIES
                          </span>
                          {!techSummary || Object.keys(techSummary.technologies || {}).length === 0 ? (
                            <span className="text-[10px] text-gray-600 italic">No technologies identified.</span>
                          ) : (
                            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                              {Object.entries(techSummary.technologies).map(([tech, count]: [string, any]) => (
                                <div key={tech} className="flex items-center justify-between text-[10px]">
                                  <span className="text-gray-300 font-bold">{tech}</span>
                                  <span className="text-purple-400 font-mono">x{count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Graph stats details */}
                        <div className="bg-cyber-black/25 border border-cyber-gray p-3 rounded">
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black block border-b border-cyber-gray/30 pb-1 mb-2">
                            GRAPH TOPOLOGY METRICS
                          </span>
                          <div className="space-y-2 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Total Nodes:</span>
                              <span className="font-bold text-gray-300">{graphStats?.total_nodes || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Total Edges:</span>
                              <span className="font-bold text-gray-300">{graphStats?.total_edges || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Connected Components:</span>
                              <span className="font-bold text-gray-300">{graphStats?.connected_components || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Max Graph Depth:</span>
                              <span className="font-bold text-gray-300">{graphStats?.max_depth || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Chronological Discovery Timeline */}
                      <div className="bg-cyber-black/25 border border-cyber-gray p-3 rounded">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black block border-b border-cyber-gray/30 pb-1 mb-2.5">
                          CHRONOLOGICAL DISCOVERY TIMELINE
                        </span>
                        {assetTimeline.length === 0 ? (
                          <div className="text-[10px] text-gray-600 italic">No asset logs fetched.</div>
                        ) : (
                          <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                            {assetTimeline.map((item) => {
                              const timeStr = new Date(item.created_at).toLocaleTimeString();
                              return (
                                <div key={item.id} className="flex items-start gap-2 text-[10px] border-b border-cyber-gray/10 pb-1.5 last:border-0">
                                  <span className="text-gray-600 font-mono flex-shrink-0">[{timeStr}]</span>
                                  <span className="text-[8px] bg-cyber-gray border border-cyber-cyan/30 text-cyber-cyan px-1 rounded uppercase font-bold flex-shrink-0 select-none">
                                    {item.asset_type}
                                  </span>
                                  <span className="text-gray-300 break-all font-mono">
                                    {item.asset_value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    /* Markdown text container */
                    <div className="text-xs text-gray-300 font-mono overflow-y-auto max-h-[420px] whitespace-pre-wrap leading-relaxed pr-2">
                      {reportContent}
                    </div>
                  )}
                </div>
              </div>
            ) : selectedArtifactName ? (
              /* Raw JSON/TXT log files viewer */
              <div className="flex-grow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-cyber-gray pb-2 mb-4 select-none">
                    <span className="text-[10px] text-gray-500 tracking-widest uppercase">RAW_EVIDENCE_LOGGER // TRAFFIC_VIEW</span>
                    <span className="text-[10px] text-cyber-cyan font-bold">{selectedArtifactName.split(".").pop()?.toUpperCase()}</span>
                  </div>

                  <pre className="p-4 bg-cyber-black border border-cyber-gray rounded text-[10px] text-cyber-cyan font-mono overflow-auto max-h-[400px] leading-relaxed">
                    {artifactContent}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-600 italic select-none">
                Select a compiled vulnerability report or raw artifact file to read.
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
