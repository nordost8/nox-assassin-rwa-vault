import { createViemHandleClient, type HandleClient } from "@iexec-nox/handle";
import type { Abi, Address, Hex, PublicClient, WalletClient } from "viem";
import { parseAbi } from "viem";
import { TARGET_CHAIN } from "@/lib/chains";

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

const WRAPPER_ABI = parseAbi([
  "function wrap(address to, uint256 amount) returns (bytes32)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
  "function confidentialTransfer(address to, bytes32 encryptedAmount, bytes inputProof) returns (bytes32)",
  "function underlying() view returns (address)",
]);

const FAUCET_CLAIM_ABI = parseAbi(["function claim()", "error CooldownActive(uint256 nextClaimAt)"]);

export type HandleHex = Hex;

async function writeContractSimulated(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: {
    address: Address;
    abi: Abi;
    functionName: string;
    args: readonly unknown[];
  },
): Promise<Hex> {
  const account = walletClient.account;
  if (!account) throw new Error("WalletClient has no account — cannot sign transaction");

  // Use viem's fee estimation; hard-cap to 0.5 gwei for Arbitrum Sepolia so that
  // a transient baseFee spike doesn't produce multi-ETH gas in MetaMask.
  const MAX_FEE = 500_000_000n; // 0.5 gwei
  let maxFeePerGas: bigint;
  let maxPriorityFeePerGas: bigint;
  try {
    const fees = await publicClient.estimateFeesPerGas();
    maxFeePerGas = fees.maxFeePerGas != null && fees.maxFeePerGas < MAX_FEE ? fees.maxFeePerGas : MAX_FEE;
    maxPriorityFeePerGas = fees.maxPriorityFeePerGas ?? 1_000_000n;
  } catch {
    maxFeePerGas = MAX_FEE;
    maxPriorityFeePerGas = 1_000_000n;
  }

  const hash = await walletClient.writeContract({
    address: params.address,
    abi: params.abi as Parameters<WalletClient["writeContract"]>[0]["abi"],
    functionName: params.functionName,
    args: params.args as Parameters<WalletClient["writeContract"]>[0]["args"],
    account,
    chain: TARGET_CHAIN,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function getHandleClient(walletClient: WalletClient): Promise<HandleClient> {
  return createViemHandleClient(walletClient);
}

export async function approveUnderlying(
  walletClient: WalletClient,
  publicClient: PublicClient,
  tokenAddress: Address,
  wrapperAddress: Address,
  amountWei: bigint,
): Promise<Hex> {
  return writeContractSimulated(walletClient, publicClient, {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [wrapperAddress, amountWei],
  });
}

export async function wrapToken(
  walletClient: WalletClient,
  publicClient: PublicClient,
  wrapperAddress: Address,
  to: Address,
  amountWei: bigint,
): Promise<Hex> {
  return writeContractSimulated(walletClient, publicClient, {
    address: wrapperAddress,
    abi: WRAPPER_ABI,
    functionName: "wrap",
    args: [to, amountWei],
  });
}

export async function getConfidentialBalanceHandle(
  publicClient: PublicClient,
  wrapperAddress: Address,
  userAddress: Address,
): Promise<HandleHex> {
  return publicClient.readContract({
    address: wrapperAddress,
    abi: WRAPPER_ABI,
    functionName: "confidentialBalanceOf",
    args: [userAddress],
  });
}

export async function decryptConfidentialBalance(
  client: HandleClient,
  handle: HandleHex,
): Promise<{ value: bigint; solidityType: string }> {
  const { value, solidityType } = await client.decrypt(handle);
  if (typeof value !== "bigint") {
    throw new Error("Expected bigint for uint256 balance");
  }
  return { value, solidityType };
}

export async function encryptTransferAmount(
  client: HandleClient,
  wrapperAddress: Address,
  amountWei: bigint,
): Promise<{ encryptedAmount: HandleHex; proof: Hex }> {
  const { handle, handleProof } = await client.encryptInput(amountWei, "uint256", wrapperAddress);
  return { encryptedAmount: handle as HandleHex, proof: handleProof as Hex };
}

export async function transferConfidential(
  walletClient: WalletClient,
  publicClient: PublicClient,
  wrapperAddress: Address,
  recipient: Address,
  encryptedAmount: HandleHex,
  proof: Hex,
): Promise<Hex> {
  return writeContractSimulated(walletClient, publicClient, {
    address: wrapperAddress,
    abi: WRAPPER_ABI,
    functionName: "confidentialTransfer",
    args: [recipient, encryptedAmount, proof],
  });
}

export async function readUnderlyingAddress(
  publicClient: PublicClient,
  wrapperAddress: Address,
): Promise<Address> {
  return publicClient.readContract({
    address: wrapperAddress,
    abi: WRAPPER_ABI,
    functionName: "underlying",
  });
}

export async function readAllowance(
  publicClient: PublicClient,
  token: Address,
  owner: Address,
  spender: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
  });
}

// ─── ConfidentialVault ───────────────────────────────────────────────────────

const VAULT_ABI = parseAbi([
  "function createRoom(string name, address token, uint256 goal) returns (uint256)",
  "function contribute(uint256 roomId, uint256 amount)",
  "function withdraw(uint256 roomId, uint256 amount)",
  "function hasContributed(uint256 roomId, address contributor) view returns (bool)",
  "function getContributionHandle(uint256 roomId, address contributor) view returns (bytes32)",
  "function rooms(uint256) view returns (string name, address owner, address token, uint256 goal, uint256 totalRaised, bool active)",
  "function roomCount() view returns (uint256)",
]);

export type VaultRoom = {
  id: bigint;
  name: string;
  owner: Address;
  token: Address;
  goal: bigint;
  totalRaised: bigint;
  active: boolean;
};

export async function getRoomCount(publicClient: PublicClient, vaultAddress: Address): Promise<bigint> {
  return publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: "roomCount" });
}

export async function getRoom(publicClient: PublicClient, vaultAddress: Address, roomId: bigint): Promise<VaultRoom> {
  const r = await publicClient.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: "rooms", args: [roomId] });
  return { id: roomId, name: r[0], owner: r[1] as Address, token: r[2] as Address, goal: r[3], totalRaised: r[4], active: r[5] };
}

export async function createVaultRoom(
  walletClient: WalletClient,
  publicClient: PublicClient,
  vaultAddress: Address,
  name: string,
  token: Address,
  goal: bigint,
): Promise<Hex> {
  return writeContractSimulated(walletClient, publicClient, {
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "createRoom",
    args: [name, token, goal],
  });
}

export async function contributeToVault(
  walletClient: WalletClient,
  publicClient: PublicClient,
  vaultAddress: Address,
  roomId: bigint,
  amount: bigint,
): Promise<Hex> {
  return writeContractSimulated(walletClient, publicClient, {
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "contribute",
    args: [roomId, amount],
  });
}

export async function withdrawFromVault(
  walletClient: WalletClient,
  publicClient: PublicClient,
  vaultAddress: Address,
  roomId: bigint,
  amount: bigint,
): Promise<Hex> {
  return writeContractSimulated(walletClient, publicClient, {
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "withdraw",
    args: [roomId, amount],
  });
}

export async function getVaultContributionHandle(
  publicClient: PublicClient,
  vaultAddress: Address,
  roomId: bigint,
  contributor: Address,
): Promise<HandleHex> {
  return publicClient.readContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "getContributionHandle",
    args: [roomId, contributor],
  });
}

export async function hasContributedToVault(
  publicClient: PublicClient,
  vaultAddress: Address,
  roomId: bigint,
  contributor: Address,
): Promise<boolean> {
  return publicClient.readContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "hasContributed",
    args: [roomId, contributor],
  });
}

export async function claimDemoFaucet(
  walletClient: WalletClient,
  publicClient: PublicClient,
  faucetAddress: Address,
): Promise<Hex> {
  return writeContractSimulated(walletClient, publicClient, {
    address: faucetAddress,
    abi: FAUCET_CLAIM_ABI,
    functionName: "claim",
    args: [],
  });
}
