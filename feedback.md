# Feedback

## Current status
- **E2E flow**: wallet connect (wagmi), Arbitrum Sepolia network guard, ERC-20 balance scan, approve → wrap (shield), reveal (decrypt), confidential transfer (encrypt + tx), ChainGPT audit (server action).

## What to improve next
- **UX**: show transaction hashes in the timeline and keep a dedicated activity log.
- **Token registry**: support multiple demo tokens/wrappers, logos, and sorting.
- **Safety**: add handling for specific revert reasons (faucet cooldown, not authorized decrypt).

## Testing notes
- Verify WalletConnect (QR) and injected wallets.
- Verify external observer mode: public balances should show; reveal/transfer/shield must be disabled.

