import React from 'react';

interface ScoreRingProps {
  score: number; // 0-100
  size?: number; // px, fixed
  label?: string;
}

const R = 50;
const CIRC = 2 * Math.PI * R;

export const ScoreRing: React.FC<ScoreRingProps> = ({ score, size = 120, label }) => {
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (CIRC * clamped) / 100;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? ''} ${clamped} / 100`.trim()}
    >
      <svg viewBox="0 0 120 120" width={size} height={size} className="block">
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" className="stroke-token-raised" />
        {clamped > 0 && (
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC}`}
          transform="rotate(-90 60 60)"
          className="stroke-token-accent"
        />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black leading-none text-token-text">{clamped}</span>
        <span className="mt-1 text-xs text-token-muted">/100</span>
      </div>
    </div>
  );
};
