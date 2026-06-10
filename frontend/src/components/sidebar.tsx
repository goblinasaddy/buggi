import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, Shield, List, FileText, LayoutDashboard, Cpu } from "lucide-react";

interface SidebarProps {
  statusText?: string;
  activeScanCount?: number;
}

export default function Sidebar({ statusText = "STANDBY", activeScanCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { name: "DASHBOARD", path: "/", icon: LayoutDashboard },
    { name: "SCANS", path: "/scans/", icon: Terminal },
    { name: "FINDINGS", path: "/findings/", icon: Shield },
    { name: "REPORTS", path: "/reports/", icon: FileText },
  ];

  return (
    <div className="w-64 bg-cyber-dark border-r border-cyber-gray flex flex-col justify-between h-screen text-xs p-4 select-none">
      <div>
        {/* Title branding */}
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-5 h-5 bg-cyber-green border border-cyber-green rounded-sm flex items-center justify-center animate-pulse shadow-[0_0_8px_#00ff66]">
            <span className="text-[10px] font-bold text-cyber-black">B</span>
          </div>
          <span className="text-base font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyber-green to-cyber-cyan">
            BUGGI // CLI
          </span>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Handle NextJS dynamic sub-paths matching
            const isActive = pathname === item.path || (item.path !== "/" && pathname?.startsWith(item.path));
            return (
              <Link
                key={item.name}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded transition-all border duration-150 ${
                  isActive
                    ? "bg-cyber-gray/50 border-cyber-green/50 text-cyber-green shadow-[0_0_10px_rgba(0,255,102,0.1)] font-bold"
                    : "border-transparent text-gray-400 hover:bg-cyber-gray/30 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyber-green" : "text-gray-400"}`} />
                <span className="tracking-widest">{item.name}</span>
                {item.name === "SCANS" && activeScanCount > 0 && (
                  <span className="ml-auto bg-cyber-green text-cyber-black font-bold px-1.5 py-0.5 rounded-sm text-[9px] animate-pulse">
                    {activeScanCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System Status telemetry */}
      <div className="bg-cyber-black border border-cyber-gray p-3 rounded space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">SYSTEM STATE:</span>
          <span className={`font-bold tracking-widest ${
            statusText === "SCANNING" 
              ? "text-cyber-cyan animate-pulse" 
              : statusText === "ALERT" 
              ? "text-cyber-red animate-bounce" 
              : "text-cyber-green"
          }`}>
            {statusText}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">CORE MODULE:</span>
          <span className="text-cyber-green font-bold flex items-center gap-1">
            <Cpu className="w-3 h-3 text-cyber-green" /> RAVEN-X
          </span>
        </div>
        <div className="w-full bg-cyber-gray h-1 rounded-full overflow-hidden mt-1">
          <div className={`h-full rounded-full transition-all duration-500 ${
            statusText === "SCANNING" ? "bg-cyber-cyan w-3/4 animate-pulse" : "bg-cyber-green w-full"
          }`} />
        </div>
      </div>
    </div>
  );
}
