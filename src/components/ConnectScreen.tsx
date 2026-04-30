"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnect } from "wagmi";
import { usePublicClient } from "wagmi";
import { formatGwei } from "viem";
import { Wallet, ShieldCheck, Eye, Layers, Brain, Vault, Coins } from "lucide-react";
import { BrotherhoodSigil, AnimusReticle } from "@/components/AssassinIcon";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TARGET_CHAIN_ID } from "@/lib/chains";

const FEATURES = [
  { icon: ShieldCheck, label: "Confidential balances", sub: "Hidden from all chain observers via iExec TEE" },
  { icon: Eye,         label: "Eagle Vision reveal",  sub: "Decrypt only with your wallet — TEE-verified" },
  { icon: Layers,      label: "ERC-7984 wrapping",    sub: "Any ERC-20 becomes a confidential asset" },
  { icon: Brain,       label: "AI contract audit",    sub: "ChainGPT scans every vault before deployment" },
  { icon: Vault,       label: "Institutional vaults", sub: "Co-custody rooms with shared treasury control" },
  { icon: Coins,       label: "6 RWA commodities",    sub: "Gold · Silver · Platinum · Oil · Diamond · REE" },
];

const PARTNERS = [
  { name: "iExec", role: "TEE · Nox Protocol", accent: "#00c4e0" },
  { name: "ChainGPT", role: "AI Partner", accent: "#00e5a0" },
  { name: "TUM Blockchain", role: "Community Partner", accent: "#3070b3" },
  { name: "Arbitrum", role: "L2 Network", accent: "#12aaff" },
];

export default function ConnectScreen() {
  const { connect, connectors } = useConnect();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });

  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [gasGwei, setGasGwei] = useState<string | null>(null);
  const [rpcReady, setRpcReady] = useState(false);

  useEffect(() => {
    if (!publicClient) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const [bn, gp] = await Promise.all([
          publicClient.getBlockNumber(),
          publicClient.getGasPrice(),
        ]);
        if (cancelled) return;
        setBlockNumber(bn);
        setGasGwei(formatGwei(gp));
        setRpcReady(true);
      } catch (err) {
        console.error("[Nox] ConnectScreen RPC tick failed:", err);
      }
    };

    void tick();
    const id = setInterval(() => void tick(), 6000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [publicClient]);

  const blockLabel = useMemo(() => {
    if (!rpcReady) return "…";
    if (blockNumber == null) return "—";
    return Number(blockNumber).toLocaleString();
  }, [blockNumber, rpcReady]);

  const gasLabel = useMemo(() => {
    if (!rpcReady) return "…";
    if (!gasGwei) return "—";
    const n = Number(gasGwei);
    const pretty = Number.isFinite(n) ? n.toFixed(n < 0.1 ? 3 : 2) : gasGwei;
    return `${pretty} gwei`;
  }, [gasGwei, rpcReady]);

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center px-6 py-12 relative overflow-hidden">
      <BrotherhoodSigil size={720} className="absolute -right-32 -bottom-40 text-primary/[0.04] pointer-events-none select-none" />

      <div className="max-w-5xl w-full space-y-8 relative">
        {/* Hackathon badge */}
        <div className="flex items-center justify-center">
          <a
            href="https://dorahacks.io/hackathon/vibe-coding-iexec/detail"
            target="_blank"
            rel="noreferrer"
            className="terminal-label px-3 py-1 border border-primary/30 rounded-sm bg-primary/5 text-primary/80 no-underline hover:no-underline hover:text-primary/80"
          >
            ⚡ iExec Vibe Coding Challenge 2026 · Built end-to-end with real on-chain data
          </a>
        </div>

        <div className="grid md:grid-cols-[1.3fr_1fr] gap-10 items-start">
          {/* Left column */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <BrotherhoodSigil size={28} className="text-primary sigil-pulse" />
              <span className="terminal-label text-primary">Brotherhood Protocol · iExec TEE · ERC-7984</span>
            </div>

            <h1 className="font-creed text-5xl md:text-6xl font-bold tracking-[0.06em] uppercase leading-[0.95]">
              Strike.<br />Vanish.<br /><span className="text-primary">Settle.</span>
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Institutional shadow-vault for tokenized commodities. Balances stay encrypted on-chain —
              revealed only inside a TEE enclave, only by you.
            </p>

            {/* Feature highlights */}
            <div className="space-y-2 pt-1">
              {FEATURES.map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-creed uppercase tracking-wide text-foreground">{label}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 font-mono">{sub}</span>
                  </div>
                </div>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="blade-flash flex items-center gap-3 px-6 py-3.5 bg-primary text-primary-foreground uppercase tracking-[0.20em] text-xs font-creed font-bold rounded-sm hover:bg-primary-glow transition glow-primary">
                  <Wallet className="w-4 h-4" /> Take the Creed
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-surface border-border">
                <DropdownMenuLabel className="terminal-label">Choose your vessel</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {connectors.map(c => (
                  <DropdownMenuItem key={c.id} onClick={() => connect({ connector: c })} className="font-mono text-xs cursor-pointer">
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Partner logos */}
            <div className="pt-3 border-t border-border/50 space-y-2">
              <div className="terminal-label text-muted-foreground/60">Powered by</div>
              <div className="flex flex-wrap gap-2">
                {PARTNERS.map(p => (
                  <div
                    key={p.name}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-sm bg-surface/60"
                    style={{ borderColor: `${p.accent}33` }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: p.accent }} />
                    <span className="font-mono text-[10px] font-semibold" style={{ color: p.accent }}>{p.name}</span>
                    <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wide">{p.role}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — network status */}
          <div className="panel-elevated p-5 relative scan-line overflow-hidden creed-watermark">
            <div className="flex items-center justify-between mb-3">
              <div className="terminal-label flex items-center gap-2">
                <AnimusReticle size={14} className="text-animus" /> Animus · Live Network Status
              </div>
              <span className="status-dot bg-success pulse-soft" />
            </div>
            <div className="space-y-2 font-mono text-[11px]">
              <Row k="Chain" v="Arbitrum Sepolia" />
              <Row k="Chain ID" v={String(TARGET_CHAIN_ID)} />
              <Row k="Standard" v="ERC-7984 (Confidential)" />
              <Row k="Compute" v="iExec TEE Enclaves" />
              <Row k="Auditor" v="ChainGPT AI" />
              <Row k="Block" v={blockLabel} />
              <Row k="Gas" v={gasLabel} />
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="terminal-label mb-2">Sanctioned RWAs</div>
              <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                {["XAU", "XAG", "XPT", "DMND", "BRENT", "REE"].map(s => (
                  <span key={s} className="px-2 py-1 border border-border rounded-sm text-center">{s}</span>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="terminal-label mb-1">Architecture</div>
              <div className="text-[10px] font-mono text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  Smart contracts on Arbitrum Sepolia
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                  Decryption inside iExec TEE enclave
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-animus shrink-0" />
                  ChainGPT AI audit + advisor
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border last:border-0">
      <span className="text-muted-foreground uppercase tracking-wider text-[10px]">{k}</span>
      <span className="text-foreground">{v}</span>
    </div>
  );
}
