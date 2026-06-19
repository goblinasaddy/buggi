"use client";

import React, { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/sidebar";
import TerminalLog, { LogEvent } from "@/components/terminal-log";
import ScanGraph, { GraphNode, GraphEdge } from "@/components/scan-graph";
import { Terminal, Shield, Play, Globe, CheckSquare, Server, AlertCircle } from "lucide-react";

export default function ScansPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  
  // Form inputs
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [scanType, setScanType] = useState("full");
  
  // Active selected scan monitoring
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [activeScan, setActiveScan] = useState<any | null>(null);
  
  // Real-time events and graph data
  const [logEvents, setLogEvents] = useState<LogEvent[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  
  const [wsStatus, setWsStatus] = useState("DISCONNECTED");
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch profiles and scans list on mount
  const loadInitialData = async () => {
    try {
      const pRes = await fetch("http://localhost:8000/api/profiles/");
      const pData = await pRes.json();
      setProfiles(pData);
      if (pData.length > 0) {
        setSelectedProfileId(pData[0].id);
      }

      const sRes = await fetch("http://localhost:8000/api/scans/");
      const sData = await sRes.json();
      setScans(sData);
      
      // Auto-select the first running or recently completed scan
      const running = sData.find((s: any) => s.status === "running");
      if (running) {
        selectScan(running.id);
      } else if (sData.length > 0) {
        selectScan(sData[0].id);
      }
    } catch (err) {
      console.error("Failed to connect to backend:", err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Poll scans list to capture state transitions (e.g. pending -> running -> completed)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const sRes = await fetch("http://localhost:8000/api/scans/");
        const sData = await sRes.json();
        setScans(sData);
        if (activeScanId) {
          const current = sData.find((s: any) => s.id === activeScanId);
          if (current) setActiveScan(current);
        }
      } catch (err) {
        console.error(err);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeScanId]);

  // Handle Scan Selection (retrieves historic event logs, then binds WebSocket for real-time logs)
  const selectScan = async (scanId: string) => {
    setActiveScanId(scanId);
    
    // Close existing WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Fetch current scan config
    try {
      const sRes = await fetch(`http://localhost:8000/api/scans/${scanId}`);
      const sData = await sRes.json();
      setActiveScan(sData);

      // Fetch historic events
      const eRes = await fetch(`http://localhost:8000/api/scans/${scanId}/events`);
      const eData = await eRes.json();
      setLogEvents(eData);

      // Clear graph initially; it will build as events replay or receive
      setGraphNodes([]);
      setGraphEdges([]);
      
      // Re-trigger visual graph construction based on events
      buildGraphFromEvents(eData);

      // Connect WebSocket for live events
      connectWebSocket(scanId);
    } catch (err) {
      console.error("Error loading scan details:", err);
    }
  };

  // Re-builds local graph states when navigating to an old completed scan
  const buildGraphFromEvents = (events: LogEvent[]) => {
    const nodesMap: { [id: string]: GraphNode } = {};
    const edgesList: GraphEdge[] = [];
    
    events.forEach(evt => {
      if (evt.event_type === "SCAN_STARTED") {
        // Create root domain node
        const url = evt.message.split("on ")[1]?.split(" using")[0] || "Target";
        nodesMap["root"] = { id: "root", type: "domain", label: url, url };
      }
      if (evt.event_type === "RECON_HOST_FOUND" && evt.payload?.host) {
        const host = evt.payload.host;
        nodesMap[host] = { id: host, type: "domain", label: host, url: `https://${host}` };
        edgesList.push({ id: `edge_${host}`, source: "root", target: host, label: "subdomain" });
      }
      if (evt.event_type === "BROWSER_FORM_DISCOVERED" && evt.payload?.url) {
        const url = evt.payload.url;
        const endpoint = "/" + url.split("/").slice(3).join("/");
        nodesMap[url] = { id: url, type: "url", label: `POST ${endpoint}`, url, method: "POST" };
        
        // Link to api subdomain if it match
        const hostKey = Object.keys(nodesMap).find(k => url.includes(k) && k !== "root");
        if (hostKey) {
          edgesList.push({ id: `edge_${url}`, source: hostKey, target: url, label: "endpoint" });
        }
      }
      if (evt.event_type === "API_DISCOVERED" && evt.payload?.url) {
        // Mimic API route nodes
        const url = evt.payload.url;
        const endpoint = "/" + url.split("/").slice(3).join("/");
        nodesMap[url] = { id: url, type: "url", label: `GET ${endpoint}`, url, method: "GET" };
        const hostKey = Object.keys(nodesMap).find(k => url.includes(k) && k !== "root");
        if (hostKey) {
          edgesList.push({ id: `edge_${url}`, source: hostKey, target: url, label: "endpoint" });
        }
      }
    });

    setGraphNodes(Object.values(nodesMap));
    setGraphEdges(edgesList);
  };

  // Connect to FastAPI WebSocket for streaming events
  const connectWebSocket = (scanId: string) => {
    setWsStatus("CONNECTING");
    const ws = new WebSocket(`ws://localhost:8000/api/scans/ws?scan_id=${scanId}`);
    
    ws.onopen = () => {
      setWsStatus("CONNECTED");
      console.log("WebSocket connected to scan:", scanId);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.scan_id !== scanId) return;

      if (data.type === "event") {
        setLogEvents(prev => [...prev, data]);
        // Dynamically add nodes/edges to graph on new events
        handleLiveGraphEvent(data);
      } else if (data.type === "graph_update") {
        // Full graph sync from backend
        setGraphNodes(data.nodes);
        setGraphEdges(data.edges);
      }
    };

    ws.onclose = () => {
      setWsStatus("DISCONNECTED");
      console.log("WebSocket disconnected");
    };

    ws.onerror = (err) => {
      setWsStatus("ERROR");
      console.error("WebSocket error:", err);
    };

    wsRef.current = ws;
  };

  // Process a live event in the frontend to paint the graph nodes immediately
  const handleLiveGraphEvent = (event: LogEvent) => {
    if (event.event_type === "SCAN_STARTED") {
      const url = event.message.split("on ")[1]?.split(" using")[0] || "Target";
      setGraphNodes([{ id: "root", type: "domain", label: url, url }]);
    }
    else if (event.event_type === "RECON_HOST_FOUND" && event.payload?.host) {
      const host = event.payload.host;
      setGraphNodes(prev => [...prev, { id: host, type: "domain", label: host, url: `https://${host}` }]);
      setGraphEdges(prev => [...prev, { id: `edge_${host}`, source: "root", target: host, label: "subdomain" }]);
    }
    else if (event.event_type === "BROWSER_FORM_DISCOVERED" && event.payload?.url) {
      const url = event.payload.url;
      const endpoint = "/" + url.split("/").slice(3).join("/");
      setGraphNodes(prev => [...prev, { id: url, type: "url", label: `POST ${endpoint}`, url, method: "POST" }]);
      
      const hostKey = hostUrlMatch(url);
      if (hostKey) {
        setGraphEdges(prev => [...prev, { id: `edge_${url}`, source: hostKey, target: url, label: "endpoint" }]);
      }
    }
  };

  const hostUrlMatch = (url: string) => {
    // Helper to match subdomain keys in graph
    const match = graphNodes.find(n => n.type === "domain" && url.includes(n.id) && n.id !== "root");
    return match ? match.id : "root";
  };

  const triggerAssetDiscovery = async (scanId: string, targetUrl: string) => {
    try {
      fetch(`http://localhost:8000/api/assets/${scanId}/discover?target=${encodeURIComponent(targetUrl)}`, {
        method: "POST"
      });
    } catch (e) {
      console.error("Failed to trigger asset discovery:", e);
    }
  };

  // Triggered on form submit
  const handleLaunchScan = async (e: React.FormEvent) => {
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
        // Clear input form
        setTargetUrl("");
        // Trigger asset discovery in background
        triggerAssetDiscovery(data.id, data.target_url);
        // Reload scans list
        const sRes = await fetch("http://localhost:8000/api/scans/");
        const sData = await sRes.json();
        setScans(sData);
        // Focus the newly launched scan
        selectScan(data.id);
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to submit scan request. Check if backend is active.");
    }
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const activeScans = scans.filter((s: any) => s.status === "running" || s.status === "pending");

  return (
    <div className="flex min-h-screen bg-cyber-black text-foreground">
      <Sidebar statusText={activeScans.length > 0 ? "SCANNING" : "STANDBY"} activeScanCount={activeScans.length} />

      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto max-h-screen">
        {/* Title */}
        <div className="flex items-center justify-between border-b border-cyber-gray pb-4 select-none">
          <div>
            <h1 className="text-xl font-bold tracking-widest text-cyber-cyan">SCANNER COMMAND CONSOLE</h1>
            <p className="text-xs text-gray-500 mt-1">MODULE: SCANS_MANAGER // QUEUE_ACTIVE: {activeScans.length}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              wsStatus === "CONNECTED"
                ? "border-cyber-green text-cyber-green bg-cyber-green/5 shadow-[0_0_10px_rgba(0,255,102,0.1)]"
                : "border-cyber-red text-cyber-red bg-cyber-red/5"
            }`}>
              WS_BRIDGE: {wsStatus}
            </span>
          </div>
        </div>

        {/* Scan launch configuration + Scans selector list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Launch new job form */}
          <div className="bg-cyber-dark border border-cyber-gray p-4 rounded flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold tracking-widest text-cyber-green flex items-center gap-2 border-b border-cyber-gray/30 pb-2.5">
                <Play className="w-4 h-4 text-cyber-green" /> DEPLOY_NEW_RESEARCH_JOB
              </span>

              <form onSubmit={handleLaunchScan} className="space-y-4 text-xs">
                {/* Target URL */}
                <div className="space-y-1.5">
                  <label className="text-gray-500 block uppercase">TARGET_URL</label>
                  <div className="flex items-center bg-cyber-black border border-cyber-gray rounded p-2 focus-within:border-cyber-cyan">
                    <Globe className="w-4 h-4 text-gray-500 mr-2" />
                    <input
                      type="url"
                      placeholder="https://target-app.com"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      required
                      className="bg-transparent outline-none flex-1 text-gray-300 placeholder-gray-600 font-mono"
                    />
                  </div>
                </div>

                {/* Program Profile Selector */}
                <div className="space-y-1.5">
                  <label className="text-gray-500 block uppercase">PROGRAM_SCOPE_PROFILE</label>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="w-full bg-cyber-black border border-cyber-gray text-gray-300 rounded p-2 outline-none font-mono focus:border-cyber-cyan"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.program_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scan Type */}
                <div className="space-y-1.5">
                  <label className="text-gray-500 block uppercase">SCAN_STRATEGY</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["recon", "api", "full"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setScanType(t)}
                        className={`py-1.5 border rounded uppercase font-bold tracking-widest text-[9px] ${
                          scanType === t
                            ? "bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-[0_0_8px_rgba(0,240,255,0.1)]"
                            : "bg-cyber-black border-cyber-gray text-gray-500 hover:text-white"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full mt-4 bg-cyber-green text-cyber-black py-2.5 rounded font-black tracking-widest text-xs hover:bg-cyber-green/80 flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(0,255,102,0.2)]"
                >
                  <Play className="w-3.5 h-3.5 fill-cyber-black" /> LAUNCH_AI_AGENT_WORKFLOW
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: Active scan list */}
          <div className="bg-cyber-dark border border-cyber-gray p-4 rounded lg:col-span-2 flex flex-col">
            <span className="text-xs font-bold tracking-widest text-cyber-green flex items-center gap-2 border-b border-cyber-gray/30 pb-2.5 mb-3 select-none">
              <Server className="w-4 h-4 text-cyber-green" /> ACTIVE_SCAN_RUNS
            </span>

            <div className="overflow-y-auto max-h-[220px] flex-grow space-y-2 pr-1">
              {scans.length === 0 ? (
                <div className="text-xs text-gray-600 italic select-none text-center py-8">
                  No scan runs found in database. Create one to begin.
                </div>
              ) : (
                scans.map((scan) => (
                  <div
                    key={scan.id}
                    onClick={() => selectScan(scan.id)}
                    className={`p-3 border rounded flex items-center justify-between cursor-pointer select-none transition-all ${
                      activeScanId === scan.id
                        ? "bg-cyber-gray/40 border-cyber-cyan text-cyber-cyan shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                        : "bg-cyber-black border-cyber-gray text-gray-400 hover:border-gray-500 hover:text-white"
                    }`}
                  >
                    <div>
                      <span className="font-bold block text-xs tracking-wider truncate max-w-sm">
                        {scan.target_url}
                      </span>
                      <span className="text-[9px] text-gray-500 tracking-widest font-mono uppercase block mt-1">
                        ID: {scan.id.slice(0, 8)}... | TYPE: {scan.scan_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                        scan.status === "completed"
                          ? "bg-cyber-green/20 text-cyber-green border border-cyber-green/30"
                          : scan.status === "running"
                          ? "bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 animate-pulse"
                          : "bg-cyber-gray text-gray-400 border border-cyber-gray/50"
                      }`}>
                        {scan.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Live log stream + graph visualization */}
        {activeScan && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Terminal logs */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-gray-500 tracking-widest uppercase select-none">
                STREAMING_TERMINAL_LOGS ({activeScan.target_url})
              </span>
              <TerminalLog events={logEvents} heightClass="h-[320px]" />
            </div>

            {/* Attack surface graph visualizer */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-gray-500 tracking-widest uppercase select-none">
                VISUALIZED_ATTACK_SURFACE ({activeScan.target_url})
              </span>
              <ScanGraph nodes={graphNodes} edges={graphEdges} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
