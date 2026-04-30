import { NextResponse } from "next/server";
import { logEvent } from "@/lib/server-log";

type ClientLogLevel = "debug" | "info" | "warn" | "error";

type ClientLogEntry = {
  ts: string;
  level: ClientLogLevel;
  message: string;
  data?: unknown;
  context?: Record<string, unknown>;
};

type Payload = {
  clientId?: string;
  entries: ClientLogEntry[];
};

function clampString(s: unknown, max = 4000): string {
  if (typeof s !== "string") return "";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function safeEntry(e: ClientLogEntry): ClientLogEntry {
  return {
    ts: clampString(e.ts, 64) || new Date().toISOString(),
    level: (e.level === "debug" || e.level === "info" || e.level === "warn" || e.level === "error") ? e.level : "info",
    message: clampString(e.message, 4000),
    data: e.data,
    context: e.context && typeof e.context === "object" ? e.context : undefined,
  };
}

export async function POST(req: Request) {
  try {
    const json = (await req.json()) as Payload;
    const entries = Array.isArray(json?.entries) ? json.entries.slice(0, 100).map(safeEntry) : [];
    const clientId = clampString(json?.clientId, 80);

    if (entries.length === 0) {
      return NextResponse.json({ ok: false, error: "No entries" }, { status: 400 });
    }

    for (const entry of entries) {
      // Structured JSON (easy to collect from server logs)
      logEvent({ kind: "client-log", clientId, ...entry }, entry.level);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("client-log error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

