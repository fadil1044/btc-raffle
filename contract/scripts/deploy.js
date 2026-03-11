#!/usr/bin/env node
/**
 * Deploy BTC Raffle Contract to OP_NET
 * 
 * Usage:
 *   OPNET_PRIVATE_KEY=<your_wif_key> node scripts/deploy.js
 * 
 * Or set up a .env file with:
 *   OPNET_PRIVATE_KEY=your_wif_private_key
 *   OPNET_NETWORK=mainnet  # or testnet
 */

const fs = require('fs');
const path = require('path');

// Load .env if present
try {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const [key, ...vals] = line.split('=');
      if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
    }
  }
} catch {}

async function deploy() {
  const { JSONRpcProvider, ContractDeployer } = require('@btc-vision/opnet');

  const privateKey = process.env.OPNET_PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ Set OPNET_PRIVATE_KEY in your environment or .env file');
    process.exit(1);
  }

  const network = process.env.OPNET_NETWORK || 'mainnet';
  const rpcUrl = network === 'testnet'
    ? 'https://testnet.opnet.org'
    : 'https://api.opnet.org';

  console.log(`\n🚀 Deploying BTC Raffle contract to OP_NET (${network})...\n`);

  const wasmPath = path.join(__dirname, '../build/contract.wasm');
  if (!fs.existsSync(wasmPath)) {
    console.error('❌ Contract WASM not found. Run "npm run build" first.');
    process.exit(1);
  }

  const wasm = fs.readFileSync(wasmPath);
  const provider = new JSONRpcProvider(rpcUrl);

  try {
    const deployer = new ContractDeployer(provider, privateKey);

    console.log('📝 Contract size:', wasm.length, 'bytes');
    console.log('💸 Estimating deploy cost...');

    const feeEstimate = await deployer.estimateDeployFee(wasm);
    console.log('⛽ Estimated fee:', feeEstimate, 'satoshis\n');

    console.log('📡 Broadcasting deployment transaction...');
    const result = await deployer.deploy(wasm);

    if (result && result.contractAddress) {
      console.log('\n✅ CONTRACT DEPLOYED SUCCESSFULLY!');
      console.log('━'.repeat(50));
      console.log('📍 Contract Address:', result.contractAddress);
      console.log('🔗 TX Hash:', result.txid);
      console.log('🔍 Explorer:', `https://opscan.org/tx/${result.txid}`);
      console.log('━'.repeat(50));
      console.log('\n📋 Next steps:');
      console.log('1. Copy the contract address above');
      console.log('2. Open the dApp in your browser');
      console.log('3. Paste the contract address in the "Set Contract Address" field');
      console.log('4. Call initialize() with ticket price, max tickets, duration\n');

      // Save to .env for frontend
      const frontendEnvPath = path.join(__dirname, '../../.env');
      const envLine = `VITE_RAFFLE_CONTRACT_ADDRESS=${result.contractAddress}\n`;
      if (fs.existsSync(frontendEnvPath)) {
        let content = fs.readFileSync(frontendEnvPath, 'utf8');
        if (content.includes('VITE_RAFFLE_CONTRACT_ADDRESS=')) {
          content = content.replace(/VITE_RAFFLE_CONTRACT_ADDRESS=.*/, envLine.trim());
        } else {
          content += '\n' + envLine;
        }
        fs.writeFileSync(frontendEnvPath, content);
      } else {
        fs.writeFileSync(frontendEnvPath, envLine);
      }
      console.log('💾 Contract address saved to frontend .env file');
    } else {
      console.error('❌ Deployment failed:', result);
    }
  } catch (err) {
    console.error('❌ Deploy error:', err.message || err);
    process.exit(1);
  }
}

deploy();
