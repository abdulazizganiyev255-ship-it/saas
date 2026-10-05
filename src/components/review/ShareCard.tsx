import React, { forwardRef } from 'react';
import type { Language } from '../../types';
import { t, tf } from '../../i18n';
import { APP_NAME } from '../../config/constants';

export interface ShareCardProps {
  lang: Language;
  weekNumber: number;
  score: number;
  activeDays: number;
  weeklyXP: number;
  rank: number | null;
  nickname: string;
  teamName: string;
}

const R = 222;
const CIRC = 2 * Math.PI * R;
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

/** 1080x1350 (4:5) share image. Colors use CSS variables, resolved at export time. */
export const ShareCard = forwardRef<SVGSVGElement, ShareCardProps>(function ShareCard(
  { lang, weekNumber, score, activeDays, weeklyXP, rank, nickname, teamName },
  ref
) {
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (CIRC * clamped) / 100;
  const tiles = [
    { value: `${activeDays} / 7`, label: t('wrActiveDays', lang) },
    { value: String(weeklyXP), label: t('wrWeeklyXP', lang) },
    { value: rank ? `#${rank}` : '–', label: t('shareTeamRank', lang) },
  ];

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1080 1350"
      width="1080"
      height="1350"
      style={{ width: '100%', height: 'auto', display: 'block' }}
      fontFamily={FONT}
    >
      <rect width="1080" height="1350" style={{ fill: 'var(--bg)' }} />

      {/* Header */}
      <rect x="80" y="80" width="64" height="64" rx="16" style={{ fill: 'var(--accent)' }} />
      <text x="164" y="124" fontSize="40" fontWeight="800" style={{ fill: 'var(--text)' }}>
        {APP_NAME}
      </text>
      <text x="1000" y="124" fontSize="34" fontWeight="600" textAnchor="end" style={{ fill: 'var(--muted)' }}>
        {tf('shareWeek', lang, { n: weekNumber })}
      </text>

      {/* Ring */}
      <circle cx="540" cy="520" r={R} fill="none" strokeWidth="36" style={{ stroke: 'var(--raised)' }} />
      <circle
        cx="540"
        cy="520"
        r={R}
        fill="none"
        strokeWidth="36"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${CIRC}`}
        transform="rotate(-90 540 520)"
        style={{ stroke: 'var(--accent)' }}
      />
      <text x="540" y="570" fontSize="200" fontWeight="800" textAnchor="middle" style={{ fill: 'var(--text)' }}>
        {clamped}
      </text>
      <text x="540" y="630" fontSize="40" textAnchor="middle" style={{ fill: 'var(--muted)' }}>
        /100
      </text>
      <text x="540" y="860" fontSize="48" fontWeight="700" textAnchor="middle" style={{ fill: 'var(--text)' }}>
        {t('wrScore', lang)}
      </text>

      {/* Tiles */}
      {tiles.map((tile, i) => {
        const x = 80 + i * 313;
        return (
          <g key={tile.label}>
            <rect x={x} y="920" width="294" height="190" rx="28" style={{ fill: 'var(--card)', stroke: 'var(--raised)' }} strokeWidth="2" />
            <text x={x + 147} y="1005" fontSize="60" fontWeight="800" textAnchor="middle" style={{ fill: 'var(--text)' }}>
              {tile.value}
            </text>
            <text x={x + 147} y="1062" fontSize="28" textAnchor="middle" style={{ fill: 'var(--muted)' }}>
              {tile.label}
            </text>
          </g>
        );
      })}

      {/* Footer */}
      <text x="80" y="1226" fontSize="38" fontWeight="700" style={{ fill: 'var(--text)' }}>
        {nickname} · {tf('lbTeamOf', lang, { name: teamName })}
      </text>
      <text x="80" y="1278" fontSize="30" style={{ fill: 'var(--muted)' }}>
        {t('shareTagline', lang)}
      </text>
    </svg>
  );
});

/** Serialize the SVG with CSS variables resolved, render to PNG and trigger a download. */
export async function downloadShareCardPng(svg: SVGSVGElement, fileName: string): Promise<void> {
  const cs = getComputedStyle(document.documentElement);
  const resolved = new XMLSerializer()
    .serializeToString(svg)
    .replace(/var\((--[a-z0-9-]+)\)/gi, (_m, name: string) => cs.getPropertyValue(name).trim() || 'currentColor');

  const blob = new Blob([resolved], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('share card render failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.drawImage(img, 0, 0, 1080, 1350);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error('png export failed');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(png);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
