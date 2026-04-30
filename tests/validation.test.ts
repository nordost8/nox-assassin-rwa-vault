import { describe, expect, it } from "vitest";
import { getAddress } from "viem";
import {
  amountSchema,
  chainIdSchema,
  evmAddressSchema,
  shieldFormSchema,
  transferFormSchema,
} from "../src/lib/validation";

describe("validation", () => {
  it("normalizes EVM addresses to checksummed form", () => {
    const input = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    expect(evmAddressSchema.parse(input)).toBe(getAddress(input));
  });

  it("rejects invalid EVM addresses", () => {
    expect(() => evmAddressSchema.parse("0x123")).toThrow();
  });

  it("accepts positive decimal amounts", () => {
    expect(amountSchema.parse("0.000001")).toBe("0.000001");
  });

  it("rejects non-positive amounts", () => {
    expect(() => amountSchema.parse("0")).toThrow();
    expect(() => amountSchema.parse("-1")).toThrow();
    expect(() => amountSchema.parse("abc")).toThrow();
  });

  it("validates Arbitrum Sepolia chain id", () => {
    expect(chainIdSchema.parse(421614)).toBe(421614);
    expect(() => chainIdSchema.parse(1)).toThrow();
  });

  it("parses shield/transfer forms", () => {
    expect(
      shieldFormSchema.parse({
        tokenId: "arb-sepolia-dasset",
        amount: "1.25",
      }),
    ).toEqual({ tokenId: "arb-sepolia-dasset", amount: "1.25" });

    const recipient = "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    expect(
      transferFormSchema.parse({
        tokenId: "arb-sepolia-dasset",
        recipient,
        amount: "1",
      }),
    ).toEqual({
      tokenId: "arb-sepolia-dasset",
      recipient: getAddress(recipient),
      amount: "1",
    });
  });

});
