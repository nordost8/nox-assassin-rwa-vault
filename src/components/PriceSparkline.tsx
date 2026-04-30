"use client";

import { useMemo } from "react";
import { generatePriceHistory } from "@/lib/price-history";
import { ASSET_META } from "@/lib/asset-meta";

interface Props {
  assetId: string;
  days?: number;
  width?: number;
  height?: number;
  onClick?: () => void;
}

export default function PriceSparkline({ assetId, days = 90, width = 100, height = 28, onClick }: Props) {
  const data = useMemo(() => {
    const startPrice = ASSET_META[assetId]?.priceUsd ?? 100;
    const full = generatePriceHistory(assetId, startPrice);
    return full.slice(0, Math.min(days, full.length));
  }, [assetId, days]);

  if (data.length < 2) return null;

  const prices = data.map(p => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = prices
    .map((p, i) => {
      const x = pad + (i / (prices.length - 1)) * w;
      const y = pad + (1 - (p - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const first = prices[0];
  const last = prices[prices.length - 1];
  const pct = ((last - first) / first) * 100;
  const up = last >= first;
  const color = up ? "hsl(142 71% 45%)" : "hsl(0 84% 60%)";
  const sign = up ? "+" : "";

  return (
    <div
      className="flex items-center gap-1.5"
      onClick={onClick}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", flexShrink: 0 }}>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="font-mono text-[9px] tabular-nums shrink-0"
        style={{ color }}
      >
        {sign}{pct.toFixed(1)}%
      </span>
    </div>
  );
}
