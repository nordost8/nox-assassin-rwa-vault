import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import "./load-env";

function getEnv() {
  const RPC_URL = process.env.RPC_URL?.trim() ?? process.env.NEXT_PUBLIC_RPC_URL?.trim() ?? "";
  const PRIVATE_KEY = process.env.PRIVATE_KEY?.trim() || process.env.SENDER_PRIVATE_KEY?.trim() || "";
  if (!RPC_URL) throw new Error("Missing RPC_URL");
  if (!PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY");
  return { RPC_URL, PRIVATE_KEY };
}

function resolveForge(): string {
  const home = process.env.HOME?.trim() ?? "";
  const candidate = home ? join(home, ".foundry", "bin", "forge") : "";
  return candidate && existsSync(candidate) ? candidate : "forge";
}

function runForge(args: string[]): string {
  try {
    return execFileSync(resolveForge(), args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : String(e));
  }
}

function parseAddr(out: string): string {
  const braceIdx = out.indexOf("{");
  if (braceIdx !== -1) {
    try {
      const p = JSON.parse(out.slice(braceIdx)) as { deployedTo?: string; contractAddress?: string };
      const addr = p.deployedTo ?? p.contractAddress;
      if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) return addr;
    } catch { /* fall through */ }
  }
  const m = out.match(/Deployed to:\s*(0x[a-fA-F0-9]{40})/);
  if (m?.[1]) return m[1];
  const all = out.match(/\b0x[a-fA-F0-9]{40}\b/g);
  if (all?.length) return all[all.length - 1]!;
  throw new Error(`Cannot parse address from:\n${out}`);
}

function updateEnvLocal(vaultAddress: string) {
  const envPath = join(process.cwd(), ".env.local");
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const key = "NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS";
  const line = `${key}=${vaultAddress}`;
  if (content.includes(key)) {
    content = content.replace(new RegExp(`^${key}=.*$`, "m"), line);
  } else {
    content += `\n${line}\n`;
  }
  writeFileSync(envPath, content, "utf8");
  console.log(`Updated .env.local: ${key}=${vaultAddress}`);
}

function main() {
  const { RPC_URL, PRIVATE_KEY } = getEnv();
  console.log("Building contracts…");
  runForge(["build"]);

  console.log("Deploying ConfidentialVault…");
  const out = runForge([
    "create",
    "--json",
    "--broadcast",
    "src/contracts/ConfidentialVault.sol:ConfidentialVault",
    "--rpc-url", RPC_URL,
    "--private-key", PRIVATE_KEY,
  ]);
  const addr = parseAddr(out);
  console.log(`ConfidentialVault: ${addr}`);
  updateEnvLocal(addr);
  console.log("Done.");
}

main();
