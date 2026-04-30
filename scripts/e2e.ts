import "./load-env";
import { http, createPublicClient, createWalletClient, formatUnits, parseUnits, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { TARGET_CHAIN, TARGET_CHAIN_ID } from "../src/lib/chains";
import {
  approveUnderlying,
  claimDemoFaucet,
  decryptConfidentialBalance,
  encryptTransferAmount,
  getConfidentialBalanceHandle,
  getHandleClient,
  transferConfidential,
  wrapToken,
} from "../src/lib/nox";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function mustEnv(name: string, fallbackName?: string): string {
  const v = process.env[name]?.trim() || (fallbackName ? process.env[fallbackName]?.trim() : "");
  if (!v) throw new Error(`Missing env: ${name}${fallbackName ? ` (or ${fallbackName})` : ""}`);
  return v;
}

function optionalEnv(name: string, fallbackName?: string): string | null {
  const v = process.env[name]?.trim() || (fallbackName ? process.env[fallbackName]?.trim() : "");
  return v && v.length > 0 ? v : null;
}

function asAddress(v: string, name: string): Address {
  if (!/^0x[a-fA-F0-9]{40}$/.test(v)) throw new Error(`Invalid address for ${name}: ${v}`);
  return v as Address;
}

async function readErc20Balance(publicClient: ReturnType<typeof createPublicClient>, token: Address, holder: Address) {
  return publicClient.readContract({ address: token, abi: ERC20_BALANCE_ABI, functionName: "balanceOf", args: [holder] });
}

async function tryDecryptWithNote(
  label: string,
  fn: () => Promise<{ value: bigint; solidityType: string }>,
  decimals: number,
): Promise<void> {
  try {
    const d = await fn();
    console.log(`   ${label} decrypted: ${formatUnits(d.value, decimals)} (type: ${d.solidityType})`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const lower = msg.toLowerCase();
    console.log(`   ${label} decrypt FAILED: ${msg}`);
    if (lower.includes("not authorized") || lower.includes("403") || lower.includes("unauthorized") || lower.includes("viewer")) {
      console.log(
    `   Note: Nox handle decrypt is gated by Handle Gateway ACL (viewer/admin). See iExec: https://beta.tools.docs.iex.ec/nox-protocol/guides/manage-handle-access/intro`,
  );
    }
  }
}

async function main() {
  const rpcUrl = mustEnv("RPC_URL", "NEXT_PUBLIC_RPC_URL");
  const senderPk = mustEnv("SENDER_PRIVATE_KEY");
  const recipientPk = mustEnv("RECIPIENT_PRIVATE_KEY");

  const demoAsset = asAddress(mustEnv("DEMO_ASSET_ADDRESS", "NEXT_PUBLIC_DEMO_ASSET_ADDRESS"), "DEMO_ASSET_ADDRESS");
  const wrapper = asAddress(
    mustEnv("DEMO_CONFIDENTIAL_WRAPPER_ADDRESS", "NEXT_PUBLIC_DEMO_CONFIDENTIAL_WRAPPER_ADDRESS"),
    "DEMO_CONFIDENTIAL_WRAPPER_ADDRESS",
  );
  const faucetEnv = optionalEnv("DEMO_FAUCET_ADDRESS", "NEXT_PUBLIC_DEMO_FAUCET_ADDRESS");
  const faucet = faucetEnv ? asAddress(faucetEnv, "DEMO_FAUCET_ADDRESS") : null;

  const sender = privateKeyToAccount(senderPk as `0x${string}`);
  const recipient = privateKeyToAccount(recipientPk as `0x${string}`);

  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: TARGET_CHAIN, transport });
  const netId = await publicClient.getChainId();
  if (netId !== TARGET_CHAIN_ID) {
    throw new Error(`Wrong chainId from RPC: ${netId} (expected ${TARGET_CHAIN_ID} — Arbitrum Sepolia)`);
  }
  const senderWallet = createWalletClient({ chain: TARGET_CHAIN, transport, account: sender });
  const recipientWallet = createWalletClient({ chain: TARGET_CHAIN, transport, account: recipient });

  const decimals = 18;
  const shieldAmount = parseUnits(process.env.SHIELD_AMOUNT ?? "10", decimals);
  const transferAmount = parseUnits(process.env.TRANSFER_AMOUNT ?? "3", decimals);

  console.log(`Sender:    ${sender.address}`);
  console.log(`Recipient: ${recipient.address}`);
  console.log(`DemoAsset: ${demoAsset}`);
  console.log(`Wrapper:   ${wrapper}`);
  if (faucet) console.log(`Faucet:    ${faucet}`);

  if (faucet) {
    console.log("\n1) Claiming faucet for sender…");
    try {
      const hash = await claimDemoFaucet(senderWallet, publicClient, faucet);
      console.log(`   claim tx: ${hash}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("cooldown") || msg.includes("CooldownActive")) {
        console.log(`   claim skipped (faucet cooldown): ${msg}`);
      } else {
        throw e;
      }
    }
  } else {
    console.log("\n1) Faucet not configured; skipping claim.");
  }

  const pub0 = await readErc20Balance(publicClient, demoAsset, sender.address);
  console.log(`\n2) Sender public balance: ${formatUnits(pub0, decimals)} dASSET`);
  if (pub0 < shieldAmount) {
    throw new Error(
      `Insufficient public balance for shield. Have ${formatUnits(pub0, decimals)}, need ${formatUnits(shieldAmount, decimals)}`,
    );
  }

  console.log(`\n3) Approve underlying for wrapper (${formatUnits(shieldAmount, decimals)} dASSET)…`);
  const approveTx = await approveUnderlying(senderWallet, publicClient, demoAsset, wrapper, shieldAmount);
  console.log(`   approve tx: ${approveTx}`);

  console.log("\n4) Wrapping into confidential token…");
  const wrapTx = await wrapToken(senderWallet, publicClient, wrapper, sender.address, shieldAmount);
  console.log(`   wrap tx: ${wrapTx}`);

  const pub1 = await readErc20Balance(publicClient, demoAsset, sender.address);
  console.log(`\n5) Sender public balance after wrap: ${formatUnits(pub1, decimals)} dASSET`);

  const senderHandle = await getConfidentialBalanceHandle(publicClient, wrapper, sender.address);
  const senderHandleClient = await getHandleClient(senderWallet);
  console.log(`\n6) Decrypt sender confidential balance handle: ${senderHandle}`);
  await tryDecryptWithNote(
    "Sender",
    () => decryptConfidentialBalance(senderHandleClient, senderHandle),
    decimals,
  );

  console.log(`\n7) Encrypt transfer amount (${formatUnits(transferAmount, decimals)}) and send confidential transfer…`);
  const { encryptedAmount, proof } = await encryptTransferAmount(senderHandleClient, wrapper, transferAmount);
  const tx = await transferConfidential(senderWallet, publicClient, wrapper, recipient.address, encryptedAmount, proof);
  console.log(`   transfer tx: ${tx}`);

  const recHandle = await getConfidentialBalanceHandle(publicClient, wrapper, recipient.address);
  const recHandleClient = await getHandleClient(recipientWallet);
  console.log(`\n8) Decrypt recipient confidential balance handle: ${recHandle}`);
  await tryDecryptWithNote(
    "Recipient",
    () => decryptConfidentialBalance(recHandleClient, recHandle),
    decimals,
  );

  console.log("\nE2E on-chain path finished (wrap + confidential transfer; decrypt may be ACL-limited).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

