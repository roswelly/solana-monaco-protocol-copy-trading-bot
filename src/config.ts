import * as dotenv from 'dotenv';

dotenv.config();

export interface BotConfig {
  rpcUrl: string;
  privateKey?: string;
  keypairPath?: string;
  targetAddresses: string[];
  predictionMarketPrograms: string[];
  maxPositionSize: number; 
  maxDailyLoss: number; 
  copyMultiplier: number; 
  pollInterval: number; 
}

export class Config {
  static load(): BotConfig {
    return {
      rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      privateKey: process.env.PRIVATE_KEY,
      keypairPath: process.env.KEYPAIR_PATH,
      targetAddresses: (process.env.TARGET_ADDRESSES || '').split(',').filter(Boolean),
      predictionMarketPrograms: (process.env.PREDICTION_MARKET_PROGRAMS || '').split(',').filter(Boolean),
      maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '1.0'),
      maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '5.0'),
      copyMultiplier: parseFloat(process.env.COPY_MULTIPLIER || '1.0'),
      pollInterval: parseInt(process.env.POLL_INTERVAL || '5000', 10),
    };
  }
}

