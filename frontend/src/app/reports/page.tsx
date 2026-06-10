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
    try {
      const res = await fetch(`http://localhost:8000/api/reports/${reportId}/content`);
      if (res.ok) {
        const text = await res.text();
        setReportContent(text);
      } else {
        setReportContent("Error: Failed to fetch report markdown content from server disk.");
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
              /* Markdown Report rendering container */
              <div className="flex-grow flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-cyber-gray pb-2 mb-4 select-none">
                    <span className="text-[10px] text-gray-500 tracking-widest uppercase">REPORT_READER // OUTPUT_VIEW</span>
                    <span className="text-[10px] text-purple-400 font-bold">FORMAT: MARKDOWN</span>
                  </div>
                  
                  {/* Markdown text container */}
                  <div className="text-xs text-gray-300 font-mono overflow-y-auto max-h-[420px] whitespace-pre-wrap leading-relaxed pr-2">
                    {reportContent}
                  </div>
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
