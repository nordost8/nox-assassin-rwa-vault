import { describe, expect, it } from "vitest";
import { parseUnits } from "viem";
import { formatTokenAmount, shortAddress } from "../src/lib/format";

describe("format helpers", () => {
  it("formats token amounts with locale grouping", () => {
    expect(formatTokenAmount(parseUnits("1234.5", 6), 6)).toBe("1,234.5");
  });

  it("shortens addresses", () => {
    expect(shortAddress("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef")).toBe("0xdead…beef");
  });
});
