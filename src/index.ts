import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import { CopyTradingBot } from './bot';
import { Config, BotConfig } from './config';

dotenv.config();

async function main() {
  console.log('🚀 Starting Solana Prediction Market Copy Trading Bot...\n');

  const config = Config.load();

  const connection = new Connection(
    config.rpcUrl,
    'confirmed'
  );

  let wallet: Keypair;
  if (config.privateKey) {
    const secretKey = Uint8Array.from(JSON.parse(config.privateKey));
    wallet = Keypair.fromSecretKey(secretKey);
  } else if (config.keypairPath) {
    throw new Error('Keypair file loading not implemented yet');
  } else {
    throw new Error('No wallet configured. Set PRIVATE_KEY in .env');
  }

  console.log(`📡 Connected to: ${config.rpcUrl}`);
  console.log(`👛 Wallet: ${wallet.publicKey.toBase58()}\n`);

  const bot = new CopyTradingBot(connection, wallet, config);
  await bot.start();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

