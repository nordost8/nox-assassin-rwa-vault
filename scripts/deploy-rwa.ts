import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import "./load-env";

const RWA_ASSETS = [
  { id: "gold",       name: "Tokenized Gold",               symbol: "XAU",   cSymbol: "cXAU"   },
  { id: "platinum",   name: "Tokenized Platinum",           symbol: "XPT",   cSymbol: "cXPT"   },
  { id: "oil",        name: "Tokenized Brent Crude Oil",    symbol: "BRENT", cSymbol: "cBRENT" },
  { id: "diamond",    name: "Tokenized Diamond",            symbol: "DMND",  cSymbol: "cDMND"  },
  { id: "silver",     name: "Tokenized Silver",             symbol: "XAG",   cSymbol: "cXAG"   },
  { id: "rare-earth", name: "Tokenized Rare Earth Element", symbol: "REE",   cSymbol: "cREE"   },
];

function resolveFoundryBin(name: "forge" | "cast"): string {
  const home = process.env.HOME?.trim() ?? "";
  const candidate = home ? join(home, ".foundry", "bin", name) : "";
  return candidate && existsSync(candidate) ? candidate : name;
}

function redact(s: string) {
  return s.replace(/(--private-key)\s+0x[a-fA-F0-9]{64}\b/g, "$1 [REDACTED]")
          .replace(/\b0x[a-fA-F0-9]{64}\b/g, "0x[REDACTED]");
}

function runForge(args: string[]): string {
  try {
    return execFileSync(resolveFoundryBin("forge"), args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) { throw new Error(redact(e instanceof Error ? e.message : String(e))); }
}

function runCast(args: string[]): string {
  try {
    return execFileSync(resolveFoundryBin("cast"), args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) { throw new Error(redact(e instanceof Error ? e.message : String(e))); }
}

function parseAddr(out: string): string {
  const braceIdx = out.indexOf("{");
  if (braceIdx !== -1) {
    try {
      const p = JSON.parse(out.slice(braceIdx)) as { deployedTo?: string; contractAddress?: string };
      const a = p.deployedTo ?? p.contractAddress;
      if (a && /^0x[a-fA-F0-9]{40}$/.test(a)) return a;
    } catch { /**/ }
  }
  const legacy = out.match(/Deployed to:\s*(0x[a-fA-F0-9]{40})/);
  if (legacy?.[1]) return legacy[1];
  const matches = out.match(/\b0x[a-fA-F0-9]{40}\b/g);
  if (matches?.length) return matches[matches.length - 1]!;
  throw new Error(`Cannot parse address from:\n${out}`);
}

function updateEnv(additions: Record<string, string>) {
  const envPath = join(process.cwd(), ".env.local");
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

  for (const [key, value] of Object.entries(additions)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }
  writeFileSync(envPath, content, "utf8");
}

async function main() {
  const RPC_URL = process.env.RPC_URL?.trim() ?? process.env.NEXT_PUBLIC_RPC_URL?.trim() ?? "";
  const PRIVATE_KEY = process.env.SENDER_PRIVATE_KEY?.trim() ?? "";
  if (!RPC_URL || !PRIVATE_KEY) throw new Error("Missing RPC_URL or SENDER_PRIVATE_KEY");

  const deployer = runCast(["wallet", "address", "--private-key", PRIVATE_KEY]);
  console.log(`Deployer: ${deployer}`);

  console.log("\nBuilding contracts…");
  runForge(["build"]);

  const envAdditions: Record<string, string> = {};

  for (const asset of RWA_ASSETS) {
    const envId = asset.id.replace("-", "_").toUpperCase();
    console.log(`\n─── ${asset.name} (${asset.symbol}) ───`);

    console.log(`  Deploying ERC-20…`);
    const erc20Out = runForge([
      "create", "--json", "--broadcast",
      "src/contracts/DemoAsset.sol:DemoAsset",
      "--rpc-url", RPC_URL, "--private-key", PRIVATE_KEY,
      "--constructor-args", deployer, asset.name, asset.symbol,
    ]);
    const erc20Addr = parseAddr(erc20Out);
    console.log(`  ERC-20: ${erc20Addr}`);

    console.log(`  Deploying ERC-7984 wrapper…`);
    const wrapOut = runForge([
      "create", "--json", "--broadcast",
      "src/contracts/ConfidentialDemoAsset.sol:ConfidentialDemoAsset",
      "--rpc-url", RPC_URL, "--private-key", PRIVATE_KEY,
      "--constructor-args", erc20Addr, `Confidential ${asset.name}`, asset.cSymbol,
    ]);
    const wrapAddr = parseAddr(wrapOut);
    console.log(`  ERC-7984: ${wrapAddr}`);

    envAdditions[`NEXT_PUBLIC_RWA_${envId}_ASSET`] = erc20Addr;
    envAdditions[`NEXT_PUBLIC_RWA_${envId}_WRAPPER`] = wrapAddr;
  }

  console.log("\nWriting addresses to .env.local…");
  updateEnv(envAdditions);
  console.log("Done!\n");
  for (const [k, v] of Object.entries(envAdditions)) {
    console.log(`  ${k}=${v}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
