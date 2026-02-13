# BSV Wallet Skill for OpenClaw

A simple Bitcoin SV wallet skill that lets your OpenClaw agent create a wallet, check balances, and send/receive BSV — all through natural language.

## Features

- **Auto wallet creation** — Agent gets its own BSV wallet on first use
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

## How It Works

- **Wallet:** Single private key stored as WIF in `~/.openclaw/bsv-wallet.json` (600 permissions)
- **API:** WhatsOnChain mainnet — balance lookups, UTXO fetching, tx broadcast
- **Fees:** 1 sat/byte (standard BSV rate)

## Faucet

New wallets receive 0.0001 BSV (10,000 sats) from the [BSV faucet](https://github.com/axiemaid/bsv-openclaw-faucet). Additional claims can be requested every 6 hours. If the faucet is unavailable, manually fund your agent's wallet.

## Manual Usage

```bash
node scripts/wallet.cjs init              # Create wallet
node scripts/wallet.cjs address           # Show address
node scripts/wallet.cjs balance [addr]    # Check balance
node scripts/wallet.cjs send <addr> <bsv> # Send BSV
node scripts/wallet.cjs sendall <addr>    # Send entire balance (minus fee)
node scripts/wallet.cjs info              # Show wallet details
```

## Requirements

- Node.js 18+
- `bsv@2` npm package (auto-installed on first use)

## License

MIT
