"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { usePublicClient } from "wagmi";
import { zeroHash } from "viem";
import { Bot, Send, Newspaper, ShieldCheck, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { askAdvisor } from "@/app/actions/chaingpt";
import { getRwaTokens } from "@/lib/tokens";
import { useTutorial } from "@/components/TutorialProvider";
import { KEYS } from "@/lib/storage-keys";
import { readErc20Balance } from "@/lib/erc20";
import { getConfidentialBalanceHandle } from "@/lib/nox";
import { formatTokenAmount } from "@/lib/format";
import { TARGET_CHAIN_ID } from "@/lib/chains";
import { NEWS } from "@/data/news";
import { Suspense } from "react";

const CHAT_STEPS = [
  "Connecting to ChainGPT",
  "Submitting prompt",
  "Awaiting AI reasoning",
  "Rendering response",
] as const;

const SUGGESTIONS = [
  "Is my portfolio compliant with MiCA?",
  "Should I shield more of my Gold position?",
  "What jurisdictions accept ERC-7984 confidential transfers?",
  "Recommend a vault diversification strategy.",
];

function AdvisorInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { tutorialStep, completeTutorialStep, setTutorialStep } = useTutorial();
  const tab = (params.get("tab") === "news" ? "news" : "chat") as "chat" | "news";

  const switchTab = (t: "chat" | "news") => {
    const next = new URLSearchParams(params.toString());
    if (t === "news") {
      next.set("tab", "news");
    } else {
      next.delete("tab");
    }
    router.replace(`/advisor?${next.toString()}`);
  };

  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });

  const [portfolioCtx, setPortfolioCtx] = useState("");

  useEffect(() => {
    if (!address || !publicClient) return;
    const tokens = getRwaTokens();
    if (tokens.length === 0) return;
    Promise.all(
      tokens.map(async t => {
        const pub = await readErc20Balance(publicClient, t.underlyingAddress, address);
        const h = await getConfidentialBalanceHandle(publicClient, t.confidentialWrapperAddress, address);
        return `• ${t.name} (${t.symbol}): public=${formatTokenAmount(pub, t.decimals)}, confidential=${h !== zeroHash ? "shielded" : "not shielded"}`;
      })
    ).then(lines => {
      setPortfolioCtx(`Wallet: ${address}\nNetwork: Arbitrum Sepolia (ERC-7984)\n${lines.join("\n")}`);
    }).catch(() => {});
  }, [address, publicClient]);

  return (
    <div className="max-w-[1480px] mx-auto px-3 md:px-6 py-5 md:py-8 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="terminal-heading text-base md:text-lg flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary flex-shrink-0" />
            <span>Mentor · AI Advisor</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Portfolio-aware compliance & market intelligence — your counsel in the shadows. Powered by ChainGPT.</p>
        </div>
        <div className="flex border border-border rounded-sm w-full md:w-auto">
          <TabBtn active={tab === "chat"} onClick={() => switchTab("chat")} className="flex-1 md:flex-none">Compliance Advisor</TabBtn>
          <TabBtn active={tab === "news"} onClick={() => switchTab("news")} className="flex-1 md:flex-none" tutorialId="tutorial-news-tab">AI News</TabBtn>
        </div>
      </div>

      {tab === "chat"
        ? <ChatPanel portfolioCtx={portfolioCtx} tutorialStep={tutorialStep} onTutorialComplete={() => setTutorialStep(6)} />
        : <NewsPanel tutorialStep={tutorialStep} onTutorialComplete={completeTutorialStep} />}
    </div>
  );
}

export default function AdvisorPage() {
  return (
    <Suspense>
      <AdvisorInner />
    </Suspense>
  );
}

function TabBtn({ active, onClick, children, className = "", tutorialId }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string; tutorialId?: string }) {
  return (
    <button onClick={onClick} data-tutorial={tutorialId} className={`px-3 md:px-4 py-2 text-[10px] md:text-[11px] uppercase tracking-[0.12em] md:tracking-[0.14em] font-semibold transition whitespace-nowrap ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"} ${className}`}>
      {children}
    </button>
  );
}

interface Msg { role: "user" | "assistant"; content: string; }

function ChatPanel({ portfolioCtx, tutorialStep, onTutorialComplete }: { portfolioCtx: string; tutorialStep: number; onTutorialComplete: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "I have access to your live portfolio context (public + shielded positions). Ask me anything — compliance, jurisdictional risk, allocation strategy, or audit interpretation." },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [thinkingStageIdx, setThinkingStageIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Msg[]>(messages);
  const [readyToContinue, setReadyToContinue] = useState(false);

  const tutorialMode = tutorialStep === 5;
  const cacheRef = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    // If user leaves/re-enters step 5, require an explicit continue again.
    setReadyToContinue(false);
  }, [tutorialStep]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const getTutorialAnswer = useCallback((question: string): string => {
    if (!cacheRef.current) {
      try {
        cacheRef.current = JSON.parse(localStorage.getItem(KEYS.tutorialAiCache) ?? "{}") as Record<string, string>;
      } catch {
        cacheRef.current = {};
      }
    }
    const cached = cacheRef.current[question];
    if (cached) return cached;

    const canned: Record<string, string> = {
      "Is my portfolio compliant with MiCA?":
        "High-level: yes for a starter portfolio — with caveats.\n\n• MiCA focuses on issuer + CASP obligations. Holding tokenized RWAs privately is generally compatible as long as the issuer/CASP can produce an auditable cap-table when required.\n• Your shielded leg is still attestable via TEE-based reveal (selective disclosure), which helps with auditability.\n\nIf you tell me your jurisdiction + whether you’re a retail or institutional user, I can outline the likely reporting obligations.",
      "Should I shield more of my Gold position?":
        "If your main goal is counterparty/privacy (e.g. OTC negotiations), shielding more of Gold is a good first move.\n\nSuggested split:\n• 60–80% shielded for privacy\n• 20–40% public for faster settlement + on-chain composability\n\nRule of thumb: keep a public leg large enough to cover near-term transfers without waiting for a reveal.",
      "What jurisdictions accept ERC-7984 confidential transfers?":
        "No jurisdiction ‘accepts ERC-7984’ directly — regulators care about disclosure, audits, and AML controls.\n\nPractical view:\n• EU/UK: selective disclosure + auditability are key; confidential balances can be okay if your CASP/issuer can prove ownership when required.\n• US: focus is on broker-dealer / MSB / sanctions screening for transfers.\n\nIf you share your target market, I’ll list the compliance checkpoints most teams implement.",
      "Recommend a vault diversification strategy.":
        "A simple, onboarding-friendly diversification template:\n\n• 40% Precious metals (Gold/Silver)\n• 25% Energy (Oil)\n• 20% Strategic materials (Rare Earth)\n• 15% Luxury assets (Diamond)\n\nOperationally:\n• Keep the vault total public (transparency)\n• Keep individual contributions shielded (privacy)\n• Rebalance quarterly and cap any single asset at 45% to avoid concentration.\n\nWant a ‘conservative vs aggressive’ variant?",
    };

    const answer = canned[question] ?? (
      "For the guided tutorial, I’m using a fast cached advisor response.\n\nAsk again after onboarding for a full portfolio-aware answer with live context."
    );

    cacheRef.current[question] = answer;
    try {
      localStorage.setItem(KEYS.tutorialAiCache, JSON.stringify(cacheRef.current));
    } catch {
      // ignore storage quota / private mode
    }
    return answer;
  }, []);

  const send = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean || thinking) return;

    const next: Msg[] = [...messagesRef.current, { role: "user", content: clean }];
    setMessages(next);
    setInput("");
    setThinkingStageIdx(0);
    setThinking(true);
    if (tutorialMode) setReadyToContinue(false);
    try {
      if (tutorialMode) {
        setThinkingStageIdx(1);
        await new Promise(r => setTimeout(r, 200));
        setThinkingStageIdx(2);
        const answer = getTutorialAnswer(clean);
        await new Promise(r => setTimeout(r, 300));
        setThinkingStageIdx(3);
        setMessages([...next, { role: "assistant", content: answer }]);
        setReadyToContinue(true);
        return;
      }

      // Fire the AI call immediately, then advance the UI independently.
      const askPromise = askAdvisor(portfolioCtx, clean);
      setThinkingStageIdx(1);
      await new Promise(r => setTimeout(r, 800));
      setThinkingStageIdx(2);
      const result = await askPromise;
      setThinkingStageIdx(3);
      await new Promise(r => setTimeout(r, 150));
      setMessages([...next, { role: "assistant", content: result.ok ? result.answer : `Error: ${result.error}` }]);
    } catch {
      if (tutorialMode) {
        const answer = getTutorialAnswer(clean);
        setMessages([...next, { role: "assistant", content: answer }]);
        setReadyToContinue(true);
      } else {
        setMessages([...next, { role: "assistant", content: "I couldn't reach the advisor. Please try again." }]);
      }
    } finally {
      setThinking(false);
    }
  }, [portfolioCtx, thinking, tutorialMode, getTutorialAnswer]);

  return (
    <div className="grid md:grid-cols-[1fr_280px] gap-4">
      <div className="panel-elevated flex flex-col h-[70vh] min-h-[420px] md:h-[600px]">
        <div className="panel-header">
          <span className="terminal-heading text-xs flex items-center gap-2">
            <span className="status-dot bg-success pulse-soft" /> ChainGPT · Compliance Module
          </span>
          <span className="terminal-label">Context: live portfolio</span>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-mono shrink-0 ${m.role === "user" ? "bg-secondary/20 text-secondary border border-secondary/40" : "bg-primary/15 text-primary border border-primary/40"}`}>
                {m.role === "user" ? "YOU" : "CG"}
              </div>
              <div className={`max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-secondary/10 border border-secondary/30" : "bg-background border border-border"} rounded-sm p-3`}>
                {m.role === "assistant" ? (
                  <ReactMarkdown
                    skipHtml
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      ul: ({ children }) => <ul className="my-2 pl-5 list-disc space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="my-2 pl-5 list-decimal space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-2 hover:text-primary-glow transition"
                        >
                          {children}
                        </a>
                      ),
                      code: ({ children }) => (
                        <code className="px-1 py-0.5 rounded-sm bg-surface/60 border border-border font-mono text-[12px]">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="my-2 p-3 rounded-sm bg-surface/60 border border-border overflow-x-auto font-mono text-[12px] leading-relaxed">
                          {children}
                        </pre>
                      ),
                      h1: ({ children }) => <h2 className="mt-2 mb-2 text-base font-semibold">{children}</h2>,
                      h2: ({ children }) => <h3 className="mt-2 mb-2 text-sm font-semibold">{children}</h3>,
                      h3: ({ children }) => <h4 className="mt-2 mb-2 text-sm font-semibold text-muted-foreground">{children}</h4>,
                      hr: () => <hr className="my-3 border-border" />,
                      blockquote: ({ children }) => (
                        <blockquote className="my-2 pl-3 border-l-2 border-primary/40 text-muted-foreground">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                ) : (
                  <span className="whitespace-pre-wrap">{m.content}</span>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-sm bg-primary/15 border border-primary/40 flex items-center justify-center text-[10px] font-mono text-primary shrink-0">CG</div>
              <div className="bg-background border border-border rounded-sm p-3 space-y-2">
                <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                  ChainGPT · high-quality financial AI — first replies may take up to 20s
                </p>
                <div className="space-y-1.5">
                  {CHAT_STEPS.map((step, i) => {
                    const done   = i < thinkingStageIdx;
                    const active = i === thinkingStageIdx;
                    return (
                      <div key={i} className={`flex items-center gap-2 text-[11px] font-mono transition-colors ${done ? "text-muted-foreground/50" : active ? "text-primary" : "text-muted-foreground/30"}`}>
                        {done
                          ? <span className="text-success text-[10px] w-3 shrink-0">✓</span>
                          : active
                            ? <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                            : <span className="w-2 h-2 rounded-full border border-border/60 shrink-0" />}
                        {step}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-border p-3 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && void send(input)}
            placeholder="Ask about compliance, risk, allocation…"
            className="flex-1 bg-background border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
          <button onClick={() => void send(input)} className="px-4 bg-primary text-primary-foreground rounded-sm hover:bg-primary-glow transition flex items-center gap-2">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        {tutorialMode && readyToContinue && (
          <div className="border-t border-primary/30 bg-primary/5 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="terminal-label text-primary">
                Read the reply, then continue the tutorial.
              </div>
              <button
                onClick={onTutorialComplete}
                className="px-4 py-2 bg-success text-background uppercase tracking-[0.14em] text-[11px] font-semibold rounded-sm hover:opacity-90 transition"
              >
                Continue tutorial
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="panel p-4">
          <div className="terminal-label mb-3">Suggestions</div>
          <div className="space-y-1.5">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => void send(s)} data-tutorial="tutorial-chat-suggestions" className="w-full text-left text-xs p-2.5 border border-border rounded-sm hover:border-primary hover:bg-primary/5 transition">
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="panel p-4">
          <div className="terminal-label mb-2 flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Privacy</div>
          <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">All chats are stateless. Portfolio context is submitted per request and never persisted by ChainGPT.</p>
        </div>
      </div>
    </div>
  );
}

function NewsPanel({ tutorialStep, onTutorialComplete }: { tutorialStep: number; onTutorialComplete: () => void }) {
  const tutorialMode = tutorialStep === 7;
  const [items, setItems] = useState(NEWS);

  useEffect(() => {
    if (!tutorialMode) return;
    try {
      const cached = JSON.parse(localStorage.getItem(KEYS.tutorialNewsCache) ?? "null") as typeof NEWS | null;
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setItems(cached);
      } else {
        localStorage.setItem(KEYS.tutorialNewsCache, JSON.stringify(NEWS));
        setItems(NEWS);
      }
    } catch {
      setItems(NEWS);
    }
  }, [tutorialMode]);

  return (
    <div className="grid md:grid-cols-2 gap-4 pb-16 md:pb-0">
      {items.map((n, i) => (
        <article key={i} className="panel-elevated p-5 hover:border-primary/40 transition cursor-pointer group">
          <div className="flex items-center gap-2 mb-3">
            <span className="chip text-primary border-primary/40 bg-primary/5">{n.tag}</span>
            <span className="terminal-label">{n.source}</span>
            <span className="terminal-label ml-auto">{n.time}</span>
          </div>
          <h3 className="text-sm font-display font-semibold leading-snug group-hover:text-primary transition">{n.title}</h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{n.body}</p>
          <div className="flex items-center gap-1 mt-3 text-[10px] text-primary uppercase tracking-wider">
            Read full report <ExternalLink className="w-3 h-3" />
          </div>
        </article>
      ))}
      <div className="md:col-span-2 panel p-4 flex items-center gap-3">
        <Newspaper className="w-4 h-4 text-secondary" />
        <span className="text-xs text-muted-foreground font-mono">
          {tutorialMode
            ? "Onboarding mode: cached AI News (instant)."
            : "Feed refreshes via ChainGPT News API. Static fallback shown when API key is not configured."}
        </span>
      </div>

      {tutorialMode && (
        <div className="fixed left-3 right-3 bottom-3 z-[65] md:static md:col-span-2 md:z-auto">
          <div className="panel-elevated border-success/40 bg-surface/95 backdrop-blur-md p-3 md:p-0 md:border-0 md:bg-transparent md:backdrop-blur-0">
            <button
              data-tutorial="tutorial-news-continue"
              onClick={onTutorialComplete}
              className="w-full py-3 bg-success text-background uppercase tracking-[0.18em] text-xs font-semibold rounded-sm hover:opacity-90 transition"
            >
              Continue tutorial
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
