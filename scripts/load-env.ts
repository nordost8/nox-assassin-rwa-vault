import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Lightweight `.env.local` loader for tsx scripts.
 * Next.js loads `.env.local` automatically for `next dev/build`, but plain Node scripts do not.
 */
function loadEnvFile(fileName: string) {
  const p = resolve(process.cwd(), fileName);
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip optional surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!key) continue;
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

// ---- Compatibility aliases (single-source .env.local) ----
// Some code paths use RPC_URL while others use NEXT_PUBLIC_RPC_URL.
// Make them interchangeable so we can keep one env file.
if (!process.env.NEXT_PUBLIC_RPC_URL && process.env.RPC_URL) {
  process.env.NEXT_PUBLIC_RPC_URL = process.env.RPC_URL;
}
if (!process.env.RPC_URL && process.env.NEXT_PUBLIC_RPC_URL) {
  process.env.RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
}

// WalletConnect / Reown project id is referenced under two names across docs.
if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && process.env.NEXT_PUBLIC_PROJECT_ID) {
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;
}
if (!process.env.NEXT_PUBLIC_PROJECT_ID && process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
  process.env.NEXT_PUBLIC_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
}

