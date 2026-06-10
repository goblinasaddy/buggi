"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import { Shield, ShieldAlert, ShieldX, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

export default function FindingsPage() {
  const [findings, setFindings] = useState<any[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>("");
  const [scans, setScans] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const scansRes = await fetch("http://localhost:8000/api/scans/");
      const scansData = await scansRes.json();
      setScans(scansData);

      const url = selectedScanId 
        ? `http://localhost:8000/api/findings/?scan_id=${selectedScanId}`
        : "http://localhost:8000/api/findings/";
      
      const findingsRes = await fetch(url);
      const findingsData = await findingsRes.json();
      setFindings(findingsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedScanId]);

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical":
        return "bg-cyber-red/20 text-cyber-red border-cyber-red/40";
      case "high":
        return "bg-cyber-red/10 text-cyber-red border-cyber-red/35";
      case "medium":
        return "bg-cyber-amber/15 text-cyber-amber border-cyber-amber/35";
      default:
        return "bg-cyber-green/15 text-cyber-green border-cyber-green/35";
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
            <h1 className="text-xl font-bold tracking-widest text-cyber-red">VULNERABILITY FINDINGS</h1>
            <p className="text-xs text-gray-500 mt-1">MODULE: FINDINGS_TRACKER // RECORDED: {findings.length}</p>
          </div>
          
          {/* Scan Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-bold tracking-widest">FILTER:</span>
            <select
              value={selectedScanId}
              onChange={(e) => setSelectedScanId(e.target.value)}
              className="bg-cyber-dark border border-cyber-gray text-gray-300 text-xs rounded p-2 outline-none font-mono focus:border-cyber-cyan"
            >
              <option value="">ALL TARGET SCANS</option>
              {scans.map(s => (
                <option key={s.id} value={s.id}>{s.target_url}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Findings Table list */}
        <div className="bg-cyber-dark border border-cyber-gray rounded p-4 flex-grow">
          {loading ? (
            <div className="text-xs text-gray-500 italic select-none py-8">Querying database...</div>
          ) : findings.length === 0 ? (
            <div className="text-xs text-gray-600 italic select-none text-center py-12">
              No vulnerability findings identified for the selected filter context.
            </div>
          ) : (
            <div className="space-y-4">
              {findings.map((finding) => {
                const isExpanded = expandedId === finding.id;
                return (
                  <div
                    key={finding.id}
                    className="border border-cyber-gray bg-cyber-black/40 rounded transition-all hover:border-gray-600 overflow-hidden"
                  >
                    {/* Collapsible header summary */}
                    <div
                      onClick={() => toggleExpand(finding.id)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 border text-[9px] font-bold rounded-sm uppercase tracking-wider ${getSeverityBadge(
                          finding.severity
                        )}`}>
                          {finding.severity}
                        </span>
                        <div>
                          <span className="font-semibold text-gray-200 block md:inline-block">
                            {finding.title}
                          </span>
                          <span className="text-[10px] text-gray-500 block md:inline-block md:ml-3">
                            target: {finding.target.replace("https://", "").replace("http://", "").split("/")[0]}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-cyber-green font-bold border border-cyber-green/20 px-1.5 py-0.5 rounded-sm">
                          CONF: {(finding.confidence * 100).toFixed(0)}%
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    {/* Collapsible Details Body */}
                    {isExpanded && (
                      <div className="p-4 border-t border-cyber-gray bg-cyber-dark/40 space-y-4 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-gray-500 text-[10px] block uppercase font-bold">VULNERABILITY ID</span>
                            <span className="text-gray-300 font-mono text-[11px] block">{finding.id}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-gray-500 text-[10px] block uppercase font-bold">DISCOVERY TIME</span>
                            <span className="text-gray-300 font-mono text-[11px] block">
                              {new Date(finding.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                          <span className="text-gray-500 text-[10px] block uppercase font-bold">RECONNAISSANCE ANALYSIS & SUMMARY</span>
                          <p className="text-gray-300 leading-relaxed text-[11px]">
                            Buggi's autonomous test suite ran targeted test cases against this parameter. 
                            The application responded with object disclosures, security bypass configurations, or permission errors validating a potential vulnerability.
                          </p>
                        </div>

                        {/* Evidence logs */}
                        {finding.evidence && (
                          <div className="space-y-1.5">
                            <span className="text-gray-500 text-[10px] block uppercase font-bold">PROOF-OF-CONCEPT ARTIFACT / TRAFFIC LOG</span>
                            <pre className="p-3 bg-cyber-black border border-cyber-gray rounded text-[10px] text-cyber-cyan overflow-x-auto leading-normal">
                              {JSON.stringify(finding.evidence, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
