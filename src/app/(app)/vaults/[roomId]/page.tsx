"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { parseUnits, type Address } from "viem";
import { ArrowLeft, Lock, Copy, Check, Loader2, Users, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { wagmiConfig } from "@/lib/wagmi-config";
import { TARGET_CHAIN_ID } from "@/lib/chains";
import { getRwaTokens } from "@/lib/tokens";
import { getRoom, contributeToVault, readAllowance, approveUnderlying, type VaultRoom } from "@/lib/nox";
import { BrotherhoodSigil, HiddenBlade } from "@/components/AssassinIcon";
import AssetIcon from "@/components/AssetIcon";

const VAULT_ADDR = (process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS ?? null) as Address | null;

export default function VaultRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = BigInt(String(params.roomId ?? "0"));

  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const [room, setRoom] = useState<VaultRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const tokens = useMemo(() => (mounted ? getRwaTokens() : []), [mounted]);
  const canAct = mounted && !!address && chainId === TARGET_CHAIN_ID && !!VAULT_ADDR;

  const token = useMemo(() => {
    if (!room) return null;
    return tokens.find(t => t.underlyingAddress.toLowerCase() === room.token.toLowerCase()) ?? null;
  }, [room, tokens]);

  const loadRoom = useCallback(async () => {
    if (!publicClient || !VAULT_ADDR) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await getRoom(publicClient, VAULT_ADDR, roomId);
      if (!r.active) { setNotFound(true); }
      else { setRoom(r); }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [publicClient, roomId]);

  useEffect(() => {
    if (!mounted) return;
    void loadRoom();
  }, [mounted, loadRoom]);

  // Deposit state
  const [amount, setAmount] = useState("");
  const [depositing, setDepositing] = useState(false);

  const handleDeposit = async () => {
    if (!room || !canAct || !publicClient || !VAULT_ADDR || !address) return;
    const dec = token?.decimals ?? 18;
    const amountWei = parseUnits(amount, dec);
    setDepositing(true);
    try {
      const wc = await getWalletClient(wagmiConfig);
      const allowance = await readAllowance(publicClient, room.token, address as Address, VAULT_ADDR);
      if (allowance < amountWei) {
        await approveUnderlying(wc, publicClient, room.token, VAULT_ADDR, amountWei);
      }
      await contributeToVault(wc, publicClient, VAULT_ADDR, room.id, amountWei);
      toast.success("Deposited confidentially", { description: "Your contribution is encrypted on-chain." });
      setAmount("");
      await loadRoom();
    } catch (e) {
      toast.error("Deposit failed", { description: e instanceof Error ? e.message : "" });
    } finally {
      setDepositing(false);
    }
  };

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/vaults/${String(roomId)}`
    : `/vaults/${String(roomId)}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast("Link copied to clipboard");
  };

  if (!mounted || loading) {
    return (
      <div className="max-w-2xl mx-auto px-3 md:px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-24 bg-muted animate-pulse rounded-sm" />
        </div>
        <div className="panel-elevated p-6 space-y-5">
          <div className="h-4 w-16 bg-muted animate-pulse rounded-sm" />
          <div className="h-6 w-48 bg-muted animate-pulse rounded-sm" />
          <div className="h-1 w-full bg-muted animate-pulse rounded-sm" />
          <div className="h-10 w-full bg-muted/60 animate-pulse rounded-sm" />
        </div>
      </div>
    );
  }

  if (notFound || !room) {
    return (
      <div className="max-w-2xl mx-auto px-3 md:px-6 py-8 space-y-6">
        <Link href="/vaults" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Vaults
        </Link>
        <div className="panel p-8 text-center space-y-3">
          <BrotherhoodSigil size={40} className="mx-auto text-muted-foreground/30" />
          <div className="terminal-label text-destructive">Vault Room #{String(roomId)} not found</div>
          <p className="text-sm text-muted-foreground">This room may have been closed or the ID is incorrect.</p>
          <Link href="/vaults" className="inline-block mt-2 px-4 py-2 bg-primary text-primary-foreground text-xs uppercase tracking-[0.14em] font-semibold rounded-sm hover:bg-primary-glow transition">
            View all vaults
          </Link>
        </div>
      </div>
    );
  }

  const goal = Number(room.goal) / 1e18;
  const raised = Number(room.totalRaised) / 1e18;
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  const sym = token?.symbol ?? "tokens";

  return (
    <div className="max-w-2xl mx-auto px-3 md:px-6 py-8 space-y-6">
      {/* Back link */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Vaults
        </button>
        <button onClick={copyLink} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition uppercase tracking-wider">
          <Copy className="w-3 h-3" /> Share vault
        </button>
      </div>

      {/* Room header */}
      <div className="panel-elevated p-5 md:p-6 space-y-5 creed-watermark relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="terminal-label text-primary">ROOM #{String(room.id)}</div>
            <h1 className="text-xl font-display font-bold truncate">{room.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {token && <AssetIcon assetId={token.iconId ?? token.id.replace("rwa-", "")} size={20} />}
              <span className="text-xs text-muted-foreground font-mono">{sym} · ERC-7984 Confidential</span>
            </div>
          </div>
          <span className="chip text-primary border-primary/40 bg-primary/5 shrink-0">
            <Lock className="w-2.5 h-2.5" /> Active
          </span>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="num text-2xl">{raised.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-base text-muted-foreground">{sym}</span></span>
            <span className="terminal-label">of {goal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {sym}</span>
          </div>
          <div className="h-2 bg-background border border-border rounded-sm overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
            <span>{pct.toFixed(2)}% funded</span>
            <span>{(goal - raised).toLocaleString(undefined, { maximumFractionDigits: 2 })} {sym} remaining</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <div className="text-center space-y-1">
            <Target className="w-4 h-4 mx-auto text-muted-foreground" />
            <div className="num text-sm">{goal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div className="terminal-label text-[9px]">Goal</div>
          </div>
          <div className="text-center space-y-1">
            <TrendingUp className="w-4 h-4 mx-auto text-primary" />
            <div className="num text-sm text-primary">{raised.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            <div className="terminal-label text-[9px]">Raised</div>
          </div>
          <div className="text-center space-y-1">
            <Users className="w-4 h-4 mx-auto text-muted-foreground" />
            <div className="num text-sm">Private</div>
            <div className="terminal-label text-[9px]">Contributors</div>
          </div>
        </div>
      </div>

      {/* Owner info */}
      <div className="panel p-4 space-y-2">
        <div className="terminal-label">Vault Owner</div>
        <div className="font-mono text-xs text-muted-foreground break-all">{room.owner}</div>
        <div className="text-[10px] text-muted-foreground">
          Contributions are encrypted — no member can see another&apos;s amount. Only the public pool total is visible.
        </div>
      </div>

      {/* Deposit form */}
      {canAct ? (
        <div className="panel-elevated p-5 space-y-4">
          <div className="flex items-center gap-2">
            <HiddenBlade size={16} className="text-primary" />
            <span className="terminal-heading text-sm">Confidential Deposit</span>
          </div>
          <div className="p-3 border border-secondary/30 bg-secondary/5 rounded-sm text-[10px] text-secondary font-mono leading-relaxed">
            Your contribution amount is encrypted via iExec TEE. The vault total updates publicly, but your individual amount is hidden from all observers.
          </div>
          <div className="space-y-2">
            <label className="terminal-label">Amount ({sym})</label>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={depositing}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary disabled:opacity-50"
            />
          </div>
          <button
            onClick={() => void handleDeposit()}
            disabled={!amount || parseFloat(amount) <= 0 || depositing}
            className="blade-flash w-full py-3 bg-primary text-primary-foreground uppercase tracking-[0.20em] text-xs font-creed font-bold rounded-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary-glow transition flex items-center justify-center gap-2"
          >
            {depositing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Encrypting &amp; depositing…</> : "Deposit confidentially"}
          </button>
        </div>
      ) : (
        <div className="panel p-4 text-sm text-muted-foreground text-center">
          Connect your wallet on Arbitrum Sepolia to deposit into this vault.
        </div>
      )}

      {/* Share section */}
      <div className="flex items-center gap-3 p-4 border border-border rounded-sm bg-surface/50">
        <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="terminal-label mb-0.5">Share this vault</div>
          <div className="font-mono text-[10px] text-muted-foreground truncate">{shareUrl}</div>
        </div>
        <button onClick={copyLink} className="px-3 py-1.5 border border-border rounded-sm text-xs hover:border-primary hover:text-primary transition shrink-0">
          Copy
        </button>
      </div>
    </div>
  );
}
