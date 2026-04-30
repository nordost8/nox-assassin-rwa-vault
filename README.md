# Nox Portfolio Shield

End-to-end confidential portfolio shielding dashboard for ERC-20 assets using iExec Nox Confidential Tokens (ERC-7984 wrappers).

**Primary network**: Arbitrum Sepolia (chainId `421614`).

## 🚀 LIVE DEMO

Try it here: **https://noxassassin.web3islands.com/**

## What it does

- **Connect** any EVM wallet (Injected, MetaMask, Rabby, Coinbase Wallet, WalletConnect/Reown).
- **Scan** real public ERC-20 balances for configured tokens (on-chain reads).
- **Shield**: `approve` underlying ERC-20 → `wrap` into confidential ERC-7984 wrapper.
- **Reveal**: decrypt your own confidential balance via Nox handle (encrypted by default).
- **Transfer confidential**: encrypt amount → call confidential transfer on the wrapper (amount stays private).
- **AI audit**: server-side ChainGPT audit of bundled demo contracts (API key never exposed to client).

This project is **not** an RWA issuance protocol and **does not** claim legal RWA backing.

## Setup

1) Install dependencies:

```bash
npm install
```

2) Configure env:

```bash
cp .env.example .env.local
```

Fill at least:
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` **or** `NEXT_PUBLIC_PROJECT_ID` (same value from [Reown Dashboard](https://dashboard.reown.com); see [AppKit installation](https://docs.reown.com/appkit/next/core/installation))
- `NEXT_PUBLIC_RPC_URL` (Arbitrum Sepolia RPC, e.g. `https://sepolia-rollup.arbitrum.io/rpc`)
- `CHAINGPT_API_KEY` (optional, only for AI audit)

3) Deploy demo contracts to Arbitrum Sepolia (requires Foundry `forge` + `cast`):

```bash
RPC_URL="..." PRIVATE_KEY="..." npm run deploy:demo
```

Copy printed addresses into `.env.local`:
- `NEXT_PUBLIC_DEMO_ASSET_ADDRESS`
- `NEXT_PUBLIC_DEMO_CONFIDENTIAL_WRAPPER_ADDRESS`
- `NEXT_PUBLIC_DEMO_FAUCET_ADDRESS`

4) Run the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Getting gas (Arbitrum Sepolia ETH)

You need a small amount of **Arbitrum Sepolia ETH** for gas to deploy and run E2E.

- **Chainlink faucet**: `https://faucets.chain.link/arbitrum-sepolia`
- **Arbitrum faucet**: `https://arbitrum.faucet.dev/ArbSepolia`
- **Alchemy Arbitrum Sepolia faucet**: `https://arbitrum-faucet.com/`

If one faucet is rate-limited, try another one above.

## CLI E2E demo (no UI)

1) Generate sender/recipient wallets for test:

```bash
npm run wallets:setup
```

This writes `.env.e2e.local` with fresh private keys (do not commit it).

2) Fund both addresses with Arbitrum Sepolia ETH (for gas) using any faucet link above.

3) Deploy demo contracts (requires Foundry):

```bash
RPC_URL="..." PRIVATE_KEY="..." npm run deploy:demo
```

Copy the printed addresses into `.env.e2e.local` as:
- `DEMO_ASSET_ADDRESS`
- `DEMO_CONFIDENTIAL_WRAPPER_ADDRESS`
- `DEMO_FAUCET_ADDRESS`

4) Run the end-to-end script:

```bash
RPC_URL="..." \
  SENDER_PRIVATE_KEY="0x..." \
  RECIPIENT_PRIVATE_KEY="0x..." \
  DEMO_ASSET_ADDRESS="0x..." \
  DEMO_CONFIDENTIAL_WRAPPER_ADDRESS="0x..." \
  DEMO_FAUCET_ADDRESS="0x..." \
  npm run e2e:demo
```

## Manual test plan (end-to-end)

- **Connect wallet** using WalletConnect or injected wallet.
- **Ensure network**: switch to Arbitrum Sepolia (UI shows switch CTA if wrong network).
- **Claim faucet** for `dASSET` (optional if faucet is deployed).
- **Scan balances**: see real `dASSET` ERC-20 balance.
- **Shield** a small amount:
  - `approve(wrapper, amount)` confirmed
  - `wrap(to, amount)` confirmed
  - public balance decreases after wrap
- **Reveal**: confidential balance shows **Encrypted** by default; click **Reveal** to decrypt (owner only).
- **Transfer confidential** to another address; connect as recipient and **Reveal** received balance.
- **AI audit**: run ChainGPT audit for `DemoAsset.sol`, `ConfidentialDemoAsset.sol`, `Faucet.sol` (server action).

## Notes

- The confidential balance is **not** stored in localStorage/sessionStorage; chain provides encrypted handles and only authorized wallets can decrypt.
- The token registry is **per-token wrapper address** (`src/lib/tokens.ts`); no universal router assumptions.
