"use client";

import React, { useEffect, useState, useRef } from "react";
import PetWidget, { PetState } from "@/components/pet-widget";

export default function PetWidgetPage() {
  const [petState, setPetState] = useState<PetState>("idle");
  const [activeScanTarget, setActiveScanTarget] = useState<string | null>(null);

  // Mouse coords and refs to separate click intent from drag intent
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isMouseDownRef = useRef(false);
  const hasDraggedRef = useRef(false);

  // Poll state and register WebSocket
  const fetchState = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/scans/");
      if (res.ok) {
        const scans = await res.json();
        const active = scans.find((s: any) => s.status === "running");
        const pending = scans.find((s: any) => s.status === "pending");

        if (active) {
          setPetState("scanning");
          setActiveScanTarget(active.target_url);
        } else if (pending) {
          setPetState("thinking");
          setActiveScanTarget(pending.target_url);
        } else {
          // Check if there are findings
          const findRes = await fetch("http://localhost:8000/api/findings/");
          if (findRes.ok) {
            const findings = await findRes.json();
            if (findings.length > 0 && findings.some((f: any) => f.status === "verified")) {
              setPetState("found");
            } else {
              setPetState("idle");
            }
          } else {
            setPetState("idle");
          }
          setActiveScanTarget(null);
        }
      }
    } catch (err) {
      console.error("Pet widget failed to query backend:", err);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 5000);

    // Register WebSocket for instant updates
    let ws: WebSocket | null = null;
    const connectWs = () => {
      ws = new WebSocket("ws://localhost:8000/api/scans/ws?scan_id=global");
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "scan_state_change") {
          if (data.status === "pending") {
            setPetState("thinking");
          } else if (data.status === "running") {
            setPetState("scanning");
          } else if (data.status === "completed") {
            setPetState("reporting");
            setTimeout(() => setPetState("idle"), 5000);
          } else {
            setPetState("idle");
          }
        }
        else if (data.event_type === "VULNERABILITY_VERIFIED") {
          setPetState("found");
        }
        else if (data.event_type === "SCAN_COMPLETED") {
          setPetState("reporting");
          setTimeout(() => setPetState("idle"), 5000);
        }
      };

      ws.onclose = () => {
        setTimeout(connectWs, 5000); // auto reconnect
      };
    };

    connectWs();

    // Tauri window dragging & coordinates persistence
    let unlistenMove: (() => void) | null = null;

    const initTauriWindow = async () => {
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        try {
          const { appWindow, PhysicalPosition } = await import("@tauri-apps/api/window");
          
          // Restore position from localStorage
          const savedPos = localStorage.getItem("buggi_pet_position");
          if (savedPos) {
            const { x, y } = JSON.parse(savedPos);
            if (typeof x === "number" && typeof y === "number") {
              await appWindow.setPosition(new PhysicalPosition(x, y));
            }
          }

          // Listen to window moves to save coordinates
          unlistenMove = await appWindow.onMoved(({ payload: position }) => {
            localStorage.setItem(
              "buggi_pet_position", 
              JSON.stringify({ x: position.x, y: position.y })
            );
          });
        } catch (err) {
          console.error("Failed to initialize Tauri window:", err);
        }
      }
    };

    initTauriWindow();

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
      if (unlistenMove) unlistenMove();
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    isMouseDownRef.current = true;
    dragStartRef.current = { x: e.screenX, y: e.screenY };
    hasDraggedRef.current = false;
  };

  const handleMouseMove = async (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || hasDraggedRef.current) return;

    const diffX = Math.abs(e.screenX - dragStartRef.current.x);
    const diffY = Math.abs(e.screenY - dragStartRef.current.y);

    // Trigger dragging if moved more than 5 pixels
    if (diffX >= 5 || diffY >= 5) {
      hasDraggedRef.current = true;
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        try {
          const { appWindow } = await import("@tauri-apps/api/window");
          await appWindow.startDragging();
        } catch (err) {
          console.error("Failed to start dragging:", err);
        }
      }
    }
  };

  const handleMouseUp = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isMouseDownRef.current = false;

    if (!hasDraggedRef.current) {
      // It is a click! Open or focus the main window.
      if (typeof window !== "undefined" && (window as any).__TAURI__) {
        try {
          const { invoke } = await import("@tauri-apps/api/tauri");
          await invoke("open_main_window");
        } catch (err) {
          console.error("Failed to open main window:", err);
        }
      } else {
        console.log("Simulating click: open_main_window");
      }
    }
  };

  const handleMouseLeave = () => {
    isMouseDownRef.current = false;
  };

  return (
    <div 
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      className="w-screen h-screen flex flex-col items-center justify-center bg-transparent overflow-hidden select-none"
      title="Click Buggi to open Command Center (Drag to move)"
      style={{ background: "transparent !important" }}
    >
      <div className="bg-transparent border-0 outline-none p-0 m-0">
        <PetWidget state={petState} size={70} />
      </div>
      {activeScanTarget && (
        <div className="bg-cyber-black/90 border border-cyber-green/35 rounded-sm px-1 mt-0.5 text-[7px] text-cyber-green font-bold tracking-wider max-w-[80px] truncate shadow-[0_0_8px_rgba(0,255,136,0.2)] text-center select-none font-mono">
          {activeScanTarget.replace("https://", "").replace("http://", "").split("/")[0]}
        </div>
      )}
    </div>
  );
}
