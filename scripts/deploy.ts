import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import "./load-env";
import { updateEnvLocalWithDemoAddresses } from "./update-env-local-contracts";

type Env = {
  RPC_URL: string;
  PRIVATE_KEY: string;
};

function getEnv(): Env {
  const RPC_URL = process.env.RPC_URL?.trim() ?? process.env.NEXT_PUBLIC_RPC_URL?.trim() ?? "";
  /** Same test deployer as `SENDER_PRIVATE_KEY` in `.env.local` (see scripts/setup-wallets.ts). */
  const PRIVATE_KEY = process.env.PRIVATE_KEY?.trim() || process.env.SENDER_PRIVATE_KEY?.trim() || "";
  if (!RPC_URL) throw new Error("Missing RPC_URL env (Arbitrum Sepolia RPC).");
  if (!PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY (or SENDER_PRIVATE_KEY) — deployer key for forge/cast.");
  return { RPC_URL, PRIVATE_KEY };
}

function resolveFoundryBin(name: "forge" | "cast"): string {
  const home = process.env.HOME?.trim() ?? "";
  const candidate = home ? join(home, ".foundry", "bin", name) : "";
  return candidate && existsSync(candidate) ? candidate : name;
}

function redactSecrets(s: string): string {
  // Avoid leaking private keys in thrown errors / logs.
  return (
    s
      // Common CLI shape in this repo:
      .replace(/(--private-key)\s+0x[a-fA-F0-9]{64}\b/g, "$1 [REDACTED]")
      // Fallback: redact any raw 0x + 64 hex token (private key shaped).
      .replace(/\b0x[a-fA-F0-9]{64}\b/g, "0x[REDACTED]")
  );
}

function runForge(args: string[]): string {
  const forge = resolveFoundryBin("forge");
  try {
    return execFileSync(forge, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) {
    const msg = e instanceof Error ? redactSecrets(e.message) : redactSecrets(String(e));
    throw new Error(msg);
  }
}

function runCast(args: string[]): string {
  const cast = resolveFoundryBin("cast");
  try {
    return execFileSync(cast, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) {
    const msg = e instanceof Error ? redactSecrets(e.message) : redactSecrets(String(e));
    throw new Error(msg);
  }
}

function parseDeployedAddress(out: string): string {
  // Foundry >=1.5: `forge create --json` emits JSON logs (preferred).
  const braceIdx = out.indexOf("{");
  if (braceIdx !== -1) {
    const jsonSlice = out.slice(braceIdx);
    try {
      const parsed = JSON.parse(jsonSlice) as { deployedTo?: string; contractAddress?: string };
      const addr = parsed.deployedTo ?? parsed.contractAddress;
      if (addr && /^0x[a-fA-F0-9]{40}$/.test(addr)) return addr;
    } catch {
      // fall through
    }
  }

  // Legacy text output (older Foundry): `Deployed to: 0x...`
  const legacy = out.match(/Deployed to:\s*(0x[a-fA-F0-9]{40})/);
  if (legacy?.[1]) return legacy[1];

  // Last-resort: pick the last bare 0x address-looking token in the output.
  const matches = out.match(/\b0x[a-fA-F0-9]{40}\b/g);
  if (matches?.length) return matches[matches.length - 1]!;

  throw new Error(`Could not parse deployed address from output:\n${out}`);
}

function main() {
  const { RPC_URL, PRIVATE_KEY } = getEnv();

  console.log("Building contracts…");
  runForge(["build"]);

  console.log("Deploying DemoAsset…");
  const deployer = runCast(["wallet", "address", "--private-key", PRIVATE_KEY]);
  const demoOut = runForge([
    "create",
    "--json",
    "--broadcast",
    "src/contracts/DemoAsset.sol:DemoAsset",
    "--rpc-url",
    RPC_URL,
    "--private-key",
    PRIVATE_KEY,
    "--constructor-args",
    deployer,
  ]);
  const demoAsset = parseDeployedAddress(demoOut);
  console.log(`DemoAsset: ${demoAsset}`);

  console.log("Deploying ConfidentialDemoAsset…");
  const wrapOut = runForge([
    "create",
    "--json",
    "--broadcast",
    "src/contracts/ConfidentialDemoAsset.sol:ConfidentialDemoAsset",
    "--rpc-url",
    RPC_URL,
    "--private-key",
    PRIVATE_KEY,
    "--constructor-args",
    demoAsset,
  ]);
  const wrapper = parseDeployedAddress(wrapOut);
  console.log(`ConfidentialDemoAsset: ${wrapper}`);

  console.log("Deploying Faucet…");
  const faucetOut = runForge([
    "create",
    "--json",
    "--broadcast",
    "src/contracts/Faucet.sol:Faucet",
    "--rpc-url",
    RPC_URL,
    "--private-key",
    PRIVATE_KEY,
    "--constructor-args",
    demoAsset,
  ]);
  const faucet = parseDeployedAddress(faucetOut);
  console.log(`Faucet: ${faucet}`);

  console.log("Granting Faucet mint rights on DemoAsset…");
  runCast([
    "send",
    "--rpc-url",
    RPC_URL,
    "--private-key",
    PRIVATE_KEY,
    demoAsset,
    "setMinter(address,bool)",
    faucet,
    "true",
  ]);

  updateEnvLocalWithDemoAddresses({
    demoAsset: demoAsset as `0x${string}`,
    confidentialWrapper: wrapper as `0x${string}`,
    faucet: faucet as `0x${string}`,
  });
}

main();

