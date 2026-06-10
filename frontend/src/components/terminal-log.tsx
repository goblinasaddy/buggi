import React, { useEffect, useRef } from "react";

export interface LogEvent {
  id?: string;
  event_type: string;
  agent: string;
  message: string;
  payload?: any;
  created_at: string;
}

interface TerminalLogProps {
  events: LogEvent[];
  heightClass?: string;
}

export default function TerminalLog({ events, heightClass = "h-[400px]" }: TerminalLogProps) {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const getAgentColor = (agent: string) => {
    switch (agent.toLowerCase()) {
      case "recon":
        return "text-cyber-green";
      case "browser":
        return "text-cyber-cyan";
      case "api":
        return "text-cyber-amber";
      case "verification":
        return "text-cyber-red font-bold";
      case "report":
        return "text-purple-400";
      default:
        return "text-gray-400";
    }
  };

  const getEventTypeColor = (type: string) => {
    if (type.includes("ERROR") || type.includes("FAILED")) return "text-cyber-red";
    if (type.includes("VERIFIED")) return "bg-cyber-red/20 text-cyber-red border border-cyber-red/40 px-1 py-0.5 rounded";
    if (type.includes("POTENTIAL")) return "text-cyber-amber font-bold";
    if (type.includes("COMPLETED")) return "text-cyber-green font-black";
    return "text-gray-500";
  };

  return (
    <div className="bg-cyber-black border border-cyber-gray rounded p-4 font-mono text-[11px] leading-relaxed flex flex-col justify-between overflow-hidden shadow-[inset_0_0_12px_rgba(0,0,0,0.8)]">
      {/* Top Console Bar */}
      <div className="flex items-center justify-between border-b border-cyber-gray pb-2 mb-3 select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-cyber-red/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyber-amber/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyber-green/80" />
          <span className="text-gray-500 text-[10px] ml-2 tracking-widest uppercase">AGENT_STREAM_LOGGER // v1.0</span>
        </div>
        <div className="text-[10px] text-cyber-green font-bold animate-pulse">
          ● REAL_TIME_STREAMING
        </div>
      </div>

      {/* Main Console Output */}
      <div className={`overflow-y-auto pr-2 flex-grow space-y-2 ${heightClass}`}>
        {events.length === 0 ? (
          <div className="text-gray-600 italic select-none h-full flex items-center justify-center">
            Initializing connection... Listening for active agent events on WebSocket bus...
          </div>
        ) : (
          events.map((evt, idx) => {
            const timeStr = new Date(evt.created_at).toLocaleTimeString();
            return (
              <div key={evt.id || idx} className="border-b border-cyber-gray/10 pb-1.5 last:border-0 hover:bg-cyber-gray/10 px-1 rounded transition-colors">
                <span className="text-gray-500 mr-2">[{timeStr}]</span>
                <span className={`mr-2 uppercase tracking-wider font-semibold ${getAgentColor(evt.agent)}`}>
                  [{evt.agent} Agent]
                </span>
                <span className={`mr-2 text-[10px] font-mono ${getEventTypeColor(evt.event_type)}`}>
                  ({evt.event_type})
                </span>
                <span className="text-gray-300">{evt.message}</span>
                
                {/* Expandable payload JSON */}
                {evt.payload && (
                  <pre className="mt-1 ml-6 p-2 bg-cyber-dark border border-cyber-gray/30 rounded text-[10px] text-cyber-cyan overflow-x-auto">
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
