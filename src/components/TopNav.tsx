"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { Wallet, Power, Activity, Menu, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { BrotherhoodSigil } from "@/components/AssassinIcon";
import { useTutorial } from "@/components/TutorialProvider";
import { KEYS } from "@/lib/storage-keys";
import { shortAddress } from "@/lib/format";
import { TARGET_CHAIN_ID } from "@/lib/chains";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const tabs = [
  { href: "/", label: "Portfolio" },
  { href: "/vaults", label: "Vaults" },
  { href: "/advisor", label: "AI Advisor" },
];

export default function TopNav() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { exitTutorial } = useTutorial();
  const onNetwork = chainId === TARGET_CHAIN_ID;
  // Use mounted guard to prevent hydration mismatch: server always renders
  // the disconnected state; client switches after first paint.
  const connected = mounted && isConnected;

  const handleReset = () => {
    // Full reset: wipe all browser state for this origin.
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
    // Best-effort clear of CacheStorage (if present).
    try {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        if (!("caches" in window)) return;
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      })();
    } catch {}
    exitTutorial();
    disconnect();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="max-w-[1480px] mx-auto px-3 md:px-6 h-[60px] flex items-center gap-3 md:gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 md:gap-3 shrink-0 min-w-0">
          <div className="relative w-9 h-9 rounded-sm border border-primary/60 flex items-center justify-center bg-primary/10 shrink-0">
            <BrotherhoodSigil size={22} className="text-primary sigil-pulse" />
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-brotherhood pulse-soft" />
          </div>
          <div className="leading-tight min-w-0 hidden sm:block">
            <div className="font-creed text-[13px] md:text-[15px] font-bold tracking-[0.16em] md:tracking-[0.20em] uppercase truncate">
              Nox <span className="text-primary">Assassin</span><span className="hidden md:inline"> · RWA Vault</span>
            </div>
            <div className="text-[9px] terminal-label hidden md:block">Nothing is true. Everything is permitted · ERC-7984</div>
          </div>
        </Link>

        {/* Desktop tabs */}
        {connected && (
          <nav className="hidden md:flex items-center gap-1 ml-2">
            {tabs.map(t => {
              const active = pathname === t.href || (t.href === "/" && pathname === "");
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`relative px-3 lg:px-4 py-2 text-[12px] uppercase tracking-[0.14em] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t.label}
                  {active && <span className="absolute -bottom-[15px] left-3 right-3 h-px bg-primary" />}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="flex-1" />

        {/* Network indicator */}
        {connected && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 border border-border rounded-sm bg-surface">
            <Activity className="w-3 h-3 text-success" />
            <span className="text-[11px] font-mono uppercase tracking-wider">
              {onNetwork ? "Arbitrum Sepolia" : "Wrong Network"}
            </span>
            <span className={`status-dot ${onNetwork ? "bg-success" : "bg-destructive"} pulse-soft`} />
          </div>
        )}

        {/* Reset button — shown when connected */}
        {connected && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                title="Reset to first-launch state"
                className="flex items-center gap-1.5 border border-border rounded-sm bg-surface hover:bg-surface-hover hover:border-destructive/50 hover:text-destructive transition-colors px-2.5 py-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-[0.14em] font-semibold hidden lg:inline">Reset</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-surface border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-creed tracking-wider">Reset everything?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs leading-relaxed">
                  This wipes your wallet session and portfolio selection — you&apos;ll return to the Connect Wallet screen,
                  exactly as if you opened the app for the first time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Reset to start
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Wallet area */}
        {!connected ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-3 md:px-4 py-2 text-[11px] md:text-[12px] uppercase tracking-[0.14em] font-semibold bg-primary text-primary-foreground hover:bg-primary-glow transition-colors rounded-sm">
                <Wallet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Connect Wallet</span>
                <span className="sm:hidden">Connect</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-surface border-border">
              <DropdownMenuLabel className="terminal-label">Select Provider</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {connectors.map(c => (
                <DropdownMenuItem key={c.id} onClick={() => connect({ connector: c })} className="font-mono text-xs cursor-pointer">
                  {c.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2.5 md:px-3 py-2 border border-border rounded-sm bg-surface hover:bg-surface-hover transition-colors">
                <span className="status-dot bg-primary glow-primary" />
                <span className="font-mono text-[11px] tracking-wider">{shortAddress(address ?? "")}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-surface border-border">
              <DropdownMenuLabel className="terminal-label">Wallet</DropdownMenuLabel>
              <div className="px-2 py-2 font-mono text-xs text-muted-foreground break-all">{address}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  localStorage.removeItem(KEYS.selectedRwa);
                  localStorage.removeItem(KEYS.faucetDone);
                }}
                className="text-xs cursor-pointer"
              >
                Re-open Faucet
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => disconnect()}
                className="text-xs cursor-pointer text-destructive"
              >
                <Power className="w-3 h-3 mr-2" /> Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Mobile nav */}
        {connected && (
          <DropdownMenu open={mobileNav} onOpenChange={setMobileNav}>
            <DropdownMenuTrigger asChild>
              <button className="md:hidden flex items-center justify-center w-9 h-9 border border-border rounded-sm bg-surface">
                <Menu className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-surface border-border">
              <DropdownMenuLabel className="terminal-label">Navigate</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tabs.map(t => (
                <DropdownMenuItem key={t.href} asChild className="cursor-pointer">
                  <Link href={t.href} className="text-xs uppercase tracking-wider">{t.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
