#!/usr/bin/env node
/**
 * deploy.mjs  –  Deploy BtcRaffle contract to OP_NET
 *
 * Usage:
 *   MNEMONIC="your twelve words" \
 *   TICKET_PRICE_SATS=1000 \
 *   MAX_TICKETS=100 \
 *   node scripts/deploy.mjs
 *
 * After deploying, copy the printed contract address into your .env:
 *   VITE_RAFFLE_CONTRACT_ADDRESS=<address>
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dynamic imports for ESM-only packages
const { JSONRpcProvider, networks } = await import('opnet');
const { Wallet, Address }           = await import('@btc-vision/transaction');
const { Network }                   = await import('@btc-vision/bitcoin');

// ── Config from env ────────────────────────────────────────────────────────
const MNEMONIC        = process.env.MNEMONIC;
const RPC             = process.env.OPNET_RPC ?? 'https://api.opnet.org';
const TICKET_PRICE    = BigInt(process.env.TICKET_PRICE_SATS ?? '1000');  // sats
const MAX_TICKETS     = BigInt(process.env.MAX_TICKETS ?? '100');
const FEE_RATE        = parseInt(process.env.FEE_RATE ?? '10', 10);

if (!MNEMONIC) {
  console.error('❌  Set MNEMONIC env var to your wallet mnemonic');
  process.exit(1);
}

// ── Load WASM bytecode ─────────────────────────────────────────────────────
const wasmPath = join(__dirname, '../contract/build/BtcRaffle.wasm');
let wasmBytes;
try {
  wasmBytes = readFileSync(wasmPath);
} catch {
  console.error('❌  Contract WASM not found. Run: cd contract && npm run build');
  process.exit(1);
}

console.log('🔧  Deploying BtcRaffle to OP_NET...');
console.log(`    RPC:          ${RPC}`);
console.log(`    Ticket price: ${TICKET_PRICE} sats`);
console.log(`    Max tickets:  ${MAX_TICKETS}`);

// ── Connect wallet & deploy ─────────────────────────────────────────────────
const provider = new JSONRpcProvider(RPC, networks.mainnet);
const wallet   = Wallet.fromMnemonic(MNEMONIC, networks.mainnet);
const address  = new Address(wallet.keypair.publicKey);

console.log(`    Deployer:     ${address.toP2TR(networks.mainnet)}`);

try {
  // Encode constructor args: ticketPrice (u256) + maxTickets (u256)
  const { BytesWriter } = await import('@btc-vision/btc-runtime/runtime');
  const constructorArgs = new BytesWriter();
  constructorArgs.writeU256(TICKET_PRICE);
  constructorArgs.writeU256(MAX_TICKETS);

  const deployResult = await provider.deployContract({
    bytecode:        wasmBytes,
    constructorArgs: constructorArgs.getBuffer(),
    signer:          wallet.keypair,
    refundTo:        wallet.p2tr,
    maximumAllowedSatToSpend: 200000n,
    feeRate:         FEE_RATE,
    network:         networks.mainnet,
  });

  if (deployResult?.contractAddress) {
    console.log('\n✅  Contract deployed!');
    console.log(`    Address: ${deployResult.contractAddress}`);
    console.log(`    TxID:    ${deployResult.txid}`);
    console.log('\nAdd to your .env file:');
    console.log(`VITE_RAFFLE_CONTRACT_ADDRESS=${deployResult.contractAddress}`);
  } else {
    console.error('❌  Deploy failed – no contract address returned', deployResult);
  }
} catch (err) {
  console.error('❌  Deploy error:', err.message ?? err);
  process.exit(1);
}
