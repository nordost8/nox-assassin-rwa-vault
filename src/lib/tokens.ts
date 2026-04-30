import { getAddress, isAddress, zeroAddress, type Address } from "viem";
import { TARGET_CHAIN_ID } from "@/lib/chains";
import { RWA_ASSETS, getSelectedAssets } from "@/lib/rwa-assets";

export type ShieldToken = {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  underlyingAddress: Address;
  confidentialWrapperAddress: Address;
  chainId: number;
  isDemoAsset: boolean;
  isRwaLike: boolean;
  iconId?: string;
  logo?: string;
};

function parseAddr(raw: string | undefined): Address | null {
  const v = raw?.trim();
  if (!v || !isAddress(v, { strict: false })) return null;
  const a = getAddress(v);
  if (a === zeroAddress) return null;
  return a;
}

// Static map — Next.js only inlines NEXT_PUBLIC_ vars that are referenced literally
const RWA_ADDRS: Record<string, { asset: string | undefined; wrapper: string | undefined }> = {
  "gold":       { asset: process.env.NEXT_PUBLIC_RWA_GOLD_ASSET,       wrapper: process.env.NEXT_PUBLIC_RWA_GOLD_WRAPPER },
  "platinum":   { asset: process.env.NEXT_PUBLIC_RWA_PLATINUM_ASSET,   wrapper: process.env.NEXT_PUBLIC_RWA_PLATINUM_WRAPPER },
  "oil":        { asset: process.env.NEXT_PUBLIC_RWA_OIL_ASSET,        wrapper: process.env.NEXT_PUBLIC_RWA_OIL_WRAPPER },
  "diamond":    { asset: process.env.NEXT_PUBLIC_RWA_DIAMOND_ASSET,    wrapper: process.env.NEXT_PUBLIC_RWA_DIAMOND_WRAPPER },
  "silver":     { asset: process.env.NEXT_PUBLIC_RWA_SILVER_ASSET,     wrapper: process.env.NEXT_PUBLIC_RWA_SILVER_WRAPPER },
  "rare-earth": { asset: process.env.NEXT_PUBLIC_RWA_RARE_EARTH_ASSET, wrapper: process.env.NEXT_PUBLIC_RWA_RARE_EARTH_WRAPPER },
};

export function getRwaEnvDiagnostics(selectedIds: string[]) {
  const issues: Array<{ id: string; missing: Array<"asset" | "wrapper">; raw?: { asset?: string; wrapper?: string } }> = [];
  for (const id of selectedIds) {
    const entry = RWA_ADDRS[id];
    if (!entry) {
      issues.push({ id, missing: ["asset", "wrapper"] });
      continue;
    }
    const missing: Array<"asset" | "wrapper"> = [];
    if (!parseAddr(entry.asset)) missing.push("asset");
    if (!parseAddr(entry.wrapper)) missing.push("wrapper");
    if (missing.length) issues.push({ id, missing, raw: { asset: entry.asset, wrapper: entry.wrapper } });
  }
  return { issues };
}

export function getRwaContractAddrs(assetId: string): { underlying: Address; wrapper: Address } | null {
  const entry = RWA_ADDRS[assetId];
  if (!entry) return null;
  const underlying = parseAddr(entry.asset);
  const wrapper = parseAddr(entry.wrapper);
  if (!underlying || !wrapper) return null;
  return { underlying, wrapper };
}

// Returns tokens for the user's selected RWA assets (reads localStorage).
// Each selected asset maps to its own on-chain contract pair.
export function getRwaTokens(): ShieldToken[] {
  const selected = getSelectedAssets();
  const tokens: ShieldToken[] = [];
  for (const id of selected) {
    const asset = RWA_ASSETS.find((a) => a.id === id);
    if (!asset) continue;
    const addrs = getRwaContractAddrs(id);
    if (!addrs) continue;
    tokens.push({
      id: `rwa-${asset.id}`,
      name: `Tokenized ${asset.name}`,
      symbol: asset.symbol,
      decimals: 18,
      underlyingAddress: addrs.underlying,
      confidentialWrapperAddress: addrs.wrapper,
      chainId: TARGET_CHAIN_ID,
      isDemoAsset: true,
      isRwaLike: true,
      iconId: asset.id,
    });
  }
  return tokens;
}

export function getFaucetAddress(): Address | null {
  return parseAddr(process.env.NEXT_PUBLIC_DEMO_FAUCET_ADDRESS);
}
