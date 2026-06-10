"use client";

import React, { useEffect, useState, useRef } from "react";
import PetWidget, { PetState } from "@/components/pet-widget";
import { 
  Play, Terminal, Shield, Cpu, Database, 
  HelpCircle, ChevronRight, X, Eye, Check, Clock, RefreshCw 
} from "lucide-react";

export default function CommandCenter() {
  const [scans, setScans] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  // Active selected scan monitoring
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [activeScan, setActiveScan] = useState<any | null>(null);
  
  // Real-time events
  const [logEvents, setLogEvents] = useState<any[]>([]);
  const [wsStatus, setWsStatus] = useState("DISCONNECTED");
  const wsRef = useRef<WebSocket | null>(null);
  
  // UI States
  const [petState, setPetState] = useState<PetState>("idle");
  const [commandInput, setCommandInput] = useState("");
  const [systemUptime, setSystemUptime] = useState("00:12:45");
  
  // Modal Overlays
  const [showScanModal, setShowScanModal] = useState(false);
  const [showFindingsModal, setShowFindingsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportContent, setSelectedReportContent] = useState("");
  const [selectedReportTitle, setSelectedReportTitle] = useState("");
  
  // Form Inputs for Scan Modal
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [scanType, setScanType] = useState("full");

  // Terminal scroll helper
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Initialize and hide white screen flash
  useEffect(() => {
    const showWindow = async () => {
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        try {
          const { appWindow } = await import("@tauri-apps/api/window");
          // Add a tiny delay to ensure HTML/CSS is fully painted dark
          setTimeout(async () => {
            await appWindow.show();
          }, 150);
        } catch (e) {
          console.error(e);
        }
      }
    };
    showWindow();
  }, []);

  // Fetch telemetry data
  const fetchData = async () => {
    try {
      const scansRes = await fetch("http://localhost:8000/api/scans/");
      const scansData = await scansRes.json();
      setScans(scansData);

      const findingsRes = await fetch("http://localhost:8000/api/findings/");
      const findingsData = await findingsRes.json();
      setFindings(findingsData);

      const profilesRes = await fetch("http://localhost:8000/api/profiles/");
      const profilesData = await profilesRes.json();
      setProfiles(profilesData);
      if (profilesData.length > 0 && !selectedProfileId) {
        setSelectedProfileId(profilesData[0].id);
      }

      // Check if there are active scans
      const active = scansData.find((s: any) => s.status === "running");
      const pending = scansData.find((s: any) => s.status === "pending");

      if (active) {
        setPetState("scanning");
        if (active.id !== activeScanId) {
          selectScan(active.id);
        }
      } else if (pending) {
        setPetState("thinking");
      } else if (findingsData.some((f: any) => f.status === "verified")) {
        setPetState("found");
      } else {
        setPetState("idle");
      }
    } catch (err) {
      console.error("Failed to connect to backend:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [activeScanId]);

  // Handle Scan Selection (retrieves historic event logs, then binds WebSocket)
  const selectScan = async (scanId: string) => {
    setActiveScanId(scanId);
    
    // Close existing WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    try {
      // Fetch scan details
      const sRes = await fetch(`http://localhost:8000/api/scans/${scanId}`);
      const sData = await sRes.json();
      setActiveScan(sData);

      // Fetch historic events
      const eRes = await fetch(`http://localhost:8000/api/scans/${scanId}/events`);
      const eData = await eRes.json();
      setLogEvents(eData);

      // Connect WebSocket for live events
      connectWebSocket(scanId);
    } catch (err) {
      console.error("Error loading scan details:", err);
    }
  };

  // Connect to FastAPI WebSocket
  const connectWebSocket = (scanId: string) => {
    setWsStatus("CONNECTING");
    const ws = new WebSocket(`ws://localhost:8000/api/scans/ws?scan_id=${scanId}`);
    
    ws.onopen = () => {
      setWsStatus("CONNECTED");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.scan_id !== scanId) return;

      if (data.type === "event") {
        setLogEvents(prev => [...prev, data]);
        // Auto update pet state based on events
        if (data.event_type === "VULNERABILITY_VERIFIED") {
          setPetState("found");
        } else if (data.event_type === "REPORT_GENERATED") {
          setPetState("reporting");
        } else if (data.event_type === "SCAN_COMPLETED") {
          setPetState("idle");
        }
      }
    };

    ws.onclose = () => {
      setWsStatus("DISCONNECTED");
    };

    ws.onerror = () => {
      setWsStatus("ERROR");
    };

    wsRef.current = ws;
  };

  // Command Bar input trigger
  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput) return;

    const trimmed = commandInput.trim();
    setCommandInput("");

    if (trimmed.toLowerCase() === "clear") {
      setLogEvents([]);
      return;
    }

    if (trimmed.toLowerCase() === "help") {
      const helpMsgs = [
        { agent: "System", event_type: "SYSTEM_INFO", message: "Available CLI commands:", created_at: new Date().toISOString() },
        { agent: "System", event_type: "SYSTEM_INFO", message: "  > scan <url> - Deploy new research agent run on target URL", created_at: new Date().toISOString() },
        { agent: "System", event_type: "SYSTEM_INFO", message: "  > report     - Open the latest vulnerability assessment report", created_at: new Date().toISOString() },
        { agent: "System", event_type: "SYSTEM_INFO", message: "  > clear      - Flush active logs display from console", created_at: new Date().toISOString() }
      ];
      setLogEvents(prev => [...prev, ...helpMsgs]);
      return;
    }

    if (trimmed.toLowerCase() === "report") {
      try {
        const repRes = await fetch("http://localhost:8000/api/reports/");
        const repData = await repRes.json();
        if (repData.length > 0) {
          viewReport(repData[0].id, repData[0].title);
        } else {
          setLogEvents(prev => [...prev, {
            agent: "System",
            event_type: "SYSTEM_INFO",
            message: "No reports compiled in database yet. Launch a scan job to generate findings.",
            created_at: new Date().toISOString()
          }]);
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (trimmed.toLowerCase().startsWith("scan ")) {
      const url = trimmed.slice(5).trim();
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        setLogEvents(prev => [...prev, {
          agent: "System",
          event_type: "SYSTEM_INFO",
          message: "Error: Invalid target protocol. URL must start with http:// or https://",
          created_at: new Date().toISOString()
        }]);
        return;
      }

      // Trigger scan via default profile
      if (profiles.length === 0) return;
      try {
        const res = await fetch("http://localhost:8000/api/scans/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_url: url,
            profile_id: profiles[0].id,
            scan_type: "full"
          })
        });

        if (res.ok) {
          const data = await res.json();
          selectScan(data.id);
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    // Default unknown command feedback
    setLogEvents(prev => [...prev, {
      agent: "System",
      event_type: "SYSTEM_INFO",
      message: `Unknown command: "${trimmed}". Type "help" for a list of valid commands.`,
      created_at: new Date().toISOString()
    }]);
  };

  const handleLaunchScanModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl) return;

    try {
      const res = await fetch("http://localhost:8000/api/scans/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_url: targetUrl,
          profile_id: selectedProfileId,
          scan_type: scanType
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTargetUrl("");
        setShowScanModal(false);
        selectScan(data.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const viewReport = async (reportId: string, title: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/reports/${reportId}/content`);
      if (res.ok) {
        const text = await res.text();
        setSelectedReportTitle(title);
        setSelectedReportContent(text);
        setShowReportModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Auto scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logEvents]);

  // Uptime ticker
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const diff = Date.now() - start;
      const hours = String(Math.floor(diff / 3600000)).padStart(2, "0");
      const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
      const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
      setSystemUptime(`${hours}:${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical":
        return "border-cyber-red text-cyber-red shadow-[0_0_8px_rgba(255,51,102,0.12)]";
      case "high":
        return "border-orange-500 text-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.12)]";
      case "medium":
        return "border-cyber-amber text-cyber-amber shadow-[0_0_8px_rgba(255,183,0,0.12)]";
      default:
        return "border-cyber-cyan text-cyber-cyan shadow-[0_0_8px_rgba(0,229,255,0.12)]";
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical":
      case "high":
        return "bg-cyber-red/20 text-cyber-red border border-cyber-red/30";
      case "medium":
        return "bg-cyber-amber/20 text-cyber-amber border border-cyber-amber/30";
      default:
        return "bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30";
    }
  };

  const activeScans = scans.filter((s: any) => s.status === "running" || s.status === "pending");

  // Determine Agent Status Classes based on simulator states
  const getAgentStatus = (agentName: string) => {
    if (activeScans.length === 0) return { label: "Waiting", color: "text-gray-600 bg-gray-600/20" };
    
    const isRunning = scans.some(s => s.status === "running");
    if (!isRunning) return { label: "Waiting", color: "text-gray-600 bg-gray-600/20" };

    // Find active agent in logs to show running
    const latestEvent = logEvents[logEvents.length - 1];
    if (latestEvent) {
      if (latestEvent.agent.toLowerCase().includes(agentName.toLowerCase())) {
        return { label: "Running", color: "text-[#00FF88] bg-[#00FF88]/20 animate-pulse shadow-[0_0_8px_#00FF88]" };
      }
    }
    
    // Default fallback running state simulation for visual polish
    return { label: "Running", color: "text-[#00FF88] bg-[#00FF88]/20" };
  };

  return (
    <div className="flex h-screen bg-[#0B0F14] text-gray-200 select-none overflow-hidden font-mono p-4 gap-4 scanline w-screen">
      
      {/* ========================================================
          LEFT PANEL: Mascot, Agent telemetry, System Status
          ======================================================== */}
      <div className="w-80 flex flex-col gap-4 flex-shrink-0 h-full">
        
        {/* Header branding */}
        <div className="flex flex-col border-b border-[#1f2e2e]/40 pb-3 select-none px-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#00FF88] to-[#00E5FF]">
              BUGGI
            </span>
            <span className="text-[10px] bg-[#00FF88]/15 text-[#00FF88] border border-[#00FF88]/20 px-1 py-0.5 rounded font-black shadow-[0_0_8px_rgba(0,255,136,0.15)]">
              v1
            </span>
          </div>
          <span className="text-[9px] text-gray-500 tracking-wider mt-1">
            Autonomous Bug Bounty Research Assistant
          </span>
        </div>

        {/* Mascot display screen - Theme matches #131A1A */}
        <div className="bg-[#131A1A] border border-[#1f2e2e]/50 rounded-md p-6 flex flex-col items-center justify-center relative shadow-[0_0_15px_rgba(0,255,136,0.03)]">
          <div className="absolute top-2.5 left-3 flex items-center gap-1.5 text-[8px] text-gray-500">
            <div className="w-1.5 h-1.5 bg-[#00FF88] rounded-full animate-ping" />
            <span>BUGGI</span>
          </div>
          
          <PetWidget state={petState} size={90} />
          
          <div className="mt-4 border border-[#1f2e2e]/55 bg-[#05070a]/90 px-3 py-2 rounded text-[10px] text-center w-full max-w-[210px] leading-relaxed border-t-[#00FF88]/20">
            {petState === "idle" && <p className="text-[#00FF88]">"I'm awake and ready to hunt. Give me a target URL!"</p>}
            {petState === "thinking" && <p className="text-cyber-amber">"Analyzing program rules and mapping scope..."</p>}
            {petState === "scanning" && <p className="text-[#00E5FF] animate-pulse">"Actively fuzzing inputs and crawling routes..."</p>}
            {petState === "found" && <p className="text-cyber-red font-bold animate-pulse">"BUG FOUND! IDOR vulnerability verified! Check Findings!"</p>}
            {petState === "reporting" && <p className="text-[#00E5FF]">"Formatting CVE evidence and generating Markdown..."</p>}
          </div>
        </div>

        {/* AGENTS Status Monitor */}
        <div className="bg-[#131A1A] border border-[#1f2e2e]/50 rounded-md p-4 flex flex-col gap-2.5 shadow-[0_0_15px_rgba(0,255,136,0.03)]">
          <span className="text-[10px] text-gray-500 tracking-widest uppercase font-bold border-b border-[#1f2e2e]/30 pb-1.5 select-none">
            AGENTS
          </span>

          <div className="space-y-2.5 text-[11px]">
            {[
              { name: "Recon Agent", type: "recon" },
              { name: "Browser Agent", type: "browser" },
              { name: "API Agent", type: "api" },
              { name: "Verification Agent", type: "verification" },
              { name: "Report Agent", type: "report" }
            ].map((agent) => {
              const status = getAgentStatus(agent.type);
              return (
                <div key={agent.name} className="flex items-center justify-between">
                  <span className="text-gray-300 font-semibold">{agent.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{status.label}</span>
                    <div className={`w-2 h-2 rounded-full ${status.color.includes("text-[#00FF88]") ? "bg-[#00FF88] shadow-[0_0_8px_#00FF88]" : "bg-gray-600"}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SYSTEM STATUS Monitor */}
        <div className="bg-[#131A1A] border border-[#1f2e2e]/50 rounded-md p-4 flex flex-col gap-2.5 shadow-[0_0_15px_rgba(0,255,136,0.03)] flex-grow">
          <span className="text-[10px] text-gray-500 tracking-widest uppercase font-bold border-b border-[#1f2e2e]/30 pb-1.5 select-none">
            SYSTEM STATUS
          </span>

          <div className="space-y-2 text-[10px] leading-relaxed">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Active Scan:</span>
              <span className="text-[#00E5FF] font-bold">{activeScans.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Findings:</span>
              <span className="text-[#00FF88] font-bold">{findings.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Uptime:</span>
              <span className="text-gray-400 font-bold">{systemUptime}</span>
            </div>
          </div>

          {/* New Scan Trigger */}
          <button
            onClick={() => setShowScanModal(true)}
            className="w-full mt-auto bg-[#00FF88]/10 border border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88] hover:text-[#0b0f14] py-2 rounded-md font-bold text-xs tracking-widest transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(0,255,136,0.15)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> New Scan
          </button>
        </div>
      </div>

      {/* ========================================================
          CENTER PANEL: Live Console Stream, Command Bar
          ======================================================== */}
      <div className="flex-1 flex flex-col gap-4 h-full">
        
        {/* Terminal logs display */}
        <div className="flex-1 bg-[#131A1A] border border-[#1f2e2e]/50 rounded-md p-4 flex flex-col justify-between overflow-hidden relative shadow-[0_0_15px_rgba(0,255,136,0.03)]">
          <div className="flex items-center justify-between border-b border-[#1f2e2e]/30 pb-2 mb-3 select-none">
            <span className="text-[10px] text-gray-500 tracking-widest uppercase font-bold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#00FF88]" /> LIVE TERMINAL
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] px-1.5 py-0.5 rounded border border-[#1f2e2e]/50 ${
                wsStatus === "CONNECTED" ? "text-[#00FF88] bg-[#00FF88]/5" : "text-cyber-red bg-cyber-red/5"
              }`}>
                WS: {wsStatus}
              </span>
            </div>
          </div>

          {/* Scrolling output container */}
          <div className="flex-grow overflow-y-auto pr-2 space-y-2.5 font-mono text-[11px] leading-relaxed">
            {logEvents.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-600 italic select-none">
                Listening for active agent activities... Type "help" or deploy scan to begin.
              </div>
            ) : (
              logEvents.map((evt, idx) => {
                const timeStr = evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : "";
                
                // Color mapping for console prefixes
                const getAgentColor = (agent: string) => {
                  switch (agent.toLowerCase()) {
                    case "recon": return "text-[#00FF88]";
                    case "browser": return "text-[#00FF88]"; // consolidated green
                    case "api": return "text-[#00E5FF]"; // consolidated blue/cyan
                    case "verification": return "text-cyber-red font-bold";
                    case "report": return "text-purple-400";
                    default: return "text-gray-500";
                  }
                };

                return (
                  <div key={idx} className="border-b border-[#1f2e2e]/10 pb-1.5 last:border-0 hover:bg-[#1f2e2e]/20 px-1.5 rounded transition-colors">
                    {timeStr && <span className="text-gray-600 mr-2">[{timeStr}]</span>}
                    <span className={`mr-2 uppercase tracking-wider font-bold ${getAgentColor(evt.agent)}`}>
                      [{evt.agent} AGENT]
                    </span>
                    <span className="text-gray-300">{evt.message}</span>
                  </div>
                );
              })
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Command Input Bar */}
        <form 
          onSubmit={handleCommandSubmit}
          className="flex items-center bg-[#131A1A] border border-[#1f2e2e]/50 rounded-md p-3 focus-within:border-[#00FF88]/50 transition-all duration-200 select-none shadow-[0_0_15px_rgba(0,255,136,0.02)]"
        >
          <span className="text-[#00FF88] font-bold text-sm mr-2.5">&gt;</span>
          <input
            type="text"
            placeholder="Type a command... (e.g. scan https://test.com)"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            className="bg-transparent outline-none flex-grow text-xs text-gray-300 placeholder-gray-700 font-mono"
          />
          <button 
            type="submit"
            className="w-6 h-6 rounded bg-[#00FF88]/10 text-[#00FF88] flex items-center justify-center hover:bg-[#00FF88] hover:text-[#0b0f14] transition-all duration-150 shadow-[0_0_8px_rgba(0,255,136,0.1)]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* ========================================================
          RIGHT PANEL: Findings cards list
          ======================================================== */}
      <div className="w-80 bg-[#131A1A] border border-[#1f2e2e]/50 rounded-md p-4 flex flex-col justify-between shadow-[0_0_15px_rgba(0,255,136,0.03)] h-full flex-shrink-0">
        <div className="flex flex-col gap-3 flex-grow overflow-hidden">
          <span className="text-[10px] text-gray-500 tracking-widest uppercase font-bold border-b border-[#1f2e2e]/30 pb-1.5 select-none font-mono">
            FINDINGS
          </span>

          {/* Cards scrolling list */}
          <div className="overflow-y-auto space-y-3 pr-1 flex-grow">
            {findings.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-600 italic select-none text-[11px] py-12">
                No findings reported yet.
              </div>
            ) : (
              findings.map((f) => (
                <div 
                  key={f.id}
                  className={`p-3 border rounded bg-[#05070a]/80 flex flex-col gap-2 transition-all hover:translate-x-1 ${getSeverityColor(
                    f.severity
                  )}`}
                >
                  <div className="flex items-center justify-between text-[9px] font-bold uppercase select-none">
                    <span className="tracking-widest flex items-center gap-1">
                      ● {f.severity}
                    </span>
                    <span className="text-gray-500">
                      {f.timestamp ? new Date(f.timestamp).toLocaleTimeString() : ""}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-gray-200 tracking-wide truncate">
                      {f.title}
                    </h4>
                    <span className="text-[9px] text-[#00E5FF] block truncate mt-0.5 font-mono">
                      {f.target.replace("https://", "").replace("http://", "").split("/").slice(1).join("/") || "/"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] border-t border-[#1f2e2e]/40 pt-2 mt-1 select-none">
                    <span className="text-gray-400">
                      Confidence: <span className="font-bold text-gray-300">{(f.confidence * 100).toFixed(0)}%</span>
                    </span>
                    <span className={`px-1.5 rounded-sm text-[8px] font-black tracking-wide ${getSeverityBadge(
                      f.severity
                    )}`}>
                      {f.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* View All button */}
        <button
          onClick={() => setShowFindingsModal(true)}
          className="w-full mt-4 bg-[#05070a] border border-[#1f2e2e]/50 text-gray-400 hover:text-white hover:border-[#00FF88]/50 py-2 rounded-md font-bold text-xs tracking-wider transition-all duration-200 flex items-center justify-center gap-2 select-none"
        >
          <Shield className="w-3.5 h-3.5" /> View All Findings
        </button>
      </div>

      {/* ========================================================
          MODAL OVERLAYS (GLASSMORPHIC STYLING)
          ======================================================== */}
          
      {/* 1. New Scan Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-[#05070a]/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-[#131A1A] border border-[#1f2e2e]/60 rounded-lg w-full max-w-md p-5 flex flex-col gap-4 shadow-[0_0_25px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b border-[#1f2e2e]/30 pb-2">
              <span className="text-xs font-bold tracking-widest text-[#00FF88]">DEPLOY NEW RESEARCH SCAN</span>
              <button onClick={() => setShowScanModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLaunchScanModal} className="space-y-4 text-xs font-mono">
              <div className="space-y-1.5">
                <label className="text-gray-500 block uppercase">TARGET URL</label>
                <input
                  type="url"
                  placeholder="https://target-app.com"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  required
                  className="w-full bg-[#05070a] border border-[#1f2e2e]/60 rounded p-2 text-gray-300 placeholder-gray-700 outline-none focus:border-[#00FF88]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-500 block uppercase">PROGRAM SCOPE PROFILE</label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full bg-[#05070a] border border-[#1f2e2e]/60 text-gray-300 rounded p-2 outline-none focus:border-[#00FF88]"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.program_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-gray-500 block uppercase">SCAN STRATEGY</label>
                <div className="grid grid-cols-3 gap-2">
                  {["recon", "api", "full"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setScanType(t)}
                      className={`py-1.5 border rounded uppercase font-bold tracking-widest text-[9px] ${
                        scanType === t ? "bg-[#00FF88]/10 border-[#00FF88] text-[#00FF88]" : "bg-[#05070a] border-[#1f2e2e]/60 text-gray-500"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#00FF88] text-[#0b0f14] py-2.5 rounded font-black tracking-widest hover:bg-[#00FF88]/85 transition-all shadow-[0_0_12px_rgba(0,255,136,0.2)]"
              >
                DEPLOY WORKFLOW
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Findings Grid Modal */}
      {showFindingsModal && (
        <div className="fixed inset-0 bg-[#05070a]/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-[#131A1A] border border-[#1f2e2e]/60 rounded-lg w-full max-w-4xl p-5 flex flex-col gap-4 max-h-[90vh] shadow-[0_0_25px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b border-[#1f2e2e]/30 pb-2">
              <span className="text-xs font-bold tracking-widest text-[#00FF88]">VULNERABILITY FINDINGS RECORDED</span>
              <button onClick={() => setShowFindingsModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-grow pr-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1f2e2e]/40 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="py-2">VULNERABILITY</th>
                    <th className="py-2">SEVERITY</th>
                    <th className="py-2">CONF</th>
                    <th className="py-2">STATUS</th>
                    <th className="py-2">REPORTS</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f) => (
                    <tr key={f.id} className="border-b border-[#1f2e2e]/10 hover:bg-[#1f2e2e]/15 transition-colors">
                      <td className="py-3 pr-2">
                        <span className="font-bold text-gray-200 block">{f.title}</span>
                        <span className="text-[10px] text-[#00E5FF] block mt-0.5 truncate max-w-lg">{f.target}</span>
                      </td>
                      <td className="py-3 uppercase font-bold">
                        <span className={`px-1.5 py-0.5 rounded-sm ${getSeverityBadge(f.severity)}`}>
                          {f.severity}
                        </span>
                      </td>
                      <td className="py-3 text-gray-400">{(f.confidence * 100).toFixed(0)}%</td>
                      <td className="py-3">
                        <span className="text-[#00FF88] font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> {f.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={async () => {
                            try {
                              const repRes = await fetch("http://localhost:8000/api/reports/");
                              const repData = await repRes.json();
                              const report = repData.find((r: any) => r.scan_id === f.scan_id);
                              if (report) {
                                viewReport(report.id, report.title);
                              } else {
                                alert("No report generated for this finding yet.");
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="px-2 py-1 bg-[#00E5FF]/15 border border-[#00E5FF]/30 text-[#00E5FF] rounded flex items-center gap-1 hover:bg-[#00E5FF] hover:text-[#0b0f14] text-[10px] shadow-[0_0_8px_rgba(0,229,255,0.1)]"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Markdown Report Viewer Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-[#05070a]/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-[#131A1A] border border-[#1f2e2e]/60 rounded-lg w-full max-w-3xl p-5 flex flex-col gap-4 max-h-[85vh] shadow-[0_0_25px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b border-[#1f2e2e]/30 pb-2">
              <span className="text-xs font-bold tracking-widest text-[#00E5FF]">COMPILED REPORT: {selectedReportTitle}</span>
              <button onClick={() => setShowReportModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-grow pr-1 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap max-h-[60vh] font-mono border border-[#1f2e2e]/30 p-3 rounded bg-[#05070a]/50">
              {selectedReportContent}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
