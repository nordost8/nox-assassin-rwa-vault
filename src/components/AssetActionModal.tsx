"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Loader2, Lock, Copy } from "lucide-react";
import { HiddenBlade, EagleHead, AnimusReticle, BrotherhoodSigil } from "@/components/AssassinIcon";
import AssetIcon from "@/components/AssetIcon";
import { toast } from "sonner";
import type { ShieldToken } from "@/lib/tokens";
import { useTutorial } from "@/components/TutorialProvider";

type Mode = "shield" | "reveal" | "transfer" | null;

export interface AssetActionCallbacks {
  onShield: (token: ShieldToken, amount: string, onProgress: (step: number) => void) => Promise<void>;
  onReveal: (token: ShieldToken, onProgress: (step: number) => void) => Promise<string>;
  onTransfer: (token: ShieldToken, to: string, amount: string, onProgress: (step: number) => void) => Promise<void>;
}

interface Props {
  asset: ShieldToken | null;
  mode: Mode;
  publicBalance: bigint;
  onClose: () => void;
  callbacks: AssetActionCallbacks;
}

const STEPS: Record<Exclude<Mode, null>, { label: string; tech: string }[]> = {
  shield: [
    { label: "Slip into the shadows", tech: "Approve ERC-20" },
    { label: "Don the hood", tech: "Wrap into ERC-7984" },
    { label: "Vanish on-chain", tech: "Encrypt balance" },
  ],
  reveal: [
    { label: "Lower the hood", tech: "Request decryption" },
    { label: "Brotherhood verification", tech: "Verify in iExec TEE" },
    { label: "Step into the light", tech: "Return plaintext" },
  ],
  transfer: [
    { label: "Mark the target", tech: "Validate recipient" },
    { label: "Conceal the blade", tech: "Encrypt amount" },
    { label: "Strike from shadow", tech: "Submit confidential tx" },
  ],
};

export default function AssetActionModal({ asset, mode, publicBalance, onClose, callbacks }: Props) {
  const { tutorialStep, completeTutorialStep } = useTutorial();
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [revealedAmount, setRevealedAmount] = useState<string | null>(null);
  const [hash] = useState(() => "0x" + Array.from({ length: 12 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(""));

  useEffect(() => {
    if (asset && mode) {
      // Match frontend-donor tutorial UX: prefill shield amount on step 2
      const publicNum = Number(publicBalance) / 1e18;
      setAmount(mode === "shield" && tutorialStep === 2 ? String(publicNum) : "");
      setRecipient("");
      setStep(0);
      setRunning(false);
      setDone(false);
      setRevealedAmount(null);
    }
  }, [asset, mode, publicBalance, tutorialStep]);

  if (!asset || !mode) return null;
  const steps = STEPS[mode];

  const publicNum = Number(publicBalance) / 1e18;

  const run = async () => {
    setStep(0);
    setRunning(true);
    try {
      const onProgress = (s: number) => setStep(s);
      if (mode === "shield") await callbacks.onShield(asset, amount, onProgress);
      else if (mode === "reveal") {
        const val = await callbacks.onReveal(asset, onProgress);
        setRevealedAmount(val);
      }
      else await callbacks.onTransfer(asset, recipient, amount, onProgress);
      setStep(steps.length);
      setDone(true);
      // Shield auto-advances; Reveal lets user read the balance first (button below)
      if (mode === "shield" && tutorialStep === 2) {
        completeTutorialStep();
        setTimeout(() => onClose(), 1400);
      }
      const flavor = mode === "shield"
        ? "The blade is sheathed. Your asset moves unseen."
        : mode === "reveal"
          ? "The hood is lowered. The Brotherhood verifies."
          : "Strike confirmed. Settled in shadow.";
      toast.success(`${mode.toUpperCase()} confirmed`, {
        description: `${flavor} · Arbitrum Sepolia.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      toast.error("Transaction failed", { description: msg });
    } finally {
      setRunning(false);
    }
  };

  const ready = mode === "reveal"
    ? true
    : mode === "transfer"
      ? !!recipient && parseFloat(amount) > 0
      : parseFloat(amount) > 0 && parseFloat(amount) <= publicNum;

  const title = mode === "shield"
    ? "CLOAK ASSET · SHIELD"
    : mode === "reveal"
      ? "LOWER THE HOOD · REVEAL BALANCE"
      : "STRIKE FROM SHADOW · CONFIDENTIAL TRANSFER";

  return (
    <Dialog open={!!asset && !!mode} onOpenChange={(o) => !o && !running && onClose()}>
      <DialogContent className="bg-surface border-border max-w-lg p-0 overflow-hidden creed-watermark">
        <DialogHeader className="panel-header">
          <DialogTitle className="creed-heading text-xs md:text-sm flex items-center gap-2 md:gap-3 min-w-0 break-words">
            {mode === "shield" && <HiddenBlade size={16} className="text-primary flex-shrink-0" />}
            {mode === "reveal" && <EagleHead size={16} className="text-secondary flex-shrink-0" />}
            {mode === "transfer" && <AnimusReticle size={16} className="text-animus flex-shrink-0" />}
            <span className="break-words leading-tight">{title}</span>
          </DialogTitle>
          <span className="terminal-label flex items-center gap-1.5">
            <BrotherhoodSigil size={12} className="text-primary/80" /> Brotherhood Protocol
          </span>
        </DialogHeader>

        <div className="p-4 md:p-6 space-y-5">
          <div className="p-3 bg-background border border-border rounded-sm space-y-2">
            <div className="flex items-center gap-3 min-w-0">
              <AssetIcon assetId={asset.iconId ?? asset.id.replace("rwa-", "")} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-display font-semibold truncate">{asset.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground truncate">{asset.underlyingAddress}</div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
              <span className="terminal-label">Public Balance</span>
              <span className="num text-xs md:text-sm">{publicNum.toLocaleString(undefined, { maximumFractionDigits: 4 })} {asset.symbol}</span>
            </div>
          </div>

          {!done && (
            <>
              {mode !== "reveal" && (
                <div className="space-y-2">
                  <label className="terminal-label">Amount ({asset.symbol})</label>
                  <div className="flex gap-2">
                    <input
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={running}
                      className="flex-1 bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary disabled:opacity-50"
                    />
                    <button
                      onClick={() => setAmount(String(publicNum))}
                      disabled={running}
                      className="px-3 text-[10px] uppercase tracking-wider border border-border rounded-sm hover:border-primary hover:text-primary transition disabled:opacity-50"
                    >
                      Max
                    </button>
                  </div>
                </div>
              )}

              {mode === "transfer" && (
                <div className="space-y-2">
                  <label className="terminal-label">Recipient Address</label>
                  <input
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    placeholder="0x..."
                    disabled={running}
                    className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-xs focus:outline-none focus:border-primary disabled:opacity-50"
                  />
                  <div className="text-[10px] text-muted-foreground font-mono">⚠ Amount will be encrypted; recipient receives it as confidential balance.</div>
                </div>
              )}

              {mode === "reveal" && (
                <div className="p-3 border border-secondary/30 bg-secondary/5 rounded-sm">
                  <div className="text-xs text-secondary font-mono break-words leading-relaxed">
                    Decryption is performed inside an iExec TEE enclave. Only your wallet can authorize this request.
                  </div>
                </div>
              )}
            </>
          )}

          {(running || done) && (
            <div className={`space-y-2 border-t border-border pt-4 ${running ? "animus-boot rounded-sm p-3 -mx-1" : ""}`}>
              <div className="terminal-label flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {running && <AnimusReticle size={11} className="text-animus animate-spin" />}
                  {running ? "Animus · Synchronizing memory" : "Memory record"}
                </span>
                <span className="font-mono normal-case tracking-normal text-muted-foreground flex items-center gap-1">
                  {hash.slice(0, 10)}…
                  <button onClick={() => { navigator.clipboard.writeText(hash); toast("Hash copied"); }}>
                    <Copy className="w-3 h-3" />
                  </button>
                </span>
              </div>
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-3 py-1.5">
                  <div className={`w-5 h-5 mt-0.5 flex-shrink-0 rounded-full flex items-center justify-center border ${i < step || done ? "bg-success/20 border-success text-success" : i === step && running ? "border-animus text-animus" : "border-border text-muted-foreground"}`}>
                    {i < step || done ? <Check className="w-3 h-3" /> : i === step && running ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="text-[10px] font-mono">{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
                    <span className={`text-xs font-creed tracking-wide ${i < step || done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-wider truncate">{s.tech}</span>
                  </div>
                </div>
              ))}
              {done && mode === "reveal" && revealedAmount && (
                <div className="mt-3 p-3 bg-background border border-secondary/40 rounded-sm">
                  <div className="terminal-label text-secondary mb-1 flex items-center gap-1.5">
                    <EagleHead size={11} className="text-secondary" /> Decrypted Balance · Eagle Vision
                  </div>
                  <div className="num text-lg md:text-2xl text-secondary flex items-center gap-2 break-all">
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    <span>{revealedAmount} {asset.symbol}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!done ? (
            <button
              onClick={() => void run()}
              disabled={!ready || running}
              className="blade-flash w-full py-3 bg-primary text-primary-foreground uppercase tracking-[0.20em] text-xs font-creed font-bold rounded-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary-glow transition"
            >
              {running
                ? "Moving in shadows…"
                : mode === "shield"
                  ? "Vanish — Confirm Cloak"
                  : mode === "reveal"
                    ? "Lower the Hood — Confirm Reveal"
                    : "Strike — Send Confidentially"}
            </button>
          ) : mode === "reveal" && tutorialStep === 3 ? (
            <button
              onClick={() => { completeTutorialStep(); onClose(); }}
              className="blade-flash w-full py-3 bg-secondary text-secondary-foreground uppercase tracking-[0.20em] text-xs font-creed font-bold rounded-sm hover:opacity-90 transition"
            >
              I&apos;ve seen my balance · Continue →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="blade-flash w-full py-3 border border-primary text-primary uppercase tracking-[0.20em] text-xs font-creed font-bold rounded-sm hover:bg-primary/10 transition"
            >
              Requiescat in Pace · Done
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
