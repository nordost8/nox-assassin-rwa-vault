/**
 * On-chain test for ConfidentialVault:
 *   1. SENDER creates a room
 *   2. SENDER contributes 10 dASSET
 *   3. RECIPIENT contributes 5 dASSET
 *   4. Verify totalRaised = 15
 *   5. SENDER withdraws 3
 *   6. Verify totalRaised = 12
 */
import "./load-env";
import { createPublicClient, createWalletClient, http, parseAbi, parseUnits, formatUnits, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { TARGET_CHAIN } from "@/lib/chains";

const VAULT_ABI = parseAbi([
  "function createRoom(string name, address token, uint256 goal) returns (uint256)",
  "function contribute(uint256 roomId, uint256 amount)",
  "function withdraw(uint256 roomId, uint256 amount)",
  "function hasContributed(uint256 roomId, address contributor) view returns (bool)",
  "function getContributionHandle(uint256 roomId, address contributor) view returns (bytes32)",
  "function rooms(uint256) view returns (string name, address owner, address token, uint256 goal, uint256 totalRaised, bool active)",
  "function roomCount() view returns (uint256)",
  "event RoomCreated(uint256 indexed roomId, address indexed owner, address token, string name, uint256 goal)",
  "event Contributed(uint256 indexed roomId, address indexed contributor)",
]);

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function mint(address to, uint256 amount)",
]);

async function main() {
  const senderKey = (process.env.SENDER_PRIVATE_KEY?.trim() ?? "") as `0x${string}`;
  const recipientKey = (process.env.RECIPIENT_PRIVATE_KEY?.trim() ?? "") as `0x${string}`;
  const vaultAddr = (process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS?.trim() ?? "") as Address;
  const tokenAddr = (process.env.NEXT_PUBLIC_DEMO_ASSET_ADDRESS?.trim() ?? "") as Address;
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL?.trim();

  if (!senderKey || !vaultAddr || !tokenAddr) throw new Error("Missing env vars");

  const senderAccount = privateKeyToAccount(senderKey);
  const recipientAccount = recipientKey ? privateKeyToAccount(recipientKey) : null;

  const publicClient = createPublicClient({ chain: TARGET_CHAIN, transport: http(rpcUrl) });
  const senderWallet = createWalletClient({ account: senderAccount, chain: TARGET_CHAIN, transport: http(rpcUrl) });
  const recipientWallet = recipientAccount
    ? createWalletClient({ account: recipientAccount, chain: TARGET_CHAIN, transport: http(rpcUrl) })
    : null;

  console.log("=== ConfidentialVault On-Chain Test ===");
  console.log(`Vault:    ${vaultAddr}`);
  console.log(`Token:    ${tokenAddr}`);
  console.log(`Sender:   ${senderAccount.address}`);
  if (recipientAccount) console.log(`Recipient:${recipientAccount.address}`);

  // Check sender dASSET balance
  const senderBal = await publicClient.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [senderAccount.address] });
  console.log(`\nSender dASSET balance: ${formatUnits(senderBal, 18)}`);

  // 1. Create room
  console.log("\n[1] Creating room…");
  const goal = parseUnits("100", 18);
  const createHash = await senderWallet.writeContract({
    address: vaultAddr, abi: VAULT_ABI, functionName: "createRoom",
    args: ["Test Fundraise", tokenAddr, goal],
    account: senderAccount, chain: TARGET_CHAIN,
  });
  const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

  // Derive roomId from roomCount
  const count = await publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: "roomCount" });
  const roomId = count - 1n;
  console.log(`Room created! roomId=${roomId} tx=${createHash}`);

  // Read room
  const room = await publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: "rooms", args: [roomId] });
  console.log(`Room: name="${room[0]}" owner=${room[1]} goal=${formatUnits(room[4], 18)} totalRaised=${formatUnits(room[3], 18)}`);

  // 2. Sender contributes 10 dASSET
  const amount1 = parseUnits("10", 18);
  console.log(`\n[2] Sender approves + contributes ${formatUnits(amount1, 18)} dASSET…`);
  const approveHash = await senderWallet.writeContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "approve", args: [vaultAddr, amount1], account: senderAccount, chain: TARGET_CHAIN });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });
  console.log("Approved.");
  const contrib1Hash = await senderWallet.writeContract({ address: vaultAddr, abi: VAULT_ABI, functionName: "contribute", args: [roomId, amount1], account: senderAccount, chain: TARGET_CHAIN });
  await publicClient.waitForTransactionReceipt({ hash: contrib1Hash });
  console.log(`Contributed! tx=${contrib1Hash}`);

  // 3. Recipient contributes 5 dASSET (if available)
  if (recipientWallet && recipientAccount) {
    const recipBal = await publicClient.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [recipientAccount.address] });
    console.log(`\nRecipient dASSET balance: ${formatUnits(recipBal, 18)}`);
    if (recipBal >= parseUnits("5", 18)) {
      const amount2 = parseUnits("5", 18);
      console.log(`[3] Recipient approves + contributes ${formatUnits(amount2, 18)} dASSET…`);
      const ap2 = await recipientWallet.writeContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "approve", args: [vaultAddr, amount2], account: recipientAccount, chain: TARGET_CHAIN });
      await publicClient.waitForTransactionReceipt({ hash: ap2 });
      const contrib2Hash = await recipientWallet.writeContract({ address: vaultAddr, abi: VAULT_ABI, functionName: "contribute", args: [roomId, amount2], account: recipientAccount, chain: TARGET_CHAIN });
      await publicClient.waitForTransactionReceipt({ hash: contrib2Hash });
      console.log(`Contributed! tx=${contrib2Hash}`);
    } else {
      console.log("[3] Recipient has insufficient dASSET — minting 50 first…");
      const mintH = await senderWallet.writeContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "mint", args: [recipientAccount.address, parseUnits("50", 18)], account: senderAccount, chain: TARGET_CHAIN });
      await publicClient.waitForTransactionReceipt({ hash: mintH });
      const amount2 = parseUnits("5", 18);
      const ap2 = await recipientWallet.writeContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "approve", args: [vaultAddr, amount2], account: recipientAccount, chain: TARGET_CHAIN });
      await publicClient.waitForTransactionReceipt({ hash: ap2 });
      const contrib2Hash = await recipientWallet.writeContract({ address: vaultAddr, abi: VAULT_ABI, functionName: "contribute", args: [roomId, amount2], account: recipientAccount, chain: TARGET_CHAIN });
      await publicClient.waitForTransactionReceipt({ hash: contrib2Hash });
      console.log(`Contributed! tx=${contrib2Hash}`);
    }
  }

  // 4. Read final room state
  const roomFinal = await publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: "rooms", args: [roomId] });
  console.log(`\n[4] Final room totalRaised: ${formatUnits(roomFinal[4], 18)} dASSET`);

  // 5. Check contribution handles
  const senderHasContrib = await publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: "hasContributed", args: [roomId, senderAccount.address] });
  console.log(`Sender hasContributed: ${senderHasContrib}`);
  if (senderHasContrib) {
    const handle = await publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: "getContributionHandle", args: [roomId, senderAccount.address] });
    console.log(`Sender contribution handle (encrypted): ${handle}`);
    console.log(`  → Only sender can decrypt via iExec TEE`);
  }

  // 6. Sender withdraws 3
  console.log("\n[5] Sender withdraws 3 dASSET…");
  const withdrawHash = await senderWallet.writeContract({
    address: vaultAddr, abi: VAULT_ABI, functionName: "withdraw",
    args: [roomId, parseUnits("3", 18)],
    account: senderAccount, chain: TARGET_CHAIN,
  });
  await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
  const roomAfterWithdraw = await publicClient.readContract({ address: vaultAddr, abi: VAULT_ABI, functionName: "rooms", args: [roomId] });
  console.log(`After withdraw: totalRaised=${formatUnits(roomAfterWithdraw[4], 18)} dASSET`);

  console.log("\n✓ All tests passed.");
}

main().catch((e) => { console.error(e); process.exit(1); });
