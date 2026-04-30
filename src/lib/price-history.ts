export type PricePoint = { date: Date; price: number };

// Asset-specific GBM params (annual drift and volatility)
const PARAMS: Record<string, { drift: number; vol: number }> = {
  gold:        { drift: 0.07,  vol: 0.15 },
  silver:      { drift: 0.04,  vol: 0.28 },
  platinum:    { drift: 0.02,  vol: 0.22 },
  diamond:     { drift: 0.035, vol: 0.10 },
  oil:         { drift: 0.03,  vol: 0.38 },
  "rare-earth":{ drift: 0.06,  vol: 0.24 },
};

// Mulberry32 seeded PRNG — deterministic per asset so history is stable across renders
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strToSeed(s: string): number {
  let h = 0xdeadbeef;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 2246822519);
  return (h ^ (h >>> 16)) >>> 0;
}

// Box-Muller transform: uniform → standard normal
function boxMuller(u1: number, u2: number): number {
  return Math.sqrt(-2 * Math.log(u1 + 1e-10)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Generates 366 daily price points starting from today, simulated 1 year forward.
 * Index 0 = today's price (startPrice), index 365 = ~1 year from now.
 * Same asset always produces the same path (seeded PRNG).
 */
export function generatePriceHistory(assetId: string, startPrice: number): PricePoint[] {
  const { drift = 0.05, vol = 0.20 } = PARAMS[assetId] ?? {};
  const rand = mulberry32(strToSeed(assetId));
  const dt = 1 / 365;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const points: PricePoint[] = [{ date: new Date(today), price: startPrice }];
  let price = startPrice;

  for (let i = 1; i <= 365; i++) {
    const z = boxMuller(rand(), rand());
    price = price * Math.exp((drift - 0.5 * vol * vol) * dt + vol * Math.sqrt(dt) * z);
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    points.push({ date, price });
  }

  return points;
}

export const RANGE_DAYS: Record<string, number> = {
  "1W":  7,
  "1M":  30,
  "3M":  90,
  "6M":  180,
  "1Y":  365,
};
