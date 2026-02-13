#!/usr/bin/env node
/**
 * BSV Wallet - Simple single-key wallet for OpenClaw
 * Uses WhatsOnChain API (free, no auth) and bsv@2 library
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const WALLET_PATH = path.join(process.env.HOME, '.openclaw', 'bsv-wallet.json');
const WOC_BASE = 'https://api.whatsonchain.com/v1/bsv/main';
const SAT_PER_BSV = 1e8;
const FEE_RATE = 1; // sat/byte

// Ensure bsv package is installed
function ensureBsv() {
  try {
    return require('bsv');
  } catch {
    const { execSync } = require('child_process');
    const skillDir = path.join(__dirname, '..');
    if (!fs.existsSync(path.join(skillDir, 'node_modules', 'bsv'))) {
      console.error('Installing bsv package...');
      execSync('npm install bsv@2 --save --no-fund --no-audit', { cwd: skillDir, stdio: 'inherit' });
    }
    return require(path.join(skillDir, 'node_modules', 'bsv'));
  }
}

// HTTP helpers
function httpGet(urlStr) {
  return new Promise((resolve, reject) => {
    https.get(urlStr, { headers: { 'User-Agent': 'openclaw-bsv/1.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    }).on('error', reject);
  });
}

function httpPost(urlStr, body) {
  const url = new URL(urlStr);
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: url.hostname, path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// Wallet management
function loadWallet() {
  if (!fs.existsSync(WALLET_PATH)) return null;
  return JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
}

function saveWallet(data) {
  fs.mkdirSync(path.dirname(WALLET_PATH), { recursive: true });
  fs.writeFileSync(WALLET_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
}

// Commands
async function cmdInit() {
  const existing = loadWallet();
  if (existing) {
    console.log(`Wallet already exists: ${existing.address}`);
    console.log('Delete ~/.openclaw/bsv-wallet.json to create a new one.');
    return;
  }
  const bsv = ensureBsv();
  const privKey = bsv.PrivKey.fromRandom();
  const keyPair = bsv.KeyPair.fromPrivKey(privKey);
  const address = bsv.Address.fromPubKey(keyPair.pubKey).toString();
  const wif = privKey.toWif();
  saveWallet({ wif, address, created: new Date().toISOString() });
  console.log(`✅ Wallet created!`);
  console.log(`Address: ${address}`);
  console.log(`Wallet saved to: ${WALLET_PATH}`);
}

async function cmdAddress() {
  const w = loadWallet();
  if (!w) { console.error('No wallet. Run: node wallet.js init'); process.exit(1); }
  console.log(w.address);
}

async function cmdBalance(addr) {
  const w = loadWallet();
  const target = addr || (w && w.address);
  if (!target) { console.error('No address. Provide one or init wallet first.'); process.exit(1); }
  const bal = await httpGet(`${WOC_BASE}/address/${target}/balance`);
  const confirmed = bal.confirmed / SAT_PER_BSV;
  const unconfirmed = bal.unconfirmed / SAT_PER_BSV;
  console.log(`Address: ${target}`);
  console.log(`Balance: ${confirmed.toFixed(8)} BSV`);
  if (bal.unconfirmed !== 0) console.log(`Unconfirmed: ${unconfirmed.toFixed(8)} BSV`);
  console.log(`(${bal.confirmed} satoshis)`);
}

async function cmdSend(toAddress, amountBsv) {
  const bsv = ensureBsv();
  const w = loadWallet();
  if (!w) { console.error('No wallet. Run: node wallet.js init'); process.exit(1); }
  if (!toAddress || !amountBsv) { console.error('Usage: node wallet.js send <address> <amount_bsv>'); process.exit(1); }

  const amountSat = Math.round(parseFloat(amountBsv) * SAT_PER_BSV);
  if (amountSat <= 0) { console.error('Invalid amount'); process.exit(1); }

  // Validate destination address
  try { bsv.Address.fromString(toAddress); } catch { console.error('Invalid BSV address'); process.exit(1); }

  // Fetch UTXOs
  const utxos = await httpGet(`${WOC_BASE}/address/${w.address}/unspent`);
  if (!utxos.length) { console.error('No UTXOs available (zero balance)'); process.exit(1); }

  // Sort UTXOs largest first for efficient selection
  utxos.sort((a, b) => b.value - a.value);

  // Select UTXOs
  let selected = [];
  let totalIn = 0;
  for (const u of utxos) {
    selected.push(u);
    totalIn += u.value;
    // Rough fee estimate: 148*inputs + 34*outputs + 10
    const estFee = (148 * selected.length + 34 * 2 + 10) * FEE_RATE;
    if (totalIn >= amountSat + estFee) break;
  }

  const fee = (148 * selected.length + 34 * 2 + 10) * FEE_RATE;
  const change = totalIn - amountSat - fee;
  if (change < 0) {
    console.error(`Insufficient funds. Need ${((amountSat + fee) / SAT_PER_BSV).toFixed(8)} BSV, have ${(totalIn / SAT_PER_BSV).toFixed(8)} BSV`);
    process.exit(1);
  }

  // Fetch raw txs for inputs (need scriptPubKey)
  const privKey = bsv.PrivKey.fromWif(w.wif);
  const keyPair = bsv.KeyPair.fromPrivKey(privKey);
  const pubKey = keyPair.pubKey;

  const txb = new bsv.TxBuilder();

  // Add outputs
  txb.outputToAddress(new bsv.Bn(amountSat), bsv.Address.fromString(toAddress));
  if (change > 546) { // dust threshold
    txb.setChangeAddress(bsv.Address.fromString(w.address));
  }

  // Add inputs - need to fetch each tx to get the output script
  for (const u of selected) {
    const rawTx = await httpGet(`${WOC_BASE}/tx/${u.tx_hash}/hex`);
    const tx = bsv.Tx.fromHex(typeof rawTx === 'string' ? rawTx : rawTx.hex || rawTx);
    const txOut = tx.txOuts[u.tx_pos];
    const txHashBuf = Buffer.from(u.tx_hash, 'hex').reverse();
    txb.inputFromPubKeyHash(txHashBuf, u.tx_pos, txOut, pubKey);
  }

  // Set fee and change
  txb.setFeePerKbNum(FEE_RATE * 1000);

  // Build and sign
  txb.build({ useAllInputs: true });
  for (let i = 0; i < selected.length; i++) {
    txb.signWithKeyPairs([keyPair]);
  }

  const txHex = txb.tx.toHex();

  // Broadcast
  console.log(`Broadcasting transaction...`);
  const result = await httpPost(`${WOC_BASE}/tx/raw`, { txhex: txHex });
  const txid = typeof result === 'string' ? result.replace(/"/g, '') : result.txid || result;
  console.log(`✅ Sent ${amountBsv} BSV to ${toAddress}`);
  console.log(`TXID: ${txid}`);
  console.log(`Fee: ${fee} satoshis`);
  if (change > 546) console.log(`Change: ${(change / SAT_PER_BSV).toFixed(8)} BSV`);
}

async function cmdSendAll(toAddress) {
  const bsv = ensureBsv();
  const w = loadWallet();
  if (!w) { console.error('No wallet. Run: node wallet.cjs init'); process.exit(1); }
  if (!toAddress) { console.error('Usage: node wallet.cjs sendall <address>'); process.exit(1); }

  // Validate destination address
  try { bsv.Address.fromString(toAddress); } catch { console.error('Invalid BSV address'); process.exit(1); }

  // Fetch UTXOs
  const utxos = await httpGet(`${WOC_BASE}/address/${w.address}/unspent`);
  if (!utxos.length) { console.error('No UTXOs available (zero balance)'); process.exit(1); }

  const totalIn = utxos.reduce((sum, u) => sum + u.value, 0);
  const fee = (148 * utxos.length + 34 * 1 + 10) * FEE_RATE; // single output, no change
  const sendAmount = totalIn - fee;
  if (sendAmount <= 0) { console.error('Balance too low to cover fee'); process.exit(1); }

  const privKey = bsv.PrivKey.fromWif(w.wif);
  const keyPair = bsv.KeyPair.fromPrivKey(privKey);
  const pubKey = keyPair.pubKey;

  const txb = new bsv.TxBuilder();
  txb.outputToAddress(new bsv.Bn(sendAmount), bsv.Address.fromString(toAddress));

  for (const u of utxos) {
    const rawTx = await httpGet(`${WOC_BASE}/tx/${u.tx_hash}/hex`);
    const tx = bsv.Tx.fromHex(typeof rawTx === 'string' ? rawTx : rawTx.hex || rawTx);
    const txOut = tx.txOuts[u.tx_pos];
    const txHashBuf = Buffer.from(u.tx_hash, 'hex').reverse();
    txb.inputFromPubKeyHash(txHashBuf, u.tx_pos, txOut, pubKey);
  }

  txb.setFeePerKbNum(FEE_RATE * 1000);
  txb.build({ useAllInputs: true });
  for (let i = 0; i < utxos.length; i++) {
    txb.signWithKeyPairs([keyPair]);
  }

  const txHex = txb.tx.toHex();
  console.log('Broadcasting transaction...');
  const result = await httpPost(`${WOC_BASE}/tx/raw`, { txhex: txHex });
  const txid = typeof result === 'string' ? result.replace(/"/g, '') : result.txid || result;
  console.log(`✅ Sent ${(sendAmount / SAT_PER_BSV).toFixed(8)} BSV to ${toAddress}`);
  console.log(`TXID: ${txid}`);
  console.log(`Fee: ${fee} satoshis`);
}

async function cmdInfo() {
  const w = loadWallet();
  if (!w) { console.error('No wallet. Run: node wallet.js init'); process.exit(1); }
  console.log(`Address: ${w.address}`);
  console.log(`WIF: ${w.wif}`);
  console.log(`Created: ${w.created}`);
  console.log(`File: ${WALLET_PATH}`);
}

// Main
const [,, cmd, ...args] = process.argv;
const commands = {
  init: cmdInit,
  address: cmdAddress,
  balance: () => cmdBalance(args[0]),
  send: () => cmdSend(args[0], args[1]),
  sendall: () => cmdSendAll(args[0]),
  info: cmdInfo,
};

if (!cmd || !commands[cmd]) {
  console.log('BSV Wallet — Commands:');
  console.log('  init              Create new wallet');
  console.log('  address           Show receiving address');
  console.log('  balance [addr]    Check BSV balance');
  console.log('  send <addr> <bsv> Send BSV');
  console.log('  sendall <addr>    Send entire balance (minus fee)');
  console.log('  info              Show wallet details (includes WIF)');
  process.exit(0);
}

commands[cmd]().catch(e => { console.error(`Error: ${e.message}`); process.exit(1); });
