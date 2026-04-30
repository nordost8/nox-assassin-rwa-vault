#!/usr/bin/env node
/**
 * Node.js in-process timer: waits until 14:11 local time, then presses Enter via xdotool.
 * Requires: node, xdotool, and that this process stays running until the trigger.
 */
import { execFileSync } from "node:child_process";

const targetStr = process.argv[2] ?? "14:11";
const [hh, mm] = targetStr.split(":").map((x) => Number(x));
if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
  console.error(`Invalid time '${targetStr}'. Use HH:MM like 14:11.`);
  process.exit(1);
}

const now = new Date();
const target = new Date(now);
target.setHours(hh, mm, 0, 0);
if (target <= now) target.setDate(target.getDate() + 1); // next day if already passed

const ms = target.getTime() - now.getTime();
const display = process.env.DISPLAY ?? ":0";

console.log(`Scheduling in-process timer for ${target.toString()} (in ${(ms / 1000).toFixed(0)}s), DISPLAY=${display}`);

setTimeout(() => {
  try {
    execFileSync("/usr/bin/xdotool", ["key", "--clearmodifiers", "Return"], {
      env: { ...process.env, DISPLAY: display },
      stdio: "inherit",
    });
    console.log("Pressed Enter via xdotool.");
  } catch (e) {
    console.error("Failed to press Enter via xdotool.", e);
    process.exitCode = 1;
  }
}, ms);

