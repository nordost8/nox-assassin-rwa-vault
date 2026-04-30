"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import TopNav from "@/components/TopNav";
import ConnectScreen from "@/components/ConnectScreen";
import FaucetPicker from "@/components/FaucetPicker";
import TutorialOverlay from "@/components/TutorialOverlay";
import { TutorialProvider } from "@/components/TutorialProvider";
import ClientLogBridge from "@/components/ClientLogBridge";
import { Toaster } from "@/components/ui/sonner";
import { hasSelectedAssets } from "@/lib/rwa-assets";
import { KEYS } from "@/lib/storage-keys";

function AppSkeleton() {
  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { isConnected, status } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [needsFaucet, setNeedsFaucet] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !isConnected) return;
    const faucetDone = localStorage.getItem(KEYS.faucetDone) === "1";
    // Treat "selected assets but never minted" as not onboarded yet.
    if (!hasSelectedAssets() || !faucetDone) setNeedsFaucet(true);
  }, [mounted, isConnected]);

  const safeConnected = mounted ? isConnected : false;
  const isResolving = mounted && !isConnected && (status === "connecting" || status === "reconnecting");

  const router = useRouter();
  useEffect(() => {
    if (!safeConnected || needsFaucet) return;
    router.prefetch("/vaults");
    router.prefetch("/advisor");
    router.prefetch("/");
  }, [safeConnected, needsFaucet, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <ClientLogBridge />
      <TopNav />
      <main className="flex-1">
        {safeConnected
          ? children
          : isResolving
            ? <AppSkeleton />
            : <ConnectScreen />}
      </main>
      <footer className="border-t border-border py-3 px-6 flex items-center justify-between">
        <span className="terminal-label">Nox Assassin RWA Vault · Move in shadows</span>
        <span className="terminal-label font-mono normal-case tracking-normal">v0.1.0 · Arbitrum Sepolia</span>
      </footer>
      <Toaster theme="dark" position="bottom-right" toastOptions={{ className: "!bg-surface !border-border !text-foreground !font-mono !text-xs" }} />
      {safeConnected && (
        <FaucetPicker
          open={needsFaucet}
          onDone={() => setNeedsFaucet(false)}
        />
      )}
      {/* Only render tutorial when connected and past onboarding */}
      {safeConnected && !needsFaucet && <TutorialOverlay />}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TutorialProvider>
      <AppShell>{children}</AppShell>
    </TutorialProvider>
  );
}
