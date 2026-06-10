import React, { useEffect, useState } from "react";

export type PetState = "idle" | "thinking" | "scanning" | "found" | "reporting";

interface PetWidgetProps {
  state: PetState;
  size?: number;
}

export default function PetWidget({ state, size = 80 }: PetWidgetProps) {
  const [isBlinking, setIsBlinking] = useState(false);

  // Periodic Blink Animation: runs every 3 to 5 seconds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const triggerBlink = () => {
      setIsBlinking(true);
      // Eye blink duration: 150ms
      setTimeout(() => setIsBlinking(false), 150);
      
      // Schedule next blink at random interval between 3 and 5 seconds
      const nextInterval = Math.floor(Math.random() * 2000) + 3000;
      timer = setTimeout(triggerBlink, nextInterval);
    };

    // Schedule first blink
    timer = setTimeout(triggerBlink, 3500);

    return () => clearTimeout(timer);
  }, []);

  // Primary neon green glow color (#00FF88)
  const getGlowColor = () => {
    switch (state) {
      case "scanning":
        return "#00FF88";
      case "found":
        return "#ff3366"; // brief red alert flash
      case "reporting":
        return "#00E5FF"; // Accent Glow
      case "thinking":
        return "#ffb700"; // yellow/amber glow
      default:
        return "#00FF88";
    }
  };

  const getContainerAnimations = () => {
    return "";
  };

  const glowColor = getGlowColor();

  return (
    <div className="flex flex-col items-center justify-center font-mono select-none bg-transparent">
      {/* Animated SVG Container */}
      <div 
        className={`relative transition-all duration-300 hover:scale-105 ${getContainerAnimations()}`} 
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          <defs>
            {/* Cyber neon glow filters using theme properties */}
            <filter id="pet-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            <filter id="pet-glow-strong" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.8"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Outer Glow Shadow */}
          <rect
            x="15"
            y="15"
            width="70"
            height="70"
            rx="15"
            fill="none"
            stroke={glowColor}
            strokeWidth="3.5"
            opacity="0.35"
            filter="url(#pet-glow)"
          />

          {/* Main Face Container: Rounded Black Square */}
          <rect
            x="15"
            y="15"
            width="70"
            height="70"
            rx="15"
            fill="#05070a"
            stroke={glowColor}
            strokeWidth="3.5"
            filter="url(#pet-glow)"
            className="transition-all duration-300"
          />

          {/* Eyes & Mouth logic. If blinking is active, eyes render closed */}
          {isBlinking && state !== "scanning" ? (
            <>
              {/* Closed eyes (blinking lines) */}
              <line x1="30" y1="42" x2="42" y2="42" stroke={glowColor} strokeWidth="3.5" strokeLinecap="round" filter="url(#pet-glow)" />
              <line x1="58" y1="42" x2="70" y2="42" stroke={glowColor} strokeWidth="3.5" strokeLinecap="round" filter="url(#pet-glow)" />
              
              {/* smile mouth */}
              <path 
                d="M 44 58 Q 50 62 56 58" 
                stroke={glowColor} 
                strokeWidth="3.5" 
                strokeLinecap="round"
                fill="none" 
                filter="url(#pet-glow)" 
              />
            </>
          ) : (
            <>
              {/* State Specific Eyes & Smile Rendering */}
              {state === "idle" && (
                <>
                  {/* Square glowing eyes */}
                  <rect x="30" y="36" width="12" height="12" rx="2.5" fill="#00FF88" filter="url(#pet-glow)" />
                  <rect x="58" y="36" width="12" height="12" rx="2.5" fill="#00FF88" filter="url(#pet-glow)" />
                  
                  {/* Small smile */}
                  <path 
                    d="M 44 58 Q 50 62 56 58" 
                    stroke="#00FF88" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                    fill="none" 
                    filter="url(#pet-glow)" 
                  />
                </>
              )}

              {state === "thinking" && (
                <>
                  {/* Narrow vertical eyes */}
                  <rect x="34" y="34" width="5" height="16" rx="1.5" fill="#ffb700" filter="url(#pet-glow)" />
                  <rect x="61" y="34" width="5" height="16" rx="1.5" fill="#ffb700" filter="url(#pet-glow)" />
                  
                  {/* Flat line mouth */}
                  <line 
                    x1="45" 
                    y1="58" 
                    x2="55" 
                    y2="58" 
                    stroke="#ffb700" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    filter="url(#pet-glow)"
                  />
                </>
              )}

              {state === "scanning" && (
                <>
                  {/* 3x3 dot matrix grid for eyes */}
                  {/* Left Eye */}
                  <rect x="30" y="35" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="34" y="35" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="38" y="35" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="30" y="39" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="34" y="39" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="38" y="39" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="30" y="43" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="34" y="43" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="38" y="43" width="2.5" height="2.5" fill="#00FF88" />

                  {/* Right Eye */}
                  <rect x="58" y="35" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="62" y="35" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="66" y="35" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="58" y="39" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="62" y="39" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="66" y="39" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="58" y="43" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="62" y="43" width="2.5" height="2.5" fill="#00FF88" />
                  <rect x="66" y="43" width="2.5" height="2.5" fill="#00FF88" />

                  {/* Matrix dot smile */}
                  <rect x="44" y="58" width="3" height="3" fill="#00FF88" />
                  <rect x="48" y="61" width="4" height="3" fill="#00FF88" />
                  <rect x="53" y="58" width="3" height="3" fill="#00FF88" />
                </>
              )}

              {state === "found" && (
                <>
                  {/* Curved closed happy eyes (^^) */}
                  <path 
                    d="M 28 42 Q 35 34 42 42" 
                    stroke="#ff3366" 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    fill="none" 
                    filter="url(#pet-glow-strong)"
                  />
                  <path 
                    d="M 58 42 Q 65 34 72 42" 
                    stroke="#ff3366" 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    fill="none" 
                    filter="url(#pet-glow-strong)"
                  />
                  
                  {/* Smile */}
                  <path 
                    d="M 42 56 Q 50 63 58 56" 
                    stroke="#ff3366" 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    fill="none" 
                    filter="url(#pet-glow-strong)"
                  />
                </>
              )}

              {state === "reporting" && (
                <>
                  {/* Upward curved eyes or reporting arches */}
                  <path 
                    d="M 28 42 Q 35 34 42 42" 
                    stroke="#00E5FF" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    fill="none" 
                    filter="url(#pet-glow)"
                  />
                  <path 
                    d="M 58 42 Q 65 34 72 42" 
                    stroke="#00E5FF" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    fill="none" 
                    filter="url(#pet-glow)"
                  />

                  {/* Smile */}
                  <path 
                    d="M 44 56 Q 50 61 56 56" 
                    stroke="#00E5FF" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    fill="none" 
                    filter="url(#pet-glow)"
                  />
                </>
              )}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
