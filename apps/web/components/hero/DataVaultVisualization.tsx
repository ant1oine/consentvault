'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function DataVaultVisualization() {
  const shouldReduceMotion = useReducedMotion();
  const [time, setTime] = useState(0);

  const radius = 160; // larger orbit radius
  const nodes = [
    { label: 'Consent', angle: 0 },
    { label: 'Residency', angle: 72 },
    { label: 'Audit', angle: 144 },
    { label: 'Evidence', angle: 216 },
    { label: 'Governance', angle: 288 },
  ];

  useEffect(() => {
    if (shouldReduceMotion) return;
    
    const interval = setInterval(() => setTime((t) => t + 0.01), 50);
    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  return (
    <div className="relative w-full max-w-[640px] h-[520px] mx-auto flex items-center justify-center select-none">
      {/* Faint gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#EEF2FF] to-[#F9FAFB] blur-2xl opacity-60 rounded-full -z-10" />
      
      <svg viewBox="0 0 640 520" className="w-full h-full">
        <defs>
          <radialGradient id="vaultGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1E3A8A" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="linkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00A5A5" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Static glow + vault */}
        <motion.circle
          cx="320"
          cy="260"
          r="120"
          fill="url(#vaultGlow)"
          animate={shouldReduceMotion ? {} : {
            scale: [1, 1.05, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <circle
          cx="320"
          cy="260"
          r="60"
          fill="#fff"
          stroke="#1E3A8A"
          strokeWidth="2.5"
        />
        <text
          x="320"
          y="266"
          textAnchor="middle"
          fontSize="20"
          fill="#0F172A"
          fontWeight="700"
          fontFamily="IBM Plex Sans, sans-serif"
        >
          Data Vault
        </text>

        {/* Dynamic orbiting nodes */}
        {nodes.map((node, i) => {
          const base = (node.angle * Math.PI) / 180;
          const angle = shouldReduceMotion ? base : base + time * 0.4; // slow rotation
          
          // Round to 2 decimal places for hydration consistency
          const x = Math.round((320 + radius * Math.cos(angle)) * 100) / 100;
          const y = Math.round((260 + radius * Math.sin(angle)) * 100) / 100;

          // Compute line endpoint so it touches vault edge, not center
          const vaultEdgeX = Math.round((320 + 60 * Math.cos(angle)) * 100) / 100;
          const vaultEdgeY = Math.round((260 + 60 * Math.sin(angle)) * 100) / 100;

          // Calculate node edge point (line connects to node edge, not center)
          const nodeEdgeX = Math.round((x - 26 * Math.cos(angle)) * 100) / 100;
          const nodeEdgeY = Math.round((y - 26 * Math.sin(angle)) * 100) / 100;

          return (
            <g key={i}>
              {/* Connecting line from vault edge to node edge */}
              <line
                x1={vaultEdgeX}
                y1={vaultEdgeY}
                x2={nodeEdgeX}
                y2={nodeEdgeY}
                stroke="url(#linkGradient)"
                strokeWidth="1.6"
                opacity="0.6"
              />

              {/* Node */}
              <circle
                cx={x}
                cy={y}
                r="26"
                fill="#FFFFFF"
                stroke="#CBD5E1"
                strokeWidth="1.5"
                filter="drop-shadow(0 3px 6px rgba(0,0,0,0.06))"
              />

              {/* Always upright text - compensates for orbit rotation */}
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                fontSize="13"
                fill="#1E3A8A"
                fontWeight="500"
                fontFamily="IBM Plex Sans, sans-serif"
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  transform: shouldReduceMotion ? 'none' : `rotate(${-node.angle - time * 23}deg)`, // compensate orbit rotation
                }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

