import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Writes deployed demo contract addresses into `.env.local` for Next + CLI scripts
 * (single developer file). Updates existing keys or appends.
 */
export function updateEnvLocalWithDemoAddresses(params: {
  demoAsset: `0x${string}`;
  confidentialWrapper: `0x${string}`;
  faucet: `0x${string}`;
}): void {
  const p = resolve(process.cwd(), ".env.local");
  let text = existsSync(p) ? readFileSync(p, "utf8") : "";

  const setOrReplace = (key: string, value: string) => {
    const re = new RegExp(`^${key}=.*$`, "m");
    const line = `${key}=${value}`;
    if (re.test(text)) {
      text = text.replace(re, line);
    } else {
      const trimmed = text.trimEnd();
      text = trimmed + (trimmed ? "\n" : "") + line + "\n";
    }
  };

  setOrReplace("NEXT_PUBLIC_DEMO_ASSET_ADDRESS", params.demoAsset);
  setOrReplace("NEXT_PUBLIC_DEMO_CONFIDENTIAL_WRAPPER_ADDRESS", params.confidentialWrapper);
  setOrReplace("NEXT_PUBLIC_DEMO_FAUCET_ADDRESS", params.faucet);

  writeFileSync(p, text, { encoding: "utf8", mode: 0o600 });
  console.log(`\nUpdated ${p} (NEXT_PUBLIC_DEMO_* for app + e2e fallbacks).`);
}
