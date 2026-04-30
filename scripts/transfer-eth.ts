import "./load-env";
import { createWalletClient, http, parseEther, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { TARGET_CHAIN } from "../src/lib/chains";

function mustEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function asAddress(v: string, name: string): Address {
  if (!/^0x[a-fA-F0-9]{40}$/.test(v)) throw new Error(`Invalid address for ${name}: ${v}`);
  return v as Address;
}

async function main() {
  const rpcUrl = mustEnv("RPC_URL");
  const pk = mustEnv("SENDER_PRIVATE_KEY");
  const to = asAddress(mustEnv("TO_ADDRESS"), "TO_ADDRESS");
  const amountEth = mustEnv("AMOUNT_ETH");

  const account = privateKeyToAccount(pk as `0x${string}`);
  const wallet = createWalletClient({ chain: TARGET_CHAIN, transport: http(rpcUrl), account });
  const hash = await wallet.sendTransaction({ to, value: parseEther(amountEth) });
  console.log(`Sent ${amountEth} ETH from ${account.address} to ${to}. tx: ${hash}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

