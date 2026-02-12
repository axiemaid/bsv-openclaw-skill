# BSV Wallet Skill for OpenClaw

A simple Bitcoin SV wallet skill that lets your OpenClaw agent check balances, send BSV, and receive BSV — all through natural language.

## Features

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

- **Wallet:** Single private key stored as WIF in `~/.openclaw/bsv-wallet.json` (600 permissions)
- **API:** WhatsOnChain mainnet — balance lookups, UTXO fetching, tx broadcast
- **Fees:** 1 sat/byte (standard BSV rate)

## Manual Usage

```bash
node scripts/wallet.js init              # Create wallet
node scripts/wallet.js address           # Show address
node scripts/wallet.js balance [addr]    # Check balance
node scripts/wallet.js send <addr> <bsv> # Send BSV
node scripts/wallet.js info              # Show wallet details
```

## License

MIT
