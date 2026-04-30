"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { parseUnits, type Address } from "viem";
import { Lock, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { wagmiConfig } from "@/lib/wagmi-config";
import { useTutorial } from "@/components/TutorialProvider";
import { TARGET_CHAIN_ID } from "@/lib/chains";
import { getRwaTokens, type ShieldToken } from "@/lib/tokens";
import {
  getRoomCount, getRoom, createVaultRoom, contributeToVault, type VaultRoom,
  readAllowance, approveUnderlying,
} from "@/lib/nox";

const VAULT_ADDR = (process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS ?? null) as Address | null;

export default function Vaults() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const tokens = useMemo(() => (mounted ? getRwaTokens() : []), [mounted]);
  const canAct = mounted && !!address && chainId === TARGET_CHAIN_ID && !!VAULT_ADDR;

  const [rooms, setRooms] = useState<VaultRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  const loadRooms = useCallback(async () => {
    if (!publicClient || !VAULT_ADDR) { setLoadingRooms(false); return; }
    setLoadingRooms(true);
    try {
      const count = await getRoomCount(publicClient, VAULT_ADDR);
      const all = await Promise.all(
        Array.from({ length: Number(count) }, (_, i) => getRoom(publicClient, VAULT_ADDR!, BigInt(i)))
      );
      setRooms(
        all
          .filter(r => r.active)
          // Newest first: higher room id means created later.
          .sort((a, b) => (a.id === b.id ? 0 : a.id > b.id ? -1 : 1))
      );
    } catch {
      // silently ignore — vault may be empty
    } finally {
      setLoadingRooms(false);
    }
  }, [publicClient]);

  useEffect(() => {
    if (!mounted) return;
    void loadRooms();
  }, [mounted, loadRooms]);

  const { tutorialStep, completeTutorialStep } = useTutorial();
  const [creating, setCreating] = useState(false);
  const [depositRoom, setDepositRoom] = useState<VaultRoom | null>(null);

  const handleCreate = async (name: string, tokenAddress: Address, goalWei: bigint) => {
    if (!canAct || !publicClient || !address || !VAULT_ADDR) return;
    try {
      const wc = await getWalletClient(wagmiConfig);
      await createVaultRoom(wc, publicClient, VAULT_ADDR, name, tokenAddress, goalWei);
      toast.success("Vault created");
      setCreating(false);
      await loadRooms();
      // Complete after modal closes so the tutorial card doesn't overlap the dialog.
      if (tutorialStep === 4) completeTutorialStep();
    } catch (e) {
      toast.error("Failed to create vault", { description: e instanceof Error ? e.message : "" });
    }
  };

  const handleDeposit = async (room: VaultRoom, amountWei: bigint) => {
    if (!canAct || !publicClient || !VAULT_ADDR) return;
    try {
      const wc = await getWalletClient(wagmiConfig);
      // Vault deposits use ERC-20 transferFrom under the hood, so we must approve first.
      // Without allowance, MetaMask fails gas estimation (shows "fee not available"/crazy gas).
      if (address) {
        const allowance = await readAllowance(publicClient, room.token, address as Address, VAULT_ADDR);
        if (allowance < amountWei) {
          toast.message("Approving token for vault…");
          await approveUnderlying(wc, publicClient, room.token, VAULT_ADDR, amountWei);
        }
      }
      await contributeToVault(wc, publicClient, VAULT_ADDR, room.id, amountWei);
      toast.success("Confidential deposit confirmed");
      setDepositRoom(null);
      await loadRooms();
    } catch (e) {
      toast.error("Deposit failed", { description: e instanceof Error ? e.message : "" });
    }
  };

  const tokenByAddress = useMemo(() => {
    const m: Record<string, ShieldToken> = {};
    for (const t of tokens) m[t.underlyingAddress.toLowerCase()] = t;
    return m;
  }, [tokens]);

  if (!VAULT_ADDR && mounted) {
    return (
      <div className="max-w-[1480px] mx-auto px-3 md:px-6 py-8">
        <div className="panel p-6 text-sm text-warning font-mono">
          Vault contract not configured. Set <code>NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS</code> in your environment.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1480px] mx-auto px-3 md:px-6 py-5 md:py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="terminal-heading text-lg">Shadow Vaults</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Anonymous brotherhood pools — public total, private contributions. No member sees another&apos;s blade.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          disabled={!canAct}
          data-tutorial="tutorial-create-vault"
          className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2.5 bg-primary text-primary-foreground uppercase tracking-[0.14em] text-xs font-semibold rounded-sm hover:bg-primary-glow transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" /> New Vault
        </button>
      </div>

      {loadingRooms && (
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="panel-elevated p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-muted animate-pulse rounded-sm" />
                  <div className="h-4 w-40 bg-muted animate-pulse rounded-sm" />
                </div>
                <div className="h-5 w-20 bg-muted animate-pulse rounded-sm" />
              </div>
              <div className="space-y-2">
                <div className="h-6 w-28 bg-muted animate-pulse rounded-sm" />
                <div className="h-1 w-full bg-muted animate-pulse rounded-sm" />
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-muted/60 animate-pulse rounded-sm" />
                  <div className="h-3 w-24 bg-muted/60 animate-pulse rounded-sm" />
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-border">
                <div className="flex-1 h-9 bg-muted animate-pulse rounded-sm" />
                <div className="h-9 w-16 bg-muted animate-pulse rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loadingRooms && rooms.length === 0 && (
        <div className="panel p-6 text-sm text-muted-foreground font-mono">
          No vault rooms yet. Create one to start a confidential pool.
        </div>
      )}

      {!loadingRooms && (
      <div className="grid md:grid-cols-2 gap-4">
        {rooms.map(v => {
          const token = tokenByAddress[v.token.toLowerCase()];
          const goal = Number(v.goal) / 1e18;
          const raised = Number(v.totalRaised) / 1e18;
          const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
          return (
            <div key={String(v.id)} className="panel-elevated p-5 space-y-4 creed-watermark">
              <div className="flex items-start justify-between">
                <div>
                  <div className="terminal-label">ROOM #{String(v.id)}</div>
                  <h3 className="text-sm font-display font-semibold mt-1">{v.name}</h3>
                  {token && (
                    <p className="text-xs text-muted-foreground mt-1">Token: {token.symbol}</p>
                  )}
                </div>
                <span className="chip text-primary border-primary/40 bg-primary/5"><Lock className="w-2.5 h-2.5" /> ERC-7984</span>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="num text-xl">{raised.toLocaleString(undefined, { maximumFractionDigits: 2 })} {token?.symbol ?? "tokens"}</span>
                  <span className="terminal-label">of {goal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="h-1 bg-background rounded-sm overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] font-mono text-muted-foreground">
                  <span>{pct.toFixed(2)}% raised</span>
                  <span>Owner: {v.owner.slice(0, 6)}…{v.owner.slice(-4)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => setDepositRoom(v)}
                  disabled={!canAct}
                  className="flex-1 py-2 bg-primary/10 border border-primary/40 text-primary uppercase tracking-[0.14em] text-[11px] font-semibold rounded-sm hover:bg-primary/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Deposit (Confidential)
                </button>
                <Link
                  href={`/vaults/${v.id}`}
                  className="px-3 py-2 border border-border rounded-sm text-xs hover:border-primary hover:text-primary transition flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> View
                </Link>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/vaults/${v.id}`); toast("Deep link copied"); }}
                  className="px-3 py-2 border border-border rounded-sm text-xs hover:border-primary hover:text-primary transition"
                >
                  Share
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      <CreateVaultModal
        open={creating}
        tokens={tokens}
        onClose={() => setCreating(false)}
        onCreate={handleCreate}
      />
      <DepositModal
        room={depositRoom}
        tokens={tokens}
        onClose={() => setDepositRoom(null)}
        onDeposit={handleDeposit}
      />
    </div>
  );
}

function CreateVaultModal({ open, tokens, onClose, onCreate }: {
  open: boolean;
  tokens: ShieldToken[];
  onClose: () => void;
  onCreate: (name: string, tokenAddress: Address, goalWei: bigint) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [tokenId, setTokenId] = useState(tokens[0]?.id ?? "");
  const [goal, setGoal] = useState("1000");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (tokens[0]) setTokenId(tokens[0].id); }, [tokens]);

  const generateVaultName = () => {
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
    // 4-char base36 suffix keeps it short but practically unique per open.
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `Shadow Vault ${stamp}-${suffix}`;
  };

  // Prefill a unique, sensible default so onboarding users can just click "Create Vault".
  useEffect(() => {
    if (!open) return;
    setName((prev) => (prev.trim().length > 0 ? prev : generateVaultName()));
  }, [open]);

  const token = tokens.find(t => t.id === tokenId);

  const submit = async () => {
    if (!name || !token) return;
    setLoading(true);
    try {
      const goalWei = parseUnits(goal, token.decimals);
      await onCreate(name, token.underlyingAddress, goalWei);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="bg-surface border-border max-w-md p-0">
        <DialogHeader className="panel-header">
          <DialogTitle className="terminal-heading text-sm">CREATE VAULT</DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <Field label="Vault Name">
            <input value={name} onChange={e => setName(e.target.value)} className="nox-input" placeholder="e.g. Q1 Gold Reserve" disabled={loading} />
          </Field>
          <Field label="Asset Token">
            <select value={tokenId} onChange={e => setTokenId(e.target.value)} className="nox-input" disabled={loading}>
              {tokens.map(t => <option key={t.id} value={t.id}>{t.symbol} — {t.name}</option>)}
            </select>
          </Field>
          <Field label="Goal (token amount)">
            <input value={goal} onChange={e => setGoal(e.target.value)} className="nox-input font-mono" disabled={loading} />
          </Field>
          <button
            disabled={!name || loading}
            onClick={() => void submit()}
            className="w-full py-3 bg-primary text-primary-foreground uppercase tracking-[0.18em] text-xs font-semibold rounded-sm disabled:opacity-30 hover:bg-primary-glow transition"
          >
            {loading ? "Creating…" : "Create Vault"}
          </button>
          <style>{`.nox-input { width: 100%; background: hsl(var(--background)); border: 1px solid hsl(var(--border)); border-radius: 2px; padding: 0.5rem 0.75rem; font-size: 0.8125rem; outline: none; color: hsl(var(--foreground)); } .nox-input:focus { border-color: hsl(var(--primary)); }`}</style>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DepositModal({ room, tokens, onClose, onDeposit }: {
  room: VaultRoom | null;
  tokens: ShieldToken[];
  onClose: () => void;
  onDeposit: (room: VaultRoom, amountWei: bigint) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => {
    if (!room) return tokens[0];
    return tokens.find(t => t.underlyingAddress.toLowerCase() === room.token.toLowerCase()) ?? tokens[0];
  }, [room, tokens]);

  if (!room) return null;

  const submit = async () => {
    if (!amount || !token) return;
    setLoading(true);
    try {
      const amountWei = parseUnits(amount, token.decimals);
      await onDeposit(room, amountWei);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!room} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="bg-surface border-border max-w-md p-0">
        <DialogHeader className="panel-header">
          <DialogTitle className="terminal-heading text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> CONFIDENTIAL DEPOSIT
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="p-3 bg-background border border-border rounded-sm">
            <div className="text-sm font-display font-semibold">{room.name}</div>
            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">Room #{String(room.id)}</div>
          </div>
          <Field label={`Amount (${token?.symbol ?? "tokens"})`}>
            <input value={amount} onChange={e => setAmount(e.target.value)} className="nox-input font-mono" placeholder="0.00" disabled={loading} />
          </Field>
          <div className="text-[10px] text-secondary font-mono leading-relaxed border border-secondary/30 bg-secondary/5 p-2.5 rounded-sm">
            ⚠ Your contribution is encrypted on-chain. The pool&apos;s public total updates, but your amount stays confidential.
          </div>
          <button
            disabled={!amount || parseFloat(amount) <= 0 || loading}
            onClick={() => void submit()}
            className="w-full py-3 bg-primary text-primary-foreground uppercase tracking-[0.18em] text-xs font-semibold rounded-sm disabled:opacity-30 hover:bg-primary-glow transition"
          >
            {loading ? "Encrypting & depositing…" : "Confirm Deposit"}
          </button>
          <style>{`.nox-input { width: 100%; background: hsl(var(--background)); border: 1px solid hsl(var(--border)); border-radius: 2px; padding: 0.5rem 0.75rem; font-size: 0.8125rem; outline: none; color: hsl(var(--foreground)); } .nox-input:focus { border-color: hsl(var(--primary)); }`}</style>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><label className="terminal-label">{label}</label>{children}</div>;
}
