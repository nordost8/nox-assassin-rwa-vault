export type RwaAsset = {
  id: string;
  name: string;
  symbol: string;
  emoji: string;
  description: string;
  category: string;
};

export const RWA_ASSETS: RwaAsset[] = [
  {
    id: "gold",
    name: "Gold",
    symbol: "XAU",
    emoji: "🥇",
    description: "The ultimate store of value — tokenized & private",
    category: "Precious Metals",
  },
  {
    id: "platinum",
    name: "Platinum",
    symbol: "XPT",
    emoji: "⚗️",
    description: "Rarer than gold — industrial & investment grade",
    category: "Precious Metals",
  },
  {
    id: "oil",
    name: "Brent Crude Oil",
    symbol: "BRENT",
    emoji: "🛢️",
    description: "Global energy benchmark — confidential exposure",
    category: "Energy",
  },
  {
    id: "diamond",
    name: "Diamond",
    symbol: "DMND",
    emoji: "💎",
    description: "Luxury hard asset — private ownership on-chain",
    category: "Luxury Assets",
  },
  {
    id: "rare-earth",
    name: "Rare Earth Elements",
    symbol: "REE",
    emoji: "🌍",
    description: "Critical tech materials — strategic reserve tokenized",
    category: "Strategic Materials",
  },
  {
    id: "silver",
    name: "Silver",
    symbol: "XAG",
    emoji: "🪙",
    description: "Industrial & monetary metal — confidential allocation",
    category: "Precious Metals",
  },
];

const STORAGE_KEY = "nox_selected_rwa";

export function getSelectedAssets(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}

export function saveSelectedAssets(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  try {
    window.dispatchEvent(new Event("nox_selected_rwa_changed"));
  } catch {
    // ignore
  }
}

export function hasSelectedAssets(): boolean {
  return getSelectedAssets().length > 0;
}
