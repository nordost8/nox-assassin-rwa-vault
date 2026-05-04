# Feedback — iExec Nox

Wrapping ERC-20s into confidential tokens was easier than I expected. Deploy the wrapper, plug
the address into the UI, it just works. Did it six times for different RWA tokens and each time
was basically copy-paste. That's genuinely good API design.

One thing worth noting: when you call contribute() on the vault, the amount goes into the
calldata as a plain uint256 — visible to anyone watching the chain — even though the contract
immediately encrypts it into a Nox euint256 handle in storage. So the amount is private at
rest but not during the call itself. Not a dealbreaker for most use cases but worth knowing.

The reveal flow (TEE decrypt) took me a while to get right because locally there's nothing to
test against — you have to hit the live enclave every time. A local mock would help a lot
during development.

Error messages when something goes wrong on the contract side are hard to read. Raw hex reverts
with no description. Had to dig through the ABI manually to figure out what went wrong.

Docs are solid for the basic use case but thin once you go beyond a single token/wrapper.

ChainGPT was straightforward to wire up server-side. Response quality for contract questions
was good. No complaints there.

Overall — the core protocol works and the confidentiality guarantees are real. The rough
edges are mostly tooling, not the protocol itself.
