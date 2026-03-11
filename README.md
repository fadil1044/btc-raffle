# BTC Raffle — Bitcoin L1 Raffle dApp

**Vibecode Challenge Week 3 — "The Breakthrough"**
Built on Bitcoin L1 via [OP_NET](https://opnet.org)

A fully on-chain raffle dApp where users buy tickets with real BTC and a verifiable winner is drawn using Bitcoin block hash entropy.

## Features

- Real Bitcoin L1 smart contracts via OP_NET
- OP_WALLET integration (Chrome extension)
- On-chain randomness using Bitcoin block hash
- Transparent participant list with win probabilities
- Trustless prize claiming — winner gets BTC directly

## Quick Start

### Frontend

```bash
npm install
npm run dev
```

Open http://localhost:5173

### Deploy Contract

```bash
cd contract
npm install
npm run build

export OPNET_PRIVATE_KEY=your_wif_key
npm run deploy
```

Then paste the contract address into the dApp.

## Initialize Raffle

After deploying, call `initialize(ticketPriceSats, maxTickets, durationBlocks)`:

```
ticketPriceSats = 10000    # 0.0001 BTC per ticket
maxTickets = 100
durationBlocks = 144       # ~1 Bitcoin day
```

## Tech Stack

- React 18 + Vite + TypeScript (frontend)
- AssemblyScript / WASM (smart contract)
- @btc-vision/walletconnect (OP_WALLET)
- @btc-vision/opnet (RPC provider)

## Links

- [OP_NET](https://opnet.org)
- [OPScan Explorer](https://opscan.org)
- [OP_WALLET](https://chromewebstore.google.com/detail/opwallet/pmbjpcmaaladnfpacpmhmnfmpklgbdjb)
- [Vibecode Challenge](https://vibecode.finance/challenge)
