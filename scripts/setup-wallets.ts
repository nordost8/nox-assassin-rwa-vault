import "./load-env";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createWalletClient, http, parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { TARGET_CHAIN } from "../src/lib/chains";

function optionalEnv(name: string): string | null {
  const v = process.env[name]?.trim();
  return v && v.length > 0 ? v : null;
}

function asHexPrivateKey(v: string, name: string): `0x${string}` {
  const vv = v.trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(vv)) throw new Error(`Invalid private key for ${name} (expected 0x + 64 hex chars)`);
  return vv as `0x${string}`;
}

async function maybeFundAccounts(params: {
  rpcUrl: string;
  funderPrivateKey: `0x${string}`;
  recipients: `0x${string}`[];
  amountEth: string;
}) {
  const { rpcUrl, funderPrivateKey, recipients, amountEth } = params;
  const funder = privateKeyToAccount(funderPrivateKey);
  const wallet = createWalletClient({ chain: TARGET_CHAIN, transport: http(rpcUrl), account: funder });
  const value = parseEther(amountEth);
  for (const to of recipients) {
    const hash = await wallet.sendTransaction({ to, value });
    console.log(`Funded ${to} with ${amountEth} ETH. tx: ${hash}`);
  }
}

async function main() {
  const rpcUrl = optionalEnv("RPC_URL") ?? optionalEnv("NEXT_PUBLIC_RPC_URL");

  const senderPk = generatePrivateKey();
  const recipientPk = generatePrivateKey();
  const sender = privateKeyToAccount(senderPk);
  const recipient = privateKeyToAccount(recipientPk);

  console.log("Generated test wallets (Arbitrum Sepolia):");
  console.log(`SENDER_ADDRESS=${sender.address}`);
  console.log(`RECIPIENT_ADDRESS=${recipient.address}`);

  const outPath = resolve(process.cwd(), ".env.local");
  const markerStart = "# === NOX E2E TEST CONFIG (auto-generated) ===";
  const markerEnd = "# === /NOX E2E TEST CONFIG ===";
  const blockLines: string[] = [
    markerStart,
    `# Generated at ${new Date().toISOString()}`,
    `RPC_URL=${rpcUrl ?? "https://sepolia-rollup.arbitrum.io/rpc"}`,
    `SENDER_PRIVATE_KEY=${senderPk}`,
    `SENDER_ADDRESS=${sender.address}`,
    `RECIPIENT_PRIVATE_KEY=${recipientPk}`,
    `RECIPIENT_ADDRESS=${recipient.address}`,
    "",
    "# Filled by deploy:demo (or set manually if already deployed)",
    "NEXT_PUBLIC_DEMO_ASSET_ADDRESS=",
    "NEXT_PUBLIC_DEMO_CONFIDENTIAL_WRAPPER_ADDRESS=",
    "NEXT_PUBLIC_DEMO_FAUCET_ADDRESS=",
    markerEnd,
    "",
  ];

  let current = "";
  try {
    current = readFileSync(outPath, "utf8");
  } catch {
    current = "";
  }
  const startIdx = current.indexOf(markerStart);
  const endIdx = current.indexOf(markerEnd);
  const block = blockLines.join("\n");
  const next =
    startIdx !== -1 && endIdx !== -1 && endIdx > startIdx
      ? current.slice(0, startIdx) + block + current.slice(endIdx + markerEnd.length)
      : (current.trimEnd() + (current.trimEnd() ? "\n\n" : "") + block);

  writeFileSync(outPath, next, { encoding: "utf8", mode: 0o600 });
  console.log(`Wrote ${outPath} (chmod 600). Single developer config file.`);

  const funderPkEnv = optionalEnv("FUNDER_PRIVATE_KEY") ?? optionalEnv("PRIVATE_KEY");
  const fundAmount = optionalEnv("FUND_AMOUNT_ETH") ?? "0.01";

  if (!rpcUrl) {
    console.log("\nRPC_URL not provided; skipping gas funding.");
    console.log("Set RPC_URL (Arbitrum Sepolia RPC) and re-run to auto-fund, or fund manually via any faucet.");
    return;
  }

  if (funderPkEnv) {
    console.log(`\nFunding sender+recipient with ${fundAmount} ETH for gas…`);
    await maybeFundAccounts({
      rpcUrl,
      funderPrivateKey: asHexPrivateKey(funderPkEnv, "FUNDER_PRIVATE_KEY/PRIVATE_KEY"),
      recipients: [sender.address, recipient.address],
      amountEth: fundAmount,
    });
  } else {
    console.log("\nNo FUNDER_PRIVATE_KEY/PRIVATE_KEY provided; skipping gas funding.");
    console.log("You must fund both addresses with Arbitrum Sepolia ETH (for gas) before running deploy/e2e.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

