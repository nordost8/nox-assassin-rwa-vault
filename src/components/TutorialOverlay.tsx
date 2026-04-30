"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X, ArrowRight, Check, Sparkles, Loader2 } from "lucide-react";
import { useTutorial } from "@/components/TutorialProvider";

interface StepDef {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  title: string;
  body: string;
  selector?: string | string[];
  cta: string;
  route: string;
  autoAdvance?: boolean;
}

const ROUTE_LABEL: Record<string, string> = {
  "/": "Portfolio",
  "/vaults": "Confidential Vaults",
  "/advisor": "AI Advisor",
};

const STEPS: StepDef[] = [
  { step: 1, title: "Your Portfolio", body: "Each asset has two balances — Public (visible to everyone) and Confidential (encrypted on-chain via ERC-7984). The shielded balance stays hidden until you choose to reveal it inside an iExec TEE.", route: "/", cta: "Got it — Continue" },
  { step: 2, title: "Shield your first asset", body: "Click the highlighted SHIELD button on the first asset. The guided flow will pre-fill a suggested amount — just confirm inside the popup.", selector: '[data-tutorial="tutorial-shield"]', route: "/", cta: "Waiting for SHIELD action…", autoAdvance: true },
  { step: 3, title: "Reveal your balance", body: "Click REVEAL on the same asset, then confirm inside the secure panel to decrypt your confidential balance through iExec's TEE.", selector: '[data-tutorial="tutorial-reveal"]', route: "/", cta: "Waiting for REVEAL action…", autoAdvance: true },
  { step: 4, title: "Explore Vaults", body: "Confidential vaults let multiple participants pool funds. The total raised is public, but individual contributions are encrypted. Click the highlighted NEW VAULT button to create one.", selector: '[data-tutorial="tutorial-create-vault"]', route: "/vaults", cta: "Waiting for vault action…", autoAdvance: true },
  { step: 5, title: "Ask the AI", body: "Click any Quick Prompt below the chat. The reply will appear above — take your time to read it. The tutorial will NOT skip ahead; you'll click Continue yourself.", selector: ['[data-tutorial="tutorial-chat-suggestions"]'], route: "/advisor", cta: "Pick a Quick Prompt to send…", autoAdvance: true },
  { step: 6, title: "Run a security audit", body: "Back in the Portfolio, click the highlighted AUDIT button. ChainGPT will analyze the contract bytecode + ABI and return a structured report with severity-ranked findings.", selector: '[data-tutorial="tutorial-audit"]', route: "/", cta: "Waiting for AUDIT action…", autoAdvance: true },
  { step: 7, title: "Read AI News", body: "Last stop — open the AI News feed inside the Mentor. Review the headlines, then click Continue to finish the guided flow.", selector: ['[data-tutorial="tutorial-news-tab"]', '[data-tutorial="tutorial-news-continue"]'], route: "/advisor", cta: "Open AI News, then Continue…", autoAdvance: true },
];

const STEP_DONE_BLURB: Record<number, string> = {
  2: "Your asset is now cloaked on-chain. Its public balance moved into the encrypted ERC-7984 ledger.",
  3: "The hood is lowered — your confidential balance is now visible to you (only you).",
  4: "You've joined a Shadow Vault. Your contribution is hidden; only the public total moves.",
  5: "The Mentor answered using your live portfolio context. You can keep chatting later — for now, one more step.",
  6: "Audit complete. ChainGPT returned a structured report with severity-ranked findings.",
  7: "AI News feed unlocked. RWA, privacy and regulation signals stream here live — also pinned as a ticker on your Portfolio.",
};

export default function TutorialOverlay() {
  const { tutorialActive, tutorialStep, tutorialStepCompleted, setTutorialStep, exitTutorial } = useTutorial();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const current = STEPS.find(s => s.step === tutorialStep);
  const onWrongRoute = !!current && pathname !== current.route && !tutorialStepCompleted;
  const softHighlight = current?.step === 5;

  // Prefetch tutorial routes so the first navigation is instant (esp. in dev).
  useEffect(() => {
    if (!mounted || !tutorialActive) return;
    // Prefetch the main tutorial routes + current step route.
    const routes = new Set<string>(["/", "/vaults", "/advisor"]);
    if (current?.route) routes.add(current.route);
    routes.forEach(r => { try { router.prefetch(r); } catch {} });
  }, [mounted, tutorialActive, current?.route, router]);

  // Reset click guard once route changes or step completes.
  useEffect(() => {
    if (!navigating) return;
    if (!onWrongRoute || tutorialStepCompleted) setNavigating(false);
  }, [navigating, onWrongRoute, tutorialStepCompleted]);

  useEffect(() => {
    if (!tutorialActive || !current?.selector || onWrongRoute || tutorialStepCompleted) {
      setRect(null);
      setDialogOpen(false);
      return;
    }

    const update = () => {
      const activeDialog = !!document.querySelector('[role="dialog"]');
      setDialogOpen(activeDialog);
      if (activeDialog) {
        document.querySelectorAll(".spotlight-target, .spotlight-soft").forEach(e => e.classList.remove("spotlight-target", "spotlight-soft"));
        setRect(null);
        return;
      }

      const selectors = Array.isArray(current.selector) ? current.selector : [current.selector!];
      const matched = selectors
        .flatMap(sel => Array.from(document.querySelectorAll(sel)) as HTMLElement[])
        .filter(node => {
          const box = node.getBoundingClientRect();
          const style = window.getComputedStyle(node);
          return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        });
      const el = matched[0] ?? null;
      const cls = softHighlight ? "spotlight-soft" : "spotlight-target";
      const otherCls = softHighlight ? "spotlight-target" : "spotlight-soft";

      document.querySelectorAll(`.${cls}`).forEach(e => { if (!matched.includes(e as HTMLElement)) e.classList.remove(cls); });
      document.querySelectorAll(`.${otherCls}`).forEach(e => e.classList.remove(otherCls));

      if (softHighlight) {
        matched.forEach(node => { if (!node.classList.contains(cls)) node.classList.add(cls); });
      } else if (el) {
        if (!el.classList.contains(cls)) el.classList.add(cls);
      }

      if (el) {
        const box = el.getBoundingClientRect();
        const offV = box.top < 80 || box.bottom > window.innerHeight - 200;
        const offH = box.left < 0 || box.right > window.innerWidth;
        if (offV || offH) {
          el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
        setRect(el.getBoundingClientRect());
      } else setRect(null);
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    const id = setInterval(update, 400);
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      observer.disconnect();
      clearInterval(id);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      document.querySelectorAll(".spotlight-target, .spotlight-soft").forEach(e => e.classList.remove("spotlight-target", "spotlight-soft"));
    };
  }, [tutorialActive, current, onWrongRoute, tutorialStepCompleted, softHighlight]);

  // Never render on server — avoids hydration mismatch
  if (!mounted) return null;

  if (!tutorialActive || !current) {
    if (tutorialStep === 8) return <CompletionScreen onClose={() => { setTutorialStep(0); router.push("/"); }} />;
    return null;
  }

  const advance = () => {
    if (current.step < 7) setTutorialStep((current.step + 1) as StepDef["step"]);
    else setTutorialStep(8);
  };

  const isNarrow = typeof window !== "undefined" && window.innerWidth < 768;
  const showCenteredCard = onWrongRoute || tutorialStepCompleted || (!rect && !dialogOpen);

  let cardStyle: React.CSSProperties;
  if (isNarrow) {
    if (rect && !showCenteredCard) {
      const targetCenterY = rect.top + rect.height / 2;
      const placeTop = targetCenterY > window.innerHeight / 2;
      cardStyle = placeTop
        ? { position: "fixed", top: 12, left: 12, right: 12, zIndex: 110, maxHeight: "45vh", overflowY: "auto" }
        : { position: "fixed", bottom: 12, left: 12, right: 12, zIndex: 110, maxHeight: "45vh", overflowY: "auto" };
    } else {
      cardStyle = { position: "fixed", top: "50%", left: 12, right: 12, transform: "translateY(-50%)", zIndex: 110, maxHeight: "calc(100vh - 24px)", overflowY: "auto" };
    }
  } else if (rect && !showCenteredCard) {
    const cardW = 420;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceBelow > 260;
    const wouldOverlap = rect.right + cardW + 32 > window.innerWidth && rect.left - cardW - 32 < 0;
    cardStyle = {
      position: "fixed",
      top: placeBelow || wouldOverlap
        ? Math.min(window.innerHeight - 280, rect.bottom + 16)
        : Math.max(16, rect.top - 260),
      left: rect.right + cardW + 32 <= window.innerWidth
        ? rect.right + 16
        : rect.left - cardW - 16 >= 16
          ? rect.left - cardW - 16
          : Math.max(16, Math.min(rect.left, window.innerWidth - cardW - 16)),
      width: cardW,
      zIndex: 110,
    };
  } else {
    cardStyle = { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 480, zIndex: 110 };
  }

  // Match frontend-donor UX: do NOT dim the whole app during spotlight steps.
  // Only dim on wrong route — let user see the vault/content after completing a step.
  const showDimmer = !dialogOpen && showCenteredCard && onWrongRoute;

  return (
    <>
      {showDimmer && <div className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm pointer-events-none" />}

      <button
        onClick={exitTutorial}
        className={`${dialogOpen ? "hidden" : "fixed flex"} top-4 right-6 z-[80] text-[10px] text-muted-foreground/60 hover:text-muted-foreground uppercase tracking-wider items-center gap-1`}
      >
        <X className="w-3 h-3" /> Exit guided mode
      </button>

      {!dialogOpen && (
        <div style={cardStyle} className={`panel-elevated bg-surface animate-fade-in pointer-events-auto ${tutorialStepCompleted ? "border-success/60" : "border-primary/40"}`}>
          <div className="px-5 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className={`terminal-label ${tutorialStepCompleted ? "text-success" : "text-primary"}`}>
                {tutorialStepCompleted ? `✓ Step ${current.step} of 7 complete` : `Guided Tutorial · Step ${current.step} of 7`}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{Math.round((current.step / 7) * 100)}%</span>
            </div>
            <div className="h-1 bg-background rounded-sm overflow-hidden mb-4">
              <div className={`h-full transition-all ${tutorialStepCompleted ? "bg-success" : "bg-primary"}`} style={{ width: `${(current.step / 7) * 100}%` }} />
            </div>
          </div>
          <div className="px-5 pb-5 space-y-3">
            {onWrongRoute && !tutorialStepCompleted && (
              <div className="text-[10px] uppercase tracking-[0.16em] text-secondary font-mono">
                Next stop → {ROUTE_LABEL[current.route] ?? current.route}
              </div>
            )}
            {tutorialStepCompleted ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-sm border border-success/60 bg-success/10 flex items-center justify-center">
                    <Check className="w-4 h-4 text-success" />
                  </div>
                  <h3 className="text-base font-display font-semibold tracking-wide">{current.title} · done</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{STEP_DONE_BLURB[current.step]}</p>
                {current.step < 7 && (
                  <p className="text-[11px] text-secondary font-mono">
                    Up next ({current.step + 1}/7): {STEPS[current.step].title} — in {ROUTE_LABEL[STEPS[current.step].route] ?? STEPS[current.step].route}.
                  </p>
                )}
              </>
            ) : (
              <>
                <h3 className="text-base font-display font-semibold tracking-wide">{current.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{current.body}</p>
              </>
            )}
            <div className="flex items-center justify-between pt-2 gap-3">
              <div className="flex gap-1">
                {STEPS.map(s => (
                  <span key={s.step} className={`w-1.5 h-1.5 rounded-full ${s.step < current.step || (s.step === current.step && tutorialStepCompleted) ? "bg-success" : s.step === current.step ? "bg-primary glow-primary" : "bg-border"}`} />
                ))}
              </div>
              {tutorialStepCompleted ? (
                <button onClick={advance} className="px-4 py-2 bg-success text-background uppercase tracking-[0.14em] text-[11px] font-semibold rounded-sm hover:opacity-90 transition flex items-center gap-2">
                  {current.step < 7 ? (
                    <>
                      {`Continue to step ${current.step + 1}`} <ArrowRight className="w-3 h-3" />
                    </>
                  ) : (
                    "Finish tutorial"
                  )}
                </button>
              ) : onWrongRoute ? (
                <button
                  onClick={() => {
                    if (navigating) return;
                    setNavigating(true);
                    // Defer push by one frame so React flushes the loading state first.
                    setTimeout(() => router.push(current.route), 0);
                  }}
                  disabled={navigating}
                  className="px-4 py-2 bg-primary text-primary-foreground uppercase tracking-[0.14em] text-[11px] font-semibold rounded-sm hover:bg-primary-glow transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {navigating
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Loading…</>
                    : <>{`Take me to ${ROUTE_LABEL[current.route] ?? current.route}`} <ArrowRight className="w-3 h-3" /></>}
                </button>
              ) : current.step === 1 ? (
                <button onClick={advance} className="px-4 py-2 bg-primary text-primary-foreground uppercase tracking-[0.14em] text-[11px] font-semibold rounded-sm hover:bg-primary-glow transition flex items-center gap-2">
                  {current.cta} <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-[10px] uppercase tracking-wider text-primary font-mono pulse-soft">{current.cta}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CompletionScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur-md flex items-center justify-center animate-fade-in">
      <div className="max-w-lg text-center px-6 space-y-6">
        <div className="w-16 h-16 mx-auto rounded-sm border border-primary/60 bg-primary/10 flex items-center justify-center glow-primary">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-display font-bold tracking-[0.08em] uppercase">You&apos;re ready.</h2>
          <p className="text-secondary mt-2 font-mono text-sm tracking-wider">Your assets are now private.</p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You&apos;ve concealed RWAs in the shadows, revealed them via TEE, joined a confidential vault, briefed the AI advisor and audited a contract — the full Nox Assassin RWA Vault creed.
        </p>
        <div className="panel p-3 text-left">
          <div className="terminal-label text-primary mb-1">Tip · AI News</div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            A live AI News feed (powered by ChainGPT) is pinned to the top of your Portfolio and available as a tab inside the Mentor / AI Advisor — RWA, privacy, regulation and market signals, refreshed every 15 min.
          </p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <button onClick={onClose} className="px-8 py-3 bg-primary text-primary-foreground uppercase tracking-[0.18em] text-xs font-semibold rounded-sm hover:bg-primary-glow transition flex items-center gap-2">
            <Check className="w-4 h-4" /> Enter Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}
