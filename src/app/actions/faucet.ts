"use server";

import { createPublicClient, createWalletClient, http, parseAbi, parseUnits, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { TARGET_CHAIN } from "@/lib/chains";
import { logEvent } from "@/lib/server-log";

const MINT_ABI = parseAbi(["function mint(address to, uint256 amount)"]);

const DRIP_AMOUNT = parseUnits("50", 18); // 50 tokens per asset — gentle on gas
const COOLDOWN_MS = 60 * 60 * 1000;

const cooldownMap = new Map<string, number>();

function buildKnownTokens(): Set<string> {
  const known = new Set<string>();
  const env = process.env as Record<string, string>;
  for (const key of Object.keys(env)) {
    if (key.startsWith("NEXT_PUBLIC_RWA_") && key.endsWith("_ASSET")) {
      const v = env[key]?.trim().toLowerCase();
      if (v) known.add(v);
    }
  }
  return known;
}

const KNOWN_TOKENS: Set<string> = buildKnownTokens();
if (KNOWN_TOKENS.size === 0) {
  logEvent({ kind: "faucet-config", error: "KNOWN_TOKENS is empty — no NEXT_PUBLIC_RWA_*_ASSET vars found. All mint requests will be rejected." }, "error");
}

export type FaucetResult =
  | { ok: true; txHash: string }
  | { ok: false; error: string; nextClaimAt?: number };

export async function serverClaimFaucet(
  userAddress: string,
  tokenAddress?: string,
): Promise<FaucetResult> {
  if (!/^0x[a-fA-F0-9]{40}$/i.test(userAddress)) {
    return { ok: false, error: "Invalid address" };
  }

  // Resolve which token to mint
  const resolvedToken = tokenAddress?.trim() as Address | undefined;

  if (!resolvedToken) return { ok: false, error: "No token configured" };

  // Security: only mint from our own deployed contracts
  const known = KNOWN_TOKENS;
  if (!known.has(resolvedToken.toLowerCase())) {
    logEvent({ kind: "faucet-mint", phase: "rejected", user: userAddress, token: resolvedToken, error: "Unknown token address — not in KNOWN_TOKENS whitelist", knownCount: known.size }, "error");
    return { ok: false, error: "Unknown token address" };
  }

  const cooldownKey = `${userAddress.toLowerCase()}:${resolvedToken.toLowerCase()}`;
  const now = Date.now();
  const last = cooldownMap.get(cooldownKey) ?? 0;
  if (last + COOLDOWN_MS > now) {
    return { ok: false, error: "Cooldown active — wait before next claim", nextClaimAt: last + COOLDOWN_MS };
  }

  const rawKey = process.env.SENDER_PRIVATE_KEY?.trim();
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL?.trim() || process.env.RPC_URL?.trim();
  if (!rawKey) return { ok: false, error: "Faucet not configured (missing SENDER_PRIVATE_KEY)" };
  if (!rpcUrl) return { ok: false, error: "Faucet not configured (missing RPC_URL / NEXT_PUBLIC_RPC_URL)" };

  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;

  try {
    logEvent({
      kind: "faucet-mint",
      phase: "start",
      user: userAddress,
      token: resolvedToken,
    }, "info");
    const account = privateKeyToAccount(privateKey);
    const publicClient = createPublicClient({ chain: TARGET_CHAIN, transport: http(rpcUrl) });
    const walletClient = createWalletClient({ account, chain: TARGET_CHAIN, transport: http(rpcUrl) });

    const hash = await walletClient.writeContract({
      address: resolvedToken,
      abi: MINT_ABI,
      functionName: "mint",
      args: [userAddress as Address, DRIP_AMOUNT],
      account,
      chain: TARGET_CHAIN,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    cooldownMap.set(cooldownKey, now);
    logEvent({
      kind: "faucet-mint",
      phase: "ok",
      user: userAddress,
      token: resolvedToken,
      txHash: hash,
    }, "info");
    return { ok: true, txHash: hash };
  } catch (e) {
    logEvent({
      kind: "faucet-mint",
      phase: "error",
      user: userAddress,
      token: resolvedToken,
      error: e instanceof Error ? e.message : String(e),
    }, "error");
    return { ok: false, error: e instanceof Error ? e.message : "Mint failed" };
  }
}

// Mint tokens for all selected RWA assets at once (called after onboarding)
export async function mintSelectedAssets(
  userAddress: string,
  tokenAddresses: string[],
): Promise<{ results: Array<{ token: string; ok: boolean; error?: string }> }> {
  const results = [];
  for (const token of tokenAddresses) {
    const res = await serverClaimFaucet(userAddress, token);
    results.push({ token, ok: res.ok, error: res.ok ? undefined : res.error });
  }
  return { results };
}
