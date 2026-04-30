"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, X } from "lucide-react";
import { generatePriceHistory, RANGE_DAYS } from "@/lib/price-history";
import { ASSET_META } from "@/lib/asset-meta";
import type { ShieldToken } from "@/lib/tokens";
import AssetIcon from "@/components/AssetIcon";

interface Props {
  asset: (ShieldToken & { rwaId: string }) | null;
  open: boolean;
  onClose: () => void;
}

const RANGES = ["1W", "1M", "3M", "6M", "1Y"] as const;
type Range = typeof RANGES[number];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value?: number }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  if (val == null) return null;
  return (
    <div className="panel px-3 py-2 text-xs font-mono border border-border bg-surface shadow-lg">
      <div className="text-muted-foreground">{label ? format(new Date(label), "MMM d, yyyy") : ""}</div>
      <div className="text-foreground font-semibold mt-0.5">
        ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

function computeTickStep(days: number): number {
  // Keep labels readable and (crucially) evenly spaced by time.
  // The chart still has daily points; we only control which days get labeled.
  if (days <= 7) return 1;     // 1W: daily labels
  if (days <= 30) return 5;    // 1M: every ~5 days
  if (days <= 90) return 7;    // 3M: weekly labels (fixes "May 6 / May 12" irregularity)
  if (days <= 180) return 14;  // 6M: every ~2 weeks
  return 30;                   // 1Y: monthly-ish labels
}

export default function PriceChartModal({ asset, open, onClose }: Props) {
  const [range, setRange] = useState<Range>("3M");

  const { chartData, ticks, days, startPrice, endPrice, pctChange, dollarChange, up } = useMemo(() => {
    if (!asset) return { chartData: [], ticks: [], days: 0, startPrice: 0, endPrice: 0, pctChange: 0, dollarChange: 0, up: true };
    const basePrice = ASSET_META[asset.rwaId]?.priceUsd ?? 100;
    const full = generatePriceHistory(asset.rwaId, basePrice);
    const days = RANGE_DAYS[range] ?? 90;
    const slice = full.slice(0, Math.min(days + 1, full.length));
    const step = computeTickStep(days);
    const chartData = slice.map(p => ({
      // Keep a numeric axis value, format via tickFormatter to avoid odd quote artifacts.
      t: p.date.getTime(),
      price: Math.round(p.price * 100) / 100,
    }));
    const ticks = slice
      .filter((_, i) => i === 0 || i === slice.length - 1 || i % step === 0)
      .map(p => p.date.getTime());
    const sp = slice[0]?.price ?? basePrice;
    const ep = slice[slice.length - 1]?.price ?? basePrice;
    return {
      chartData,
      ticks,
      days,
      startPrice: sp,
      endPrice: ep,
      pctChange: ((ep - sp) / sp) * 100,
      dollarChange: ep - sp,
      up: ep >= sp,
    };
  }, [asset, range]);

  const meta = asset ? ASSET_META[asset.rwaId] : null;
  const accentColor = up ? "hsl(142 71% 45%)" : "hsl(0 84% 60%)";
  const gradientId = `grad-${asset?.rwaId ?? "x"}`;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="bg-surface border-border max-w-2xl p-0">
        <DialogHeader className="panel-header">
          <DialogTitle className="terminal-heading text-sm flex items-center gap-2">
            {asset && <AssetIcon assetId={asset.rwaId} size={20} />}
            {asset?.name ?? "Asset"} · Price Forecast
          </DialogTitle>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground transition">
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="p-5 md:p-6 space-y-5">
          {/* Price header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="terminal-label">Current Price</div>
              <div className="num text-3xl mt-1">
                ${startPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs text-muted-foreground ml-2 font-sans">/{meta?.unit}</span>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-sm border text-sm font-semibold font-mono ${up ? "border-success/40 bg-success/5 text-success" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
              {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>
                {up ? "+" : ""}{dollarChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {" "}({up ? "+" : ""}{pctChange.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Range selector */}
          <div className="flex items-center gap-1">
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] font-semibold rounded-sm transition border ${
                  r === range
                    ? "bg-primary/10 border-primary/50 text-primary"
                    : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
            <span className="ml-auto terminal-label normal-case tracking-normal text-[10px]">
              Simulated · 1yr forecast from today&apos;s spot
            </span>
          </div>

          {/* Chart */}
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="t"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  scale="time"
                  ticks={ticks}
                  interval={0}
                  minTickGap={18}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-jetbrains-mono)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => {
                    const d = new Date(Number(v));
                    if (days <= 30) return format(d, "MMM d");
                    if (days <= 180) return format(d, "MMM d");
                    // 1Y: month + year, no apostrophes
                    return format(d, "MMM yy");
                  }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "var(--font-jetbrains-mono)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${Number(v).toLocaleString()}`}
                  width={64}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={accentColor}
                  strokeWidth={1.5}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 4, fill: accentColor, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* End-of-range projection */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              <div className="terminal-label">Projected at end of {range}</div>
              <div className="num text-lg mt-0.5" style={{ color: accentColor }}>
                ${endPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-right">
              <div className="terminal-label">Model</div>
              <div className="font-mono text-[10px] text-muted-foreground mt-0.5">GBM · Seeded simulation</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
