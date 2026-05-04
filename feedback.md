# Feedback — iExec Nox / Confidential Tokens

Built on: Next.js 14, wagmi, viem, Arbitrum Sepolia. Six RWA wrappers + custom vault contract.

---

The handle model clicked quickly once I stopped thinking of the confidential balance as a number
and started treating it as an opaque reference. wrap/reveal/transfer all behaved as expected.
No surprises in the contract ABI — standard enough that plugging it into wagmi took an afternoon.

The best part is that you don't touch the underlying ERC-20 at all. Deploy a wrapper, point the
UI at it, done. We wrapped six different tokens (gold, silver, platinum, oil, diamond, rare earth)
with literally the same flow each time. That's the right design.

---

Things that slowed us down:

Reveal only works against the live TEE. There's no way to mock it locally. During a hackathon
where you're iterating fast, waiting for an enclave round-trip on every test loop is painful.
A local stub that just returns the handle value in plaintext for devnet would save hours.

Revert reasons from the confidential contracts are raw hex. When a user isn't authorized to
decrypt a handle, the UI gets back an unhelpful exception and you have to go dig through the
ABI yourself to figure out which custom error it maps to. A small error-reason helper in the SDK
would go a long way.

Confidential transfers emit no structured event. You know a transfer happened from the tx hash,
but building any kind of history or activity feed is blind. Even just a topic with sender +
recipient (no amount) would let block explorers and wallets surface something useful.

The docs cover the single-wrapper happy path well but go quiet on multi-asset setups.
We had to read the npm package source to confirm that each wrapper is independently registered
with no shared state — which is fine, just not documented anywhere obvious.

---

ChainGPT: solid for Solidity audits, useful for contract Q&A. Hit a 429 once under load,
no retry guidance in the docs. Would be nice to have a quota endpoint so the app can surface
remaining credits rather than failing silently.

---

Overall the protocol does what it says. The encrypted-handle approach is the right tradeoff
between privacy and composability and it shows. The rough edges are all tooling/DX, not core
protocol — which is a good place to be.
