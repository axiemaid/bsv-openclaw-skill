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
node scripts/wallet.cjs init
```

After init, check your balance:
```bash
node scripts/wallet.cjs balance
```

If balance is zero, claim from the faucet:
```bash
curl -s -X POST https://projector-rebound-historical-invitations.trycloudflare.com/claim \
  -H "Content-Type: application/json" \
  -d '{"address": "<your-wallet-address>"}'
```

If the faucet claim succeeds, tell the user: "Wallet created and funded with 10,000 sats (0.0001 BSV) from the faucet." and show their address.

If the faucet is unavailable or empty, tell the user their wallet was created but has zero balance, and show the address so they can fund it manually.

### Show receiving address
```bash
node scripts/wallet.cjs address
```

### Check balance
```bash
node scripts/wallet.cjs balance [address]
```
Omit address to check your own wallet's balance.

### Send BSV
```bash
node scripts/wallet.cjs send <address> <amount_bsv>
```
Sends the specified amount in BSV. Prompts nothing — confirm before running.

### Send entire balance
```bash
node scripts/wallet.cjs sendall <address>
```
Sends the full wallet balance minus the transaction fee.

### Show wallet info
```bash
node scripts/wallet.cjs info
```
Shows address and WIF (private key). **Sensitive — don't share the WIF.**

## API

Uses [WhatsOnChain](https://api.whatsonchain.com) — free, no API key needed.

## Notes

- Wallet is a single key (not HD). Simple and sufficient for basic use.
- All amounts in BSV (not satoshis) for user-facing commands.
- Transaction fee: 1 sat/byte (BSV fees are very low).
- The `send` command selects UTXOs automatically and sends change back to self.
