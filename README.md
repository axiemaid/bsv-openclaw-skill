# BSV Wallet Skill for OpenClaw

A simple Bitcoin SV wallet skill that lets your OpenClaw agent check balances, send BSV, and receive BSV — all through natural language.

## Features

- **Auto wallet creation** — Agent gets its own BSV wallet on first use (single key, stored securely)
- **Check balance** — Query any BSV address or your own wallet
- **Send BSV** — Send to any address with automatic UTXO selection and change handling
- **Receive BSV** — Show your wallet address for deposits
- **No API key needed** — Uses [WhatsOnChain](https://whatsonchain.com) (free, no auth)

## Install

Tell your OpenClaw agent:

> Install the BSV skill from https://github.com/axiemaid/bsv-openclaw-skill

## Usage

Once installed, just talk to your agent:

- *"Check my BSV balance"*
- *"Send 0.01 BSV to 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"*
- *"What's my BSV address?"*

## Requirements

- Node.js 18+
- `bsv@2` npm package (auto-installed on first use)

## How It Works

- **Wallet:** Auto-created on first run — single private key stored as WIF in `~/.openclaw/bsv-wallet.json` (600 permissions)
- **API:** WhatsOnChain mainnet — balance lookups, UTXO fetching, tx broadcast
- **Fees:** 1 sat/byte (standard BSV rate)

## Manual Usage

```bash
node scripts/wallet.cjs init              # Create wallet
node scripts/wallet.cjs address           # Show address
node scripts/wallet.cjs balance [addr]    # Check balance
node scripts/wallet.cjs send <addr> <bsv> # Send BSV
node scripts/wallet.cjs info              # Show wallet details
```

## License

MIT
