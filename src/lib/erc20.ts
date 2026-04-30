import { type Address, type PublicClient, parseAbi } from "viem";

const ERC20_META_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
]);

export type Erc20Meta = {
  name: string;
  symbol: string;
  decimals: number;
};

export async function readErc20Meta(
  publicClient: PublicClient,
  token: Address,
): Promise<Erc20Meta> {
  const [name, symbol, decimals] = await publicClient.multicall({
    contracts: [
      { address: token, abi: ERC20_META_ABI, functionName: "name" },
      { address: token, abi: ERC20_META_ABI, functionName: "symbol" },
      { address: token, abi: ERC20_META_ABI, functionName: "decimals" },
    ],
    allowFailure: true,
  });
  return {
    name: name.status === "success" && typeof name.result === "string" ? name.result : "—",
    symbol: symbol.status === "success" && typeof symbol.result === "string" ? symbol.result : "—",
    decimals:
      decimals.status === "success" && typeof decimals.result === "number"
        ? decimals.result
        : 18,
  };
}

export async function readErc20Balance(
  publicClient: PublicClient,
  token: Address,
  holder: Address,
): Promise<bigint> {
  return publicClient.readContract({
    address: token,
    abi: ERC20_META_ABI,
    functionName: "balanceOf",
    args: [holder],
  });
}
