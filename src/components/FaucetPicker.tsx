"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Check, Droplet } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AssetIcon from "@/components/AssetIcon";
import { RWA_ASSETS, saveSelectedAssets } from "@/lib/rwa-assets";
import { getRwaContractAddrs } from "@/lib/tokens";
import { mintSelectedAssets } from "@/app/actions/faucet";
import { useTutorial } from "@/components/TutorialProvider";
import { KEYS } from "@/lib/storage-keys";

interface Props {
  open: boolean;
  onDone: () => void;
}

export default function FaucetPicker({ open, onDone }: Props) {
  const { address } = useAccount();
  const { startTutorial } = useTutorial();
  const [selected, setSelected] = useState<string[]>(["gold", "silver", "oil"]);
  const [minting, setMinting] = useState(false);
  type StepStatus = "pending" | "active" | "done" | "error";
  const [progress, setProgress] = useState<{ label: string; status: StepStatus }[]>([]);
  const [allDone, setAllDone] = useState(false);

  const toggle = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const handleMint = async () => {
    if (selected.length === 0) return;
    saveSelectedAssets(selected);

    if (!address) { onDone(); return; }

    const tokenAddresses = selected
      .map(id => getRwaContractAddrs(id)?.underlying)
      .filter((a): a is `0x${string}` => !!a);

    if (tokenAddresses.length === 0) { onDone(); return; }

    const steps = selected.map(id => {
      const asset = RWA_ASSETS.find(a => a.id === id);
      return { label: `Minting ${asset?.symbol ?? id}…`, status: "pending" as const };
    });
    steps.push({ label: "Portfolio ready", status: "pending" });
    setProgress(steps);
    setMinting(true);

    const update = (i: number, status: StepStatus) =>
      setProgress(prev => prev.map((s, j) => j === i ? { ...s, status } : s));

    try {
      let okCount = 0;
      for (let i = 0; i < selected.length; i++) {
        update(i, "active");
        const token = tokenAddresses[i];
        if (!token) { update(i, "error"); continue; }
        const { results } = await mintSelectedAssets(address, [token]);
        const ok = !!results[0]?.ok;
        if (ok) okCount++;
        update(i, ok ? "done" : "error");
      }
      update(selected.length, "active");
      await new Promise(r => setTimeout(r, 600));
      update(selected.length, "done");
      setAllDone(true);
      if (okCount > 0) localStorage.setItem(KEYS.faucetDone, "1");
      if (okCount > 0) startTutorial();
    } catch {
      setAllDone(true);
    }
  };

  if (minting) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="bg-surface border-border max-w-sm p-0 [&>button]:hidden">
          <div className="panel-header">
            <div className="terminal-heading text-sm">Setting up your portfolio</div>
          </div>
          <div className="p-6 space-y-3">
            {progress.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                  step.status === "done" ? "bg-success/20 border-success text-success" :
                  step.status === "active" ? "border-primary text-primary" :
                  step.status === "error" ? "border-destructive text-destructive" :
                  "border-border text-muted-foreground"
                }`}>
                  {step.status === "done" ? <Check className="w-3 h-3" /> :
                   step.status === "active" ? <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> :
                   step.status === "error" ? <span className="text-[10px]">!</span> :
                   <span className="w-1.5 h-1.5 rounded-full bg-border" />}
                </div>
                <span className={`text-sm ${
                  step.status === "done" ? "text-success" :
                  step.status === "active" ? "text-foreground" :
                  step.status === "error" ? "text-destructive" :
                  "text-muted-foreground"
                }`}>{step.label}</span>
              </div>
            ))}
            {allDone && (
              <button
                onClick={onDone}
                className="mt-4 w-full py-2.5 bg-primary text-primary-foreground uppercase tracking-[0.18em] text-xs font-semibold rounded-sm hover:bg-primary-glow transition"
              >
                Open Portfolio
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="bg-surface border-border max-w-2xl p-0 [&>button]:hidden">
        <div className="panel-header">
          <div className="terminal-heading text-sm flex items-center gap-2 min-w-0">
            <Droplet className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="truncate">TESTNET FAUCET — Select your RWAs</span>
          </div>
        </div>
        <div className="p-5 md:p-6 space-y-5">
          <p className="text-sm text-muted-foreground">
            Choose which Real World Assets to mint into your wallet. These are testnet ERC-20 tokens on Arbitrum Sepolia —
            you&apos;ll be able to shield them into ERC-7984 confidential balances right after.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {RWA_ASSETS.map(a => {
              const on = selected.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggle(a.id)}
                  className={`p-4 rounded-sm border text-left transition relative ${on ? "border-primary bg-primary/5" : "border-border hover:border-border-strong bg-background"}`}
                >
                  {on && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-sm bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  <AssetIcon assetId={a.id} size={40} />
                  <div className="mt-3">
                    <div className="text-sm font-semibold">{a.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{a.symbol}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="terminal-label">{selected.length} asset(s) selected</span>
            <button
              disabled={selected.length === 0}
              onClick={() => void handleMint()}
              className="px-6 py-2.5 bg-primary text-primary-foreground uppercase tracking-[0.18em] text-xs font-semibold rounded-sm disabled:opacity-30 hover:bg-primary-glow transition"
            >
              Mint Selected Tokens
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
