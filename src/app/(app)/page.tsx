"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { getWalletClient } from "@wagmi/core";
import { parseUnits, zeroHash, type Address } from "viem";
import { Lock, ShieldOff, Eye, Shield, ArrowRight, Bug, Search } from "lucide-react";
import { wagmiConfig } from "@/lib/wagmi-config";
import { TARGET_CHAIN, TARGET_CHAIN_ID } from "@/lib/chains";
import { getRwaEnvDiagnostics, getRwaTokens, type ShieldToken } from "@/lib/tokens";
import { RWA_ASSETS } from "@/lib/rwa-assets";
import { ASSET_META } from "@/lib/asset-meta";
import { readErc20Balance } from "@/lib/erc20";
import { formatTokenAmount } from "@/lib/format";
import {
  approveUnderlying, decryptConfidentialBalance, encryptTransferAmount,
  getConfidentialBalanceHandle, getHandleClient, transferConfidential, wrapToken,
} from "@/lib/nox";
import { amountSchema, evmAddressSchema } from "@/lib/validation";
import AssetIcon from "@/components/AssetIcon";
import AssetActionModal, { type AssetActionCallbacks } from "@/components/AssetActionModal";
import AuditModal from "@/components/AuditModal";
import PriceSparkline from "@/components/PriceSparkline";
import PriceChartModal from "@/components/PriceChartModal";
import NewsTicker from "@/components/NewsTicker";
import { useTutorialOptional } from "@/components/TutorialProvider";

export default function Portfolio() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const noxDiagLoggedRef = useRef(false);
  const [selectedTick, setSelectedTick] = useState(0);
  useEffect(() => {
    if (!mounted) return;
    const bump = () => {
      setSelectedTick((t) => t + 1);
      // allow re-diagnostics after selection changes
      noxDiagLoggedRef.current = false;
      lastScannedRef.current = null;
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "nox_selected_rwa") bump();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("nox_selected_rwa_changed", bump as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("nox_selected_rwa_changed", bump as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const [tokens, setTokens] = useState<ReturnType<typeof getRwaTokens>>([]);
  useEffect(() => {
    if (!mounted) return;
    setTokens(getRwaTokens());
  }, [mounted, selectedTick]);
  const canAct = mounted && !!address && chainId === TARGET_CHAIN_ID;
  const tutorialCtx = useTutorialOptional();
  const tutorialStep = tutorialCtx?.tutorialStep ?? 0;
  const firstTokenId = tokens[0]?.id ?? null;

  const lastScannedRef = useRef<string | null>(null);
  const [publicBalances, setPublicBalances] = useState<Record<string, bigint>>({});
  const [confHandles, setConfHandles] = useState<Record<string, `0x${string}`>>({});
  const [observe, setObserve] = useState("");

  const activeAddress = (observe || address) as Address | undefined;

  const scan = useCallback(async () => {
    if (!publicClient || !activeAddress) return;
    const [pub, handles] = await Promise.all([
      Promise.all(tokens.map(async t => [t.id, await readErc20Balance(publicClient, t.underlyingAddress, activeAddress)] as const)),
      Promise.all(tokens.map(async t => [t.id, await getConfidentialBalanceHandle(publicClient, t.confidentialWrapperAddress, activeAddress)] as const)),
    ]);
    setPublicBalances(Object.fromEntries(pub));
    setConfHandles(Object.fromEntries(handles));
  }, [publicClient, activeAddress, tokens]);

  useEffect(() => {
    if (!mounted || !activeAddress || !publicClient || tokens.length === 0) return;
    if (lastScannedRef.current === activeAddress) return;
    lastScannedRef.current = activeAddress;
    void scan();
  }, [mounted, activeAddress, publicClient, tokens, scan]);

  type Mode = "shield" | "reveal" | "transfer" | null;
  const [active, setActive] = useState<ShieldToken | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [auditAsset, setAuditAsset] = useState<ShieldToken | null>(null);
  const [chartAsset, setChartAsset] = useState<(ShieldToken & { rwaId: string }) | null>(null);
  // In-memory only — resets on page reload, never cached. key = token.id
  const [revealedBalances, setRevealedBalances] = useState<Record<string, string>>({});

  const callbacks: AssetActionCallbacks = {
    onShield: async (token, amountHuman, onProgress) => {
      if (!publicClient || !address) throw new Error("Wallet not ready");
      const wc = await getWalletClient(wagmiConfig);
      if (!wc) throw new Error("Wallet client not available");
      if (chainId !== TARGET_CHAIN_ID) throw new Error(`Switch to ${TARGET_CHAIN.name}`);
      const p = amountSchema.safeParse(amountHuman);
      if (!p.success) throw new Error(p.error.flatten().formErrors.join("; "));
      const amountWei = parseUnits(p.data, token.decimals);
      const pub = publicBalances[token.id] ?? 0n;
      if (amountWei > pub) throw new Error("Insufficient public balance");
      // step 0 — "Slip into the shadows": Approve ERC-20 (MetaMask #1)
      await approveUnderlying(wc, publicClient, token.underlyingAddress, token.confidentialWrapperAddress, amountWei);
      onProgress(1); // step 1 — "Don the hood": Wrap into ERC-7984 (MetaMask #2)
      await wrapToken(wc, publicClient, token.confidentialWrapperAddress, address as Address, amountWei);
      onProgress(2); // step 2 — "Vanish on-chain": scan updated balances
      await scan();
    },
    onReveal: async (token, onProgress) => {
      if (!publicClient || !address) throw new Error("Wallet not ready");
      const wc = await getWalletClient(wagmiConfig);
      if (!wc) throw new Error("Wallet client not available");
      const handle = confHandles[token.id] ?? zeroHash;
      if (handle === zeroHash) throw new Error("No shielded balance");
      // step 0 — "Lower the hood": connect to TEE
      const client = await getHandleClient(wc);
      onProgress(1); // step 1 — "Brotherhood verification": decrypt inside TEE
      const { value } = await decryptConfidentialBalance(client, handle);
      onProgress(2); // step 2 — "Step into the light": return plaintext
      const formatted = formatTokenAmount(value, token.decimals);
      setRevealedBalances(prev => ({ ...prev, [token.id]: `${formatted} ${token.symbol}` }));
      return formatted;
    },
    onTransfer: async (token, to, amountHuman, onProgress) => {
      if (!publicClient || !address) throw new Error("Wallet not ready");
      const wc = await getWalletClient(wagmiConfig);
      if (!wc) throw new Error("Wallet client not available");
      const rec = evmAddressSchema.safeParse(to);
      if (!rec.success) throw new Error("Invalid address");
      const p = amountSchema.safeParse(amountHuman);
      if (!p.success) throw new Error(p.error.flatten().formErrors.join("; "));
      const amountWei = parseUnits(p.data, token.decimals);
      // step 0 — "Mark the target": validate + get TEE client
      const handleClient = await getHandleClient(wc);
      onProgress(1); // step 1 — "Conceal the blade": encrypt amount in TEE
      const { encryptedAmount, proof } = await encryptTransferAmount(handleClient, token.confidentialWrapperAddress, amountWei);
      onProgress(2); // step 2 — "Strike from shadow": submit confidential tx (MetaMask)
      await transferConfidential(wc, publicClient, token.confidentialWrapperAddress, rec.data as Address, encryptedAmount, proof);
      await scan();
    },
  };

  const grouped = useMemo(() => {
    const g: Record<string, Array<ShieldToken & { rwaId: string }>> = {};
    for (const t of tokens) {
      const rwaId = t.id.replace("rwa-", "");
      const asset = RWA_ASSETS.find(a => a.id === rwaId);
      const category = asset?.category ?? "Other";
      (g[category] ??= []).push({ ...t, rwaId });
    }
    return g;
  }, [tokens]);

  useEffect(() => {
    if (!mounted) return;
    if (tokens.length > 0) return;
    if (noxDiagLoggedRef.current) return;
    noxDiagLoggedRef.current = true;
    try {
      const selectedRaw = localStorage.getItem("nox_selected_rwa");
      const selected = selectedRaw ? (JSON.parse(selectedRaw) as unknown) : [];
      const ids = Array.isArray(selected) ? selected.filter((x): x is string => typeof x === "string") : [];
      const diag = getRwaEnvDiagnostics(ids);
      console.error("NOX:RWA_TOKENS_EMPTY", { selectedAssets: ids, diag });
    } catch (e) {
      console.error("NOX:RWA_TOKENS_EMPTY", { error: e instanceof Error ? e.message : String(e) });
    }
  }, [mounted, tokens.length]);

  const totalPublicUsd = useMemo(() => {
    return tokens.reduce((sum, t) => {
      const bal = Number(publicBalances[t.id] ?? 0n) / 1e18;
      const rwaId = t.id.replace("rwa-", "");
      const price = ASSET_META[rwaId]?.priceUsd ?? 0;
      return sum + bal * price;
    }, 0);
  }, [tokens, publicBalances]);

  const shieldedCount = useMemo(() =>
    Object.values(confHandles).filter(h => h !== zeroHash).length,
    [confHandles]);

  const open = (t: ShieldToken, m: Mode) => { setActive(t); setMode(m); };

  return (
    <div className="max-w-[1480px] mx-auto px-3 md:px-6 py-5 md:py-8 space-y-6 md:space-y-8">
      <NewsTicker />

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <Stat label="Public Portfolio" value={`$${totalPublicUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} hint="Visible on-chain" />
        <Stat
          label="Confidential"
          value={(() => {
            const list = Object.values(revealedBalances);
            if (list.length > 0) return list.join(" · ");
            return shieldedCount === 0 ? "—" : Array(shieldedCount).fill("●").join(" ");
          })()}
          hint={Object.keys(revealedBalances).length > 0 ? "Decrypted · session" : "ERC-7984 encrypted"}
          accent
          mono={Object.keys(revealedBalances).length > 0}
        />
        <Stat label="Shielded" value={`${shieldedCount} / ${tokens.length}`} hint="Privacy coverage" />
        <Stat label="Network" value="Arbitrum Sepolia" hint="Chain ID 421614" mono />
      </section>

      {/* Observer */}
      <section className="panel p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex items-center gap-2 shrink-0">
          <Search className="w-3.5 h-3.5 text-secondary" />
          <span className="terminal-label text-secondary">OBSERVER MODE</span>
        </div>
        <input
          value={observe}
          onChange={e => { setObserve(e.target.value); lastScannedRef.current = null; }}
          placeholder="Check any address — public balances + confidential status (0x...)"
          className="flex-1 bg-background border border-border rounded-sm px-3 py-2 font-mono text-xs focus:outline-none focus:border-secondary"
        />
        <button onClick={() => { setObserve(""); lastScannedRef.current = null; }} className="text-[10px] uppercase tracking-wider px-3 py-2 border border-border rounded-sm hover:border-secondary hover:text-secondary transition">
          Clear
        </button>
      </section>

      {/* No tokens */}
      {tokens.length === 0 && mounted && (
        <div className="panel p-6 text-sm text-muted-foreground">
          No RWA tokens found. Make sure your assets were selected during onboarding.
        </div>
      )}

      {/* Asset groups */}
      {Object.entries(grouped).map(([cat, list]) => (
        <section key={cat}>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="terminal-heading text-xs">{cat}</h2>
            <div className="flex-1 h-px bg-border" />
            <span className="terminal-label">{list.length} instruments</span>
          </div>

          {/* Desktop table */}
          <div className="panel-elevated overflow-hidden hidden md:block">
            <div className="grid grid-cols-12 px-5 py-2.5 border-b border-border bg-surface-elevated terminal-label gap-2">
              <div className="col-span-3">Asset</div>
              <div className="col-span-2 text-right">Public Balance</div>
              <div className="col-span-2 text-right">Conf. Balance</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
            {list.map((t, i) => {
              const pub = publicBalances[t.id] ?? 0n;
              const handle = confHandles[t.id] ?? zeroHash;
              const isShielded = handle !== zeroHash;
              const meta = ASSET_META[t.rwaId];
              const pubFormatted = formatTokenAmount(pub, t.decimals, 4);
              const pubUsd = (Number(pub) / 1e18) * (meta?.priceUsd ?? 0);
              return (
                <div key={t.id} className={`grid grid-cols-12 px-5 py-3.5 ticker-row items-center gap-2 ${i < list.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                    <AssetIcon assetId={t.rwaId} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{t.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{t.symbol} · ${meta?.priceUsd.toLocaleString()}/{meta?.unit}</div>
                      <div className="mt-1">
                        <PriceSparkline assetId={t.rwaId} days={90} onClick={() => setChartAsset(t)} />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <div className="num text-sm">{pubFormatted}</div>
                    <div className="num text-[10px] text-muted-foreground">${pubUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="col-span-2 text-right">
                    {isShielded
                      ? <div className="num text-sm text-secondary tracking-widest">●●●●●●</div>
                      : <div className="num text-sm text-muted-foreground">—</div>}
                  </div>
                  <div className="col-span-2"><StatusChip isShielded={isShielded} /></div>
                  <div className="col-span-3 flex items-center justify-end gap-1.5 flex-wrap">
                    <ActionBtn label="Shield" icon={Shield} onClick={() => open(t, "shield")} disabled={!canAct || pub === 0n} primary tutorialId={t.id === firstTokenId && tutorialStep === 2 ? "tutorial-shield" : undefined} />
                    <ActionBtn label="Reveal" icon={Eye} onClick={() => open(t, "reveal")} disabled={!canAct || !isShielded} tutorialId={t.id === firstTokenId && tutorialStep === 3 ? "tutorial-reveal" : undefined} />
                    <ActionBtn label="Transfer" icon={ArrowRight} onClick={() => open(t, "transfer")} disabled={!canAct || !isShielded} />
                    <ActionBtn label="Audit" icon={Bug} onClick={() => setAuditAsset(t)} tutorialId={t.id === firstTokenId && tutorialStep === 6 ? "tutorial-audit" : undefined} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {list.map(t => {
              const pub = publicBalances[t.id] ?? 0n;
              const handle = confHandles[t.id] ?? zeroHash;
              const isShielded = handle !== zeroHash;
              const meta = ASSET_META[t.rwaId];
              const pubUsd = (Number(pub) / 1e18) * (meta?.priceUsd ?? 0);
              return (
                <div key={t.id} className="panel-elevated p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <AssetIcon assetId={t.rwaId} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{t.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{t.symbol}</div>
                      <div className="mt-1">
                        <PriceSparkline assetId={t.rwaId} days={30} onClick={() => setChartAsset(t)} />
                      </div>
                    </div>
                    <StatusChip isShielded={isShielded} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                    <div>
                      <div className="terminal-label text-[9px]">Public</div>
                      <div className="num text-sm">{formatTokenAmount(pub, t.decimals, 4)}</div>
                      <div className="num text-[10px] text-muted-foreground">${pubUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <div className="terminal-label text-[9px]">Confidential</div>
                      {isShielded
                        ? <div className="num text-sm text-secondary tracking-widest">●●●●●●</div>
                        : <div className="num text-sm text-muted-foreground">—</div>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <ActionBtn label="Shield" icon={Shield} onClick={() => open(t, "shield")} disabled={!canAct || pub === 0n} primary fullWidth tutorialId={t.id === firstTokenId && tutorialStep === 2 ? "tutorial-shield" : undefined} />
                    <ActionBtn label="Reveal" icon={Eye} onClick={() => open(t, "reveal")} disabled={!canAct || !isShielded} fullWidth tutorialId={t.id === firstTokenId && tutorialStep === 3 ? "tutorial-reveal" : undefined} />
                    <ActionBtn label="Transfer" icon={ArrowRight} onClick={() => open(t, "transfer")} disabled={!canAct || !isShielded} fullWidth />
                    <ActionBtn label="Audit" icon={Bug} onClick={() => setAuditAsset(t)} fullWidth tutorialId={t.id === firstTokenId && tutorialStep === 6 ? "tutorial-audit" : undefined} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <AssetActionModal
        asset={active}
        mode={mode}
        publicBalance={active ? (publicBalances[active.id] ?? 0n) : 0n}
        onClose={() => { setActive(null); setMode(null); }}
        callbacks={callbacks}
      />
      <AuditModal asset={auditAsset} open={!!auditAsset} onClose={() => setAuditAsset(null)} />
      <PriceChartModal asset={chartAsset} open={!!chartAsset} onClose={() => setChartAsset(null)} />
    </div>
  );
}

function Stat({ label, value, hint, accent, mono }: { label: string; value: string; hint?: string; accent?: boolean; mono?: boolean }) {
  return (
    <div className="panel p-4">
      <div className="terminal-label">{label}</div>
      <div className={`mt-1.5 ${mono ? "font-mono text-base" : "num text-2xl"} ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
      {hint && <div className="terminal-label mt-1 normal-case tracking-normal text-[10px]">{hint}</div>}
    </div>
  );
}

function ActionBtn({ label, icon: Icon, onClick, disabled, primary, fullWidth, tutorialId }: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void; disabled?: boolean; primary?: boolean; fullWidth?: boolean; tutorialId?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-tutorial={tutorialId}
      className={`flex items-center ${fullWidth ? "justify-center w-full" : ""} gap-1.5 px-2.5 py-2 text-[10px] uppercase tracking-[0.12em] font-semibold rounded-sm transition border
        ${primary ? "bg-primary/10 border-primary/50 text-primary hover:bg-primary/20" : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-border-strong"}
        disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}

function StatusChip({ isShielded }: { isShielded: boolean }) {
  if (isShielded) return (
    <span className="chip text-primary border-primary/40 bg-primary/5 shrink-0"><Lock className="w-2.5 h-2.5" /> Encrypted</span>
  );
  return (
    <span className="chip text-muted-foreground border-border shrink-0"><ShieldOff className="w-2.5 h-2.5" /> Not Shielded</span>
  );
}
