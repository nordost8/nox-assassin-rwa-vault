import { afterEach, describe, expect, it } from "vitest";
import { getFaucetAddress, getRwaTokens } from "../src/lib/tokens";

describe("tokens registry", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
    // Clear localStorage stub set by rwa-assets
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  it("returns empty list when no assets are selected", () => {
    // getSelectedAssets reads localStorage which is unavailable in Node — returns []
    const tokens = getRwaTokens();
    expect(tokens).toEqual([]);
  });

  it("returns faucet address when env is set", () => {
    const faucet = "0x3333333333333333333333333333333333333333";
    process.env.NEXT_PUBLIC_DEMO_FAUCET_ADDRESS = faucet;
    expect(getFaucetAddress()).not.toBeNull();
  });

  it("returns null faucet when env is missing", () => {
    delete process.env.NEXT_PUBLIC_DEMO_FAUCET_ADDRESS;
    expect(getFaucetAddress()).toBeNull();
  });

  it("ignores zero address faucet env", () => {
    process.env.NEXT_PUBLIC_DEMO_FAUCET_ADDRESS = "0x0000000000000000000000000000000000000000";
    expect(getFaucetAddress()).toBeNull();
  });
});
