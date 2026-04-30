export type AssetMeta = {
  iconColor: string;
  iconGlyph: string;
  priceUsd: number;
  unit: string;
};

export const ASSET_META: Record<string, AssetMeta> = {
  gold:        { iconColor: "36 47% 65%",  iconGlyph: "Au", priceUsd: 2384.20, unit: "oz" },
  silver:      { iconColor: "0 0% 78%",    iconGlyph: "Ag", priceUsd: 30.45,   unit: "oz" },
  platinum:    { iconColor: "210 12% 70%", iconGlyph: "Pt", priceUsd: 932.10,  unit: "oz" },
  diamond:     { iconColor: "190 80% 80%", iconGlyph: "Di", priceUsd: 6500.00, unit: "ct" },
  oil:         { iconColor: "30 60% 50%",  iconGlyph: "Oi", priceUsd: 78.30,   unit: "bbl" },
  "rare-earth":{ iconColor: "280 50% 65%", iconGlyph: "Re", priceUsd: 412.75,  unit: "kg" },
};
