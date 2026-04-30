import { ASSET_META } from "@/lib/asset-meta";

interface Props {
  assetId: string;
  size?: number;
}

export default function AssetIcon({ assetId, size = 32 }: Props) {
  const meta = ASSET_META[assetId];
  const iconColor = meta?.iconColor ?? "0 0% 50%";
  const iconGlyph = meta?.iconGlyph ?? assetId.slice(0, 2).toUpperCase();

  return (
    <div
      className="rounded-sm flex items-center justify-center font-mono font-semibold border shrink-0"
      style={{
        width: size,
        height: size,
        background: `hsl(${iconColor} / 0.12)`,
        borderColor: `hsl(${iconColor} / 0.4)`,
        color: `hsl(${iconColor})`,
        fontSize: size * 0.38,
      }}
    >
      {iconGlyph}
    </div>
  );
}
