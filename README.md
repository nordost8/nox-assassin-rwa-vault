# Nox Portfolio Shield

End-to-end confidential portfolio shielding dashboard for ERC-20 assets using iExec Nox Confidential Tokens (ERC-7984 wrappers).

**Primary network**: Arbitrum Sepolia (chainId `421614`).

## Deployed contracts (Arbitrum Sepolia)

These are the **live addresses used in the demo video**.

- **Vault contract**: `0x2794a3335c63FCB6eD2B8A9975fDe2aa95eb0DeA`
- **Demo ERC-20 asset** (`dASSET`): `0x464bbFeaB3e286096196380fadd87346cC50061c`
- **Demo Confidential wrapper** (ERC-7984): `0x93D0738D209eD1353dF624cb4B024b38a198DF32`
- **Demo Faucet**: `0x54Da3FF77e45E034F3eE4050cc0dD2F088715490`

### RWA demo tokens (asset → confidential wrapper)

- **Gold**: `0x828a6D3E4D28E0670E6DAa673464678dF45CF675` → `0x1e72d243fc5aa66B80183fc68540564D64be4995`
- **Platinum**: `0x537f6252e0c654EA672832a66625b5C236B32DFC` → `0xa5c8E10cf426077E0E1fF3bc2b80E43218FAac6e`
- **Oil**: `0xFCc67C73F20dBA53270363e7022f3fD8267A8FbF` → `0xA5e77753fd9d2A960817FcF73070c588049BBCc4`
- **Diamond**: `0x415eA68539aA1162d6a2729bdd188358f54395C9` → `0x07D1505bDBDF1b65cF6ea5ce76ee471cA05f3C60`
- **Silver**: `0x0776B63C6D3ED084937F37ce051982Ba7ea1196f` → `0x2c4D441f8616073dfE111e56313016aB5A74d91D`
- **Rare Earth**: `0x1e8f9C07bE22CE9C0723ba2f7bFa1aBe0DbB923E` → `0x589D860F91F65D6Ac6504253b5d128C9cAf94d60`

## 🚀 LIVE DEMO

Try it here: **https://noxassassin.web3islands.com/**

## What it does

- **Connect** any EVM wallet (Injected, MetaMask, Rabby, Coinbase Wallet, WalletConnect/Reown).
- **Guided onboarding**: a step-by-step tutorial walks new users through every action — faucet claim, shield, reveal, vault — so judges and first-time visitors can experience the full flow in under 2 minutes.
- **Scan** real public ERC-20 balances for configured tokens (on-chain reads).
- **Shield**: `approve` underlying ERC-20 → `wrap` into confidential ERC-7984 wrapper. Public balance decreases; shielded balance becomes an encrypted handle.
- **Reveal**: decrypt your own confidential balance via Nox handle (TEE-verified — no one else can read it).
- **Transfer confidential**: encrypt amount → call confidential transfer on the wrapper (amount stays private on-chain).
- **Shadow Vaults** (`/vaults`): create named institutional pool rooms with a funding goal and RWA token. Contributors deposit confidentially — the pool's running total is public, but each member's contribution amount is encrypted. No member can see another's stake. Built on the same Nox ERC-7984 stack with a custom vault contract.
- **AI Advisor & News** (`/advisor`): two tabs — a ChainGPT-powered chat for RWA/DeFi questions and a curated RWA/DeFi news feed. A news ticker also runs on the portfolio page. API key stays server-side.
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

### Portfolio (confidential tokens)

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

### Shadow Vaults (institutional pools)

- Navigate to **Vaults** from the top nav.
- Click **New Vault** and fill in a name, select an RWA token (e.g. Gold), and set a goal amount.
- Confirm the on-chain transaction — the vault room appears in the list with a progress bar.
- Click **View** on any room to open its dedicated detail page (`/vaults/:id`).
- Click **Deposit (Confidential)**: approve token → contribute. The pool total updates publicly; your amount is encrypted.
- Copy the **Share** link and open it in a new tab — it loads the specific vault room directly.
- Verify that no room reveals individual contributor amounts — only the aggregated total is visible.

## Notes

- The confidential balance is **not** stored in localStorage/sessionStorage; chain provides encrypted handles and only authorized wallets can decrypt.
- The token registry is **per-token wrapper address** (`src/lib/tokens.ts`); no universal router assumptions.
