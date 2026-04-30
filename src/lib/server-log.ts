import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Server-side structured logger.
 * - Always logs JSON to stdout (best for Docker/K8s/etc).
 * - Optionally mirrors the same JSON line into a file when NOX_LOG_FILE is set.
 */
export function logEvent(payload: Record<string, unknown>, level: LogLevel = "info") {
  const line = JSON.stringify({ level, ...payload });
  // stdout: canonical log sink for prod
  console.log(line);

  const file = process.env.NOX_LOG_FILE?.trim();
  if (!file) return;
  try {
    mkdirSync(dirname(file), { recursive: true });
    appendFileSync(file, `${line}\n`, { encoding: "utf8" });
  } catch {
    // If file logging fails (read-only fs, permissions, etc), stdout still has everything.
  }
}

