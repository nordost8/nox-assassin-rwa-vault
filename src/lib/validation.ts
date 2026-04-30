import { z } from "zod";
import { getAddress, isAddress } from "viem";
import { TARGET_CHAIN_ID } from "@/lib/chains";

export const evmAddressSchema = z
  .string()
  .trim()
  .min(1, "Address required")
  .refine((v) => isAddress(v), "Invalid EVM address")
  .transform((v) => getAddress(v));

export type EvmAddress = z.infer<typeof evmAddressSchema>;

const positiveDecimal = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Enter a positive decimal number")
  .refine((v) => Number(v) > 0, "Amount must be greater than zero");

export const amountSchema = positiveDecimal;

export const chainIdSchema = z.coerce.number().refine((id) => id === TARGET_CHAIN_ID, {
  message: `Expected Arbitrum Sepolia (chainId ${TARGET_CHAIN_ID})`,
});

export const shieldFormSchema = z.object({
  tokenId: z.string().min(1),
  amount: amountSchema,
});

export const transferFormSchema = z.object({
  tokenId: z.string().min(1),
  recipient: evmAddressSchema,
  amount: amountSchema,
});

