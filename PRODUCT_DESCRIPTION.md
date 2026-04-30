# Nox Assassin RWA Vault — Product specification (English)

## Overview
Nox Assassin RWA Vault is a web application for managing tokenized real‑world assets (RWAs) with **confidential balances** on-chain.
It is built on the **iExec Nox protocol** (ERC‑7984 confidential tokens) and deployed on **Arbitrum Sepolia** (chainId `421614`).

Core idea: any ERC‑20 position can be **shielded** into an ERC‑7984 wrapper. Once shielded, the balance becomes encrypted on-chain and is not visible to third‑party observers. The wallet owner can **reveal** their own confidential balance through iExec TEE-backed decryption.

## Architecture
- **Network**: Arbitrum Sepolia (chainId `421614`)
- **Privacy**: iExec Nox / ERC‑7984 confidential token wrappers
- **Per asset contract pair**:
  - Underlying public ERC‑20 token
  - ERC‑7984 wrapper contract (confidential ledger)
- **Decryption**: performed inside iExec TEE; plaintext is not persisted by the app
- **AI features**: ChainGPT (advisor + auditor) and an LLM structurer for audit output

## Supported assets (RWA-like demo universe)
The demo portfolio supports multiple tokenized assets grouped by categories (precious metals, energy, etc.):
- Gold (XAU)
- Silver (XAG)
- Platinum (XPT)
- Diamond (DMND)
- Oil (BRENT)
- Rare Earth elements (REE)

## User flow
### 1) Connect wallet
Users connect an EVM wallet (MetaMask, WalletConnect, Coinbase Wallet, etc.) and switch to Arbitrum Sepolia. Transactional actions are disabled on the wrong network.

### 2) Onboarding: select assets + mint demo tokens
On first entry, users select which assets they want in their portfolio. The selection is stored locally. After confirmation, the app mints demo balances for the selected assets via a server-side faucet action.

### 3) Portfolio view
The app scans the chain and shows, per asset:
- Public ERC‑20 balance (visible to everyone)
- Confidential status (not shielded / encrypted)

An optional observer mode allows scanning any address in read-only mode.

### 4) Shield
User approves the wrapper to spend ERC‑20, then wraps the selected amount into the ERC‑7984 wrapper. After success, the public balance decreases and the confidential ledger handle becomes non-zero.

### 5) Reveal
Only available if an encrypted handle exists. The app requests decryption via iExec handle client and displays plaintext to the owner.

### 6) Confidential transfer
The amount is encrypted in TEE, and the transfer is submitted to the wrapper. The encrypted amount stays private; only participants can decrypt their own balances.

### 7) Confidential Vaults (rooms)
Users can create a vault room with a name + goal. The public total is visible to everyone, while individual contributions are encrypted and only revealable by the contributor.

### 8) AI Advisor
Mentor chat provides compliance and portfolio-aware guidance. AI News shows a curated feed. API keys remain server-side.

### 9) Smart contract audit
Users can request an audit report per asset. The report is generated server-side and structured into a UI-friendly format.

## Security notes
- Secrets (faucet key, AI API keys) are server-side only.
- Confidential plaintext is not stored; it is displayed transiently after TEE-backed reveal.
- Faucet is rate-limited per `address:token`.
