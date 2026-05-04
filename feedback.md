# Developer Feedback — iExec Nox Protocol & Confidential Tokens

Feedback from building **Nox Assassin RWA Vault** during the iExec Vibe Coding Challenge 2026.
Stack: Next.js 14 · wagmi v3 · viem · Arbitrum Sepolia · ERC-7984 Confidential Tokens.

---

## What worked really well

### Confidential Token (ERC-7984) core API
The shield/reveal/transfer pattern is clean and intuitive once you understand the handle model.
`wrap`, `unwrap`, `transfer` and the reveal-via-TEE flow all behaved exactly as documented.
No unexpected reverts during the happy path after correct allowance handling.

### Composability with standard ERC-20
The wrapper-over-any-ERC-20 design is the killer feature.
We wrapped six custom RWA tokens (Gold, Silver, Platinum, Oil, Diamond, Rare Earth) with zero
changes to the underlying contracts — just deploy the wrapper and point the UI at it.
This made the RWA demo feel genuinely realistic rather than toy-ish.

### Allowance pattern is explicit and correct
Requiring `approve` before `wrap` follows standard ERC-20 conventions perfectly.
No hidden approval magic — every step is a visible on-chain transaction, which is exactly
what institutional users need for auditability.

### Arbitrum Sepolia deployment
Fast finality and low gas made iteration very quick during development.
The public RPC (`https://sepolia-rollup.arbitrum.io/rpc`) was stable throughout the hackathon.

---

## Pain points & suggestions

### 1. Reveal requires a live TEE call — hard to test offline / in CI

**Problem**: The reveal (decrypt) flow requires the iExec TEE enclave to be reachable.
During development, any network hiccup or enclave queue delay made it impossible to test
the reveal step without a real internet connection and a funded wallet.

**Suggestion**: Provide a local mock TEE or a devnet mode where `reveal()` returns a
deterministic plaintext so developers can unit-test the full flow without hitting the live enclave.

### 2. Error messages from the Nox SDK are low-level

**Problem**: When something goes wrong (wrong network, handle mismatch, not authorized),
the error surfaces as a raw EVM revert or a vague SDK exception.
We had to manually map revert strings to user-facing messages.

**Suggestion**: Add a typed error enum or well-documented revert reason strings so apps can
show meaningful messages without parsing raw hex data.

### 3. No event / log for confidential transfers

**Problem**: Because amounts are encrypted, there is no practical way to build a
transaction history view for confidential transfers.
The public observer sees a transaction but no amount.

**Suggestion**: Consider an optional structured event (e.g. `ConfidentialTransferEmitted`)
that at least exposes sender, recipient, timestamp and an encrypted payload so wallets and
block explorers can show *that* a transfer happened (even without the amount).

### 4. Documentation gaps for multi-token setups

**Problem**: The docs cover the single-token demo well, but deploying multiple
wrappers (our six RWA tokens) required reading the source code directly to understand
how to register each wrapper independently.

**Suggestion**: Add a multi-token / multi-wrapper quickstart guide with an example
environment variable layout.

### 5. Faucet cooldown revert not documented

**Problem**: The demo faucet reverts with a cooldown message but the revert reason
format is not listed anywhere in the docs.
We caught this in production only after users started hitting it.

**Suggestion**: Document all known faucet revert strings and add them to the SDK error type.

---

## ChainGPT integration feedback

- The REST API was straightforward to call server-side (Next.js server action).
- Response quality for Solidity audit prompts was high — correctly flagged the
  `transfer` vs `transferFrom` distinction in the faucet contract.
- Rate limiting was not clearly documented; we hit a 429 during load testing and had to
  add retry logic ourselves.
- **Suggestion**: expose a `/quota` endpoint so apps can show remaining credits in the UI.

---

## Overall assessment

The iExec Nox stack delivers on its core promise: **any ERC-20 can become confidential
with minimal integration work**. The hardest part of the hackathon was not the Nox API itself
but the surrounding developer experience — local testing without TEE, error observability,
and multi-asset setup documentation.

With improved local dev tooling and richer error surfaces, Nox would be significantly easier
to adopt for production RWA and institutional DeFi applications.

**Would we build on Nox again? Yes.**
The confidentiality guarantees are real, the composability is excellent, and the Arbitrum
deployment is fast and cheap enough for real user testing.
