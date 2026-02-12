---
name: bsv
description: Check BSV balance, send BSV, and receive BSV (show address)
---

# BSV Wallet Skill

Manage Bitcoin SV (BSV) — check balance, send, and receive.

## Setup

First run installs the `bsv` npm package automatically. Wallet key is stored at `~/.openclaw/bsv-wallet.json`.

### Initialize wallet (first time)
```bash
node scripts/wallet.js init
```

### Show receiving address
```bash
node scripts/wallet.js address
```

### Check balance
```bash
node scripts/wallet.js balance [address]
```
Omit address to check your own wallet's balance.

### Send BSV
```bash
node scripts/wallet.js send <address> <amount_bsv>
```
Sends the specified amount in BSV. Prompts nothing — confirm before running.

### Show wallet info
```bash
node scripts/wallet.js info
```
Shows address and WIF (private key). **Sensitive — don't share the WIF.**

## API

Uses [WhatsOnChain](https://api.whatsonchain.com) — free, no API key needed.

## Notes

- Wallet is a single key (not HD). Simple and sufficient for basic use.
- All amounts in BSV (not satoshis) for user-facing commands.
- Transaction fee: 1 sat/byte (BSV fees are very low).
- The `send` command selects UTXOs automatically and sends change back to self.
