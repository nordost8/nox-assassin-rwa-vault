import { createConfig, http } from "wagmi";
import { walletConnect } from "wagmi/connectors";
import { TARGET_CHAIN, TARGET_CHAIN_ID } from "@/lib/chains";

/** Reown dashboard uses `NEXT_PUBLIC_PROJECT_ID`; older guides use `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (Reown AppKit). */
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ||
  process.env.NEXT_PUBLIC_PROJECT_ID?.trim() ||
  "";
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL?.trim();
const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

/** WalletConnect metadata expects at least one HTTPS icon URL (see Reown / WC examples). */
const WC_METADATA_ICONS = ["https://avatars.githubusercontent.com/u/37784886?v=4&s=128"] as const;

const transports = {
  [TARGET_CHAIN_ID]: http(rpcUrl && rpcUrl.length > 0 ? rpcUrl : undefined),
} as const;

export const wagmiConfig = createConfig({
  chains: [TARGET_CHAIN],
  // IMPORTANT (Next.js dev): WalletConnect modal pulls dependencies (Reown/WC modal)
  // that must not be initialized on the server. Connector is registered only in the browser.
  connectors:
    typeof window !== "undefined" && walletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            showQrModal: true,
            metadata: {
              name: "Nox Portfolio Shield",
              description: "Confidential portfolio shielding on Arbitrum Sepolia",
              url: typeof window !== "undefined" ? window.location.origin : appUrl,
              icons: [...WC_METADATA_ICONS],
            },
          }),
        ]
      : [],
  transports,
});

export function isWalletConnectConfigured(): boolean {
  return walletConnectProjectId.length > 0;
}

export function assertTargetChain(chainId: number | undefined): chainId is typeof TARGET_CHAIN_ID {
  return chainId === TARGET_CHAIN_ID;
}
