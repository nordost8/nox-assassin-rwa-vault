"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShieldCheck, AlertTriangle, AlertOctagon, Info, Bug, ExternalLink } from "lucide-react";
import { analyzeContract, type AuditReport, type AuditFinding } from "@/app/actions/chaingpt";
import type { ShieldToken } from "@/lib/tokens";
import { useTutorial } from "@/components/TutorialProvider";
import { KEYS } from "@/lib/storage-keys";

interface Props {
  asset: ShieldToken | null;
  open: boolean;
  onClose: () => void;
}

const SEVERITY_META = {
  Critical: { color: "text-destructive", border: "border-destructive/40", bg: "bg-destructive/5", icon: AlertOctagon },
  High:     { color: "text-warning",     border: "border-warning/40",     bg: "bg-warning/5",     icon: AlertOctagon },
  Medium:   { color: "text-secondary",   border: "border-secondary/40",   bg: "bg-secondary/5",   icon: AlertTriangle },
  Low:      { color: "text-muted-foreground", border: "border-border",    bg: "bg-background",    icon: Info },
} as const;

const OVERALL_META = {
  CRITICAL: { label: "CRITICAL RISK", color: "text-destructive", border: "border-destructive/40", bg: "bg-destructive/5" },
  HIGH:     { label: "HIGH RISK",     color: "text-warning",     border: "border-warning/40",     bg: "bg-warning/5" },
  MEDIUM:   { label: "MEDIUM RISK",   color: "text-secondary",   border: "border-secondary/40",   bg: "bg-secondary/5" },
  LOW:      { label: "LOW RISK",      color: "text-success",     border: "border-success/40",     bg: "bg-success/5" },
} as const;

type Phase = "idle" | "scanning" | "structuring" | "done" | "error";

const SCAN_STEPS = [
  "Fetching bytecode…",
  "Analyzing storage layout…",
  "Checking ERC-7984 conformance…",
  "Scanning access control…",
  "Evaluating minting risks…",
  "Structuring findings…",
];


function cannedAuditForSymbol(symbol: string): AuditReport {
  const baseFindings: AuditFinding[] = [
    {
      severity: "Low",
      title: "Event indexing for analytics",
      detail:
        "Consider emitting a dedicated event for wrapper operations (wrap/reveal/transfer) to simplify off-chain accounting and compliance reporting.",
    },
    {
      severity: "Medium",
      title: "Allowance front‑running considerations",
      detail:
        "If approvals are frequently updated, consider using increase/decrease allowance patterns to reduce the risk of race conditions with ERC‑20 allowances.",
    },
    {
      severity: "High",
      title: "Admin / minter privileges must be documented",
      detail:
        "Ensure ownership/minter roles are clearly defined and constrained. For production, add explicit operational controls and incident procedures.",
    },
  ];

  // Add a small, deterministic per-asset “flavor” finding so different tokens look distinct.
  const perAsset: Record<string, AuditFinding> = {
    XAU: {
      severity: "Medium",
      title: "Oracle/price feed assumptions",
      detail:
        "Gold exposure often depends on external price assumptions. If any pricing is used for limits or risk, document feed sources and failure modes.",
    },
    XAG: {
      severity: "Low",
      title: "Rounding precision in UI flows",
      detail:
        "Silver positions can be smaller-denomination. Validate UI rounding and formatting do not cause misleading confirmations for small transfers.",
    },
    XPT: {
      severity: "Medium",
      title: "Supply constraints alignment",
      detail:
        "Platinum is typically lower-liquidity. If minting is capped, ensure limits are enforced consistently across minters and environments.",
    },
    DMND: {
      severity: "High",
      title: "Metadata integrity expectations",
      detail:
        "Diamond-like assets often rely on metadata proofs. If metadata is referenced, define immutability guarantees and verification boundaries.",
    },
    BRENT: {
      severity: "Medium",
      title: "Volatility stress testing",
      detail:
        "Oil exposure is volatile. If vault goals or risk limits depend on value, consider stress tests and conservative buffers for extreme moves.",
    },
    REE: {
      severity: "Medium",
      title: "Jurisdictional compliance notes",
      detail:
        "Strategic materials can have additional jurisdictional constraints. Provide a clear compliance disclaimer and KYC/AML pathway for production use.",
    },
  };

  const extra = perAsset[symbol.toUpperCase()];
  const findings = extra ? [extra, ...baseFindings] : baseFindings;

  return {
    findings,
    overall: findings.some(f => f.severity === "High") ? "HIGH" : "MEDIUM",
    summary:
      "Onboarding report (cached): review role controls, allowance patterns, and disclosure/audit procedures before production deployment.",
  };
}

export default function AuditModal({ asset, open, onClose }: Props) {
  const { tutorialStep, completeTutorialStep } = useTutorial();
  const [phase, setPhase] = useState<Phase>("idle");
  const [scanStep, setScanStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tutorialAudit = tutorialStep === 6;

  useEffect(() => {
    if (!open || !asset) {
      setPhase("idle");
      setReport(null);
      setError(null);
      setProgress(0);
      setScanStep(0);
      return;
    }

    setPhase("scanning");
    setProgress(0);
    setScanStep(0);

    // Tutorial mode: use cached, instant (no network) structured report.
    if (tutorialAudit) {
      const symbol = asset.symbol?.toUpperCase?.() ?? "RWA";
      let cache: Record<string, AuditReport> = {};
      try {
        cache = JSON.parse(localStorage.getItem(KEYS.tutorialAuditCache) ?? "{}") as Record<string, AuditReport>;
      } catch {
        cache = {};
      }
      const rep = cache[symbol] ?? cannedAuditForSymbol(symbol);
      if (!cache[symbol]) {
        cache[symbol] = rep;
        try {
          localStorage.setItem(KEYS.tutorialAuditCache, JSON.stringify(cache));
        } catch {
          // ignore storage issues
        }
      }

      // Tutorial mode: cached report, but keep a realistic short scan (≤ ~3s).
      // Mimic the real scan cadence: step-by-step progress + a brief structuring phase.
      const t0 = setTimeout(() => {
        setScanStep(0);
        setProgress(8);
      }, 0);
      const t1 = setTimeout(() => {
        setScanStep(1);
        setProgress(22);
      }, 550);
      const t2 = setTimeout(() => {
        setScanStep(2);
        setProgress(38);
      }, 1050);
      const t3 = setTimeout(() => {
        setScanStep(3);
        setProgress(56);
      }, 1550);
      const t4 = setTimeout(() => {
        setScanStep(4);
        setProgress(74);
      }, 2050);
      const t5 = setTimeout(() => {
        setPhase("structuring");
        setScanStep(SCAN_STEPS.length - 1);
        setProgress(92);
      }, 2450);
      const t6 = setTimeout(() => {
        setProgress(100);
        setReport(rep);
        setPhase("done");
      }, 2850);
      return () => {
        clearTimeout(t0);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
        clearTimeout(t6);
      };
    }

    // Animate progress bar while waiting for the API
    const stepInterval = setInterval(() => {
      setScanStep(s => Math.min(s + 1, SCAN_STEPS.length - 1));
    }, 2200);

    const progressInterval = setInterval(() => {
      setProgress(p => {
        // Slow down as we approach 90% — wait for real response
        if (p >= 88) return p + 0.3;
        return p + 1.8;
      });
    }, 120);

    analyzeContract(asset.name, asset.symbol, asset.underlyingAddress, asset.confidentialWrapperAddress)
      .then(r => {
        clearInterval(stepInterval);
        clearInterval(progressInterval);
        if (r.ok) {
          setProgress(100);
          setScanStep(SCAN_STEPS.length - 1);
          setReport(r.report);
          setTimeout(() => {
            setPhase("done");
          }, 400);
        } else {
          setError(r.error);
          setPhase("error");
        }
      })
      .catch(e => {
        clearInterval(stepInterval);
        clearInterval(progressInterval);
        setError(e instanceof Error ? e.message : "Audit failed");
        setPhase("error");
      });

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, [open, asset, onClose, tutorialAudit]);

  const counts = {
    Critical: report?.findings.filter(f => f.severity === "Critical").length ?? 0,
    High:     report?.findings.filter(f => f.severity === "High").length ?? 0,
    Medium:   report?.findings.filter(f => f.severity === "Medium").length ?? 0,
    Low:      report?.findings.filter(f => f.severity === "Low").length ?? 0,
  };

  const overall = report?.overall ?? "LOW";
  const overallMeta = OVERALL_META[overall] ?? OVERALL_META.LOW;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // During tutorial audit step, avoid accidental close while scanning.
        if (!o && tutorialAudit && phase !== "done" && phase !== "error") return;
        if (!o) onClose();
      }}
    >
      <DialogContent className="bg-surface border-border max-w-2xl p-0">
        <DialogHeader className="panel-header">
          <DialogTitle className="terminal-heading text-sm flex items-center gap-2">
            <Bug className="w-4 h-4 text-primary" /> SMART CONTRACT AUDIT — {asset?.symbol}
          </DialogTitle>
          <span className="terminal-label">ChainGPT Auditor · LLM-structured output</span>
        </DialogHeader>

        <div className="p-5 md:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="p-2.5 bg-background border border-border rounded-sm">
              <div className="terminal-label mb-1">Underlying ERC-20</div>
              <div className="text-primary break-all">{asset?.underlyingAddress}</div>
            </div>
            <div className="p-2.5 bg-background border border-border rounded-sm">
              <div className="terminal-label mb-1">ERC-7984 Wrapper</div>
              <div className="text-primary break-all">{asset?.confidentialWrapperAddress}</div>
            </div>
          </div>

          {/* Scanning phase */}
          {(phase === "scanning" || phase === "structuring") && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <div className="terminal-label">{SCAN_STEPS[scanStep]}</div>
              <div className="h-1 bg-background rounded-sm overflow-hidden max-w-sm mx-auto">
                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(progress, 99)}%` }} />
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                {Math.min(Math.floor(progress), 99)}% complete
              </div>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-sm text-sm text-destructive font-mono">
              {error}
            </div>
          )}

          {/* Done */}
          {phase === "done" && report && (
            <>
              {/* Severity counts */}
              <div className="grid grid-cols-4 gap-3">
                {(["Critical", "High", "Medium", "Low"] as const).map(s => (
                  <div key={s} className="panel p-3">
                    <div className="terminal-label">{s}</div>
                    <div className={`num text-2xl mt-1 ${SEVERITY_META[s].color}`}>
                      {counts[s].toString().padStart(2, "0")}
                    </div>
                  </div>
                ))}
              </div>

              {/* Overall risk banner */}
              <div className={`p-4 border rounded-sm flex items-center justify-between ${overallMeta.border} ${overallMeta.bg}`}>
                <div>
                  <div className="terminal-label">Overall Risk</div>
                  <div className={`text-lg font-display font-semibold tracking-[0.16em] mt-0.5 ${overallMeta.color}`}>
                    {overallMeta.label}
                  </div>
                  {report.summary && (
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">{report.summary}</p>
                  )}
                </div>
                <ShieldCheck className={`w-8 h-8 shrink-0 ${overallMeta.color}`} />
              </div>

              {/* Findings list */}
              {report.findings.length > 0 && (
                <div className="space-y-2">
                  <div className="terminal-label">Findings ({report.findings.length})</div>
                  {report.findings.map((f: AuditFinding, i: number) => {
                    const meta = SEVERITY_META[f.severity] ?? SEVERITY_META.Low;
                    const Icon = meta.icon;
                    return (
                      <div key={i} className={`panel p-3 border-l-2 ${meta.border} ${meta.bg}`}>
                        <div className="flex items-start gap-2">
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${meta.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`chip ${meta.color} ${meta.border}`}>{f.severity}</span>
                              <span className="text-sm font-medium">{f.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5 font-mono leading-relaxed">{f.detail}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Arbiscan link */}
              <a
                href={`https://sepolia.arbiscan.io/address/${asset?.underlyingAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-primary uppercase tracking-wider hover:underline"
              >
                View on Arbiscan <ExternalLink className="w-3 h-3" />
              </a>

              <div className="pt-2">
                {tutorialAudit ? (
                  <button
                    onClick={() => {
                      completeTutorialStep();
                      onClose();
                    }}
                    className="w-full py-3 bg-success text-background uppercase tracking-[0.18em] text-xs font-semibold rounded-sm hover:opacity-90 transition"
                  >
                    Continue tutorial
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-full py-3 border border-border uppercase tracking-[0.18em] text-xs font-semibold rounded-sm hover:border-primary hover:text-primary transition"
                  >
                    Close report
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
