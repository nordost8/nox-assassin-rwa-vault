# Nox Portfolio Shield (Confidential RWA Portfolio)

Nox Portfolio Shield is a privacy-first RWA portfolio dApp on **Arbitrum Sepolia** powered by **iExec Nox Confidential Tokens** (ERC-7984 wrappers).

It lets users take tokenized commodities like Gold, Oil, Silver, Platinum, Diamond, and Rare Earth and **shield** them into confidential equivalents. Once shielded, **balances and transfer amounts are encrypted on-chain**. Only the wallet owner can **reveal** their own balance using TEE-backed decryption.

## Why this matters
On-chain transparency makes portfolio holdings, transfers, and strategies easy to track. For RWA and institutional DeFi, that is often a non-starter.

Nox Portfolio Shield brings practical confidentiality to RWAs while keeping the experience familiar for any EVM wallet.

## What you can do in the app
- Connect an EVM wallet (Injected / MetaMask / Rabby / Coinbase Wallet / WalletConnect).
- Pick “wow” RWA assets during onboarding and get tokens via a faucet.
- Scan real on-chain ERC-20 balances for the configured tokens.
- Shield assets with two clicks: `approve`, then `wrap`.
- Reveal your confidential balance (owner-only).
- Send confidential transfers where the amount stays private.
- Create **Vault Rooms**: set a shared goal with a public total, while each contribution stays confidential (contributors can reveal their own amounts). Each room has a shareable link, so you can invite others in seconds.
- Use **ChainGPT** in-app for portfolio guidance and a clear security report of the contracts you interact with.
- Read **AI News**: a curated feed of RWA and DeFi updates, tailored for builders and users.

## Tech highlights
- **Privacy layer**: iExec Nox, ERC-7984 confidential token wrappers
- **Network**: Arbitrum Sepolia
- **AI layer**: ChainGPT for portfolio guidance and contract risk insights
- **AI-friendly engineering**: a clean, modular, strongly-typed codebase with explicit configs and reusable flows. It’s easy for builders (and AI coding copilots) to navigate, review, and ship safe changes fast.

## Live app
- App: `https://noxassassin.web3islands.com/`

## Deployed contracts (Arbitrum Sepolia)
- Vault: `0x2794a3335c63FCB6eD2B8A9975fDe2aa95eb0DeA`
- ERC-20 asset token: `0x464bbFeaB3e286096196380fadd87346cC50061c`
- ERC-7984 wrapper: `0x93D0738D209eD1353dF624cb4B024b38a198DF32`
- Faucet: `0x54Da3FF77e45E034F3eE4050cc0dD2F088715490`

RWA tokens (asset → confidential wrapper):
- Gold: `0x828a6D3E4D28E0670E6DAa673464678dF45CF675` → `0x1e72d243fc5aa66B80183fc68540564D64be4995`
- Platinum: `0x537f6252e0c654EA672832a66625b5C236B32DFC` → `0xa5c8E10cf426077E0E1fF3bc2b80E43218FAac6e`
- Oil: `0xFCc67C73F20dBA53270363e7022f3fD8267A8FbF` → `0xA5e77753fd9d2A960817FcF73070c588049BBCc4`
- Diamond: `0x415eA68539aA1162d6a2729bdd188358f54395C9` → `0x07D1505bDBDF1b65cF6ea5ce76ee471cA05f3C60`
- Silver: `0x0776B63C6D3ED084937F37ce051982Ba7ea1196f` → `0x2c4D441f8616073dfE111e56313016aB5A74d91D`
- Rare Earth: `0x1e8f9C07bE22CE9C0723ba2f7bFa1aBe0DbB923E` → `0x589D860F91F65D6Ac6504253b5d128C9cAf94d60`

## Quick test flow (for judges)
1. Connect wallet and switch to **Arbitrum Sepolia**.
2. Select at least 1 RWA asset in onboarding.
3. Get tokens from the faucet.
4. Scan balances and pick an asset.
5. Shield a small amount (approve, then wrap).
6. Click Reveal to show your confidential balance.
7. Send a confidential transfer to another address, then Reveal as the recipient.
8. Create a Vault Room and make a confidential contribution, then Reveal your contribution (as the contributor).

## Getting gas (Arbitrum Sepolia ETH)
You need a small amount of Arbitrum Sepolia ETH for gas. If you only have Sepolia ETH, bridge it to Arbitrum Sepolia.

- Sepolia faucet: `https://cloud.google.com/application/web3/faucet/ethereum/sepolia`
- Bridge: `https://portal.arbitrum.io/bridge?destinationChain=arbitrum-sepolia&sanitized=true&sourceChain=sepolia`

