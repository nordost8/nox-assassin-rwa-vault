"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { useTutorialOptional } from "@/components/TutorialProvider";
import { KEYS } from "@/lib/storage-keys";
import { getSelectedAssets } from "@/lib/rwa-assets";

type Level = "debug" | "info" | "warn" | "error";

type Entry = {
  ts: string;
  level: Level;
  message: string;
  data?: unknown;
  context?: Record<string, unknown>;
};

function safeToString(v: unknown): string {
  try {
    if (typeof v === "string") return v;
    if (v instanceof Error) return `${v.name}: ${v.message}\n${v.stack ?? ""}`.trim();
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function redact(s: string): string {
  // Best-effort: avoid leaking obvious secrets in logs
  return s.replace(/sk-[a-zA-Z0-9]{8,}/g, "sk-REDACTED").replace(/0x[a-fA-F0-9]{64}/g, "0xREDACTED");
}

export default function ClientLogBridge() {
  const pathname = usePathname();
  const { address, isConnected, chainId } = useAccount();
  const tutorial = useTutorialOptional();
  const tutorialActive = tutorial?.tutorialActive ?? false;
  const tutorialStep = tutorial?.tutorialStep ?? 0;
  const tutorialStepCompleted = tutorial?.tutorialStepCompleted ?? false;

  const clientId = useMemo(() => {
    if (typeof window === "undefined") return "server";
    const existing = window.localStorage.getItem(KEYS.clientId);
    if (existing) return existing;
    const v = (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`).slice(0, 80);
    window.localStorage.setItem(KEYS.clientId, v);
    return v;
  }, []);

  const clientIdRef = useRef(clientId);
  useEffect(() => { clientIdRef.current = clientId; }, [clientId]);

  const queueRef = useRef<Entry[]>([]);
  const flushingRef = useRef(false);
  const droppedRef = useRef(0);

  const baseContext = useMemo(() => {
    const faucetDone = typeof window !== "undefined" ? window.localStorage.getItem(KEYS.faucetDone) : null;
    const selected = typeof window !== "undefined" ? getSelectedAssets() : [];
    return {
      pathname,
      address,
      isConnected,
      chainId,
      tutorialActive,
      tutorialStep,
      tutorialStepCompleted,
      faucetDone,
      selectedAssets: selected,
      ua: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    } as Record<string, unknown>;
  }, [pathname, address, isConnected, chainId, tutorialActive, tutorialStep, tutorialStepCompleted]);

  const baseContextRef = useRef<Record<string, unknown>>(baseContext);
  useEffect(() => { baseContextRef.current = baseContext; }, [baseContext]);

  const enqueue = useCallback((level: Level, message: string, data?: unknown, context?: Record<string, unknown>) => {
    const entry: Entry = {
      ts: new Date().toISOString(),
      level,
      message: redact(message).slice(0, 4000),
      data,
      context: { ...baseContextRef.current, ...context },
    };
    queueRef.current.push(entry);
    if (queueRef.current.length > 200) {
      // Drop oldest to avoid runaway memory usage
      queueRef.current.splice(0, queueRef.current.length - 200);
      droppedRef.current++;
    }
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    if (queueRef.current.length === 0) return;
    flushingRef.current = true;
    const batch = queueRef.current.splice(0, 50);
    try {
      await fetch("/api/client-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientIdRef.current, entries: batch }),
        keepalive: true,
      });
    } catch {
      // Put the batch back (front) and retry later
      queueRef.current.unshift(...batch);
    } finally {
      flushingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial breadcrumb
    enqueue("info", "ClientLogBridge initialized");
    void flush();
  }, [enqueue, flush]);

  useEffect(() => {
    // Route changes breadcrumb
    enqueue("info", "Route change", undefined, { pathname });
    void flush();
  }, [pathname, enqueue, flush]);

  useEffect(() => {
    const timer = window.setInterval(() => void flush(), 2000);
    const onVis = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [flush]);

  useEffect(() => {
    const orig = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    const wrap = (level: Level, fn: (...args: unknown[]) => void) => (...args: unknown[]) => {
      try {
        const msg = args.map(safeToString).join(" ");
        enqueue(level, msg);
        void flush();
      } catch {}
      fn(...args);
    };

    console.log = wrap("info", orig.log);
    console.info = wrap("info", orig.info);
    console.warn = wrap("warn", orig.warn);
    console.error = wrap("error", orig.error);
    console.debug = wrap("debug", orig.debug);

    const onError = (event: ErrorEvent) => {
      enqueue("error", `window.onerror: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? safeToString(event.error) : undefined,
      });
      void flush();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      enqueue("error", "unhandledrejection", { reason: safeToString(event.reason) });
      void flush();
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      console.log = orig.log;
      console.info = orig.info;
      console.warn = orig.warn;
      console.error = orig.error;
      console.debug = orig.debug;
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [enqueue, flush]);

  // If we started dropping logs, emit a one-time warning server-side via the queue
  useEffect(() => {
    if (droppedRef.current <= 0) return;
    enqueue("warn", "Client log queue dropped entries", { dropped: droppedRef.current });
    droppedRef.current = 0;
    void flush();
  }, [pathname, enqueue, flush]);

  return null;
}

