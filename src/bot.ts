import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { BotConfig } from './config';
import { MonacoPositionManager } from './prediction-markets/monaco-position-manager';
import { MonacoTransactionParser, ParsedMonacoTrade } from './prediction-markets/monaco-transaction-parser';
import { MONACO_PROGRAM_ID } from './prediction-markets/monaco-protocol';

export interface ParsedTrade {
  marketAddress: PublicKey;
  outcome: 'YES' | 'NO';
  action: 'BUY' | 'SELL';
  amount: number;
  price?: number;
}

export class CopyTradingBot {
  private connection: Connection;
  private wallet: Keypair;
  private config: BotConfig;
  private isRunning: boolean = false;
  private lastProcessedSignatures: Set<string> = new Set();
  private dailyLoss: number = 0;
  private lastResetDate: string = new Date().toDateString();
  private monacoPositionManager?: MonacoPositionManager;
  private monacoParser: MonacoTransactionParser;

  constructor(connection: Connection, wallet: Keypair, config: BotConfig) {
    this.connection = connection;
    this.wallet = wallet;
    this.config = config;
    this.monacoParser = new MonacoTransactionParser(connection);
    
    if (this.isMonacoConfigured()) {
      this.monacoPositionManager = new MonacoPositionManager(connection, wallet);
    }
  }

  private isMonacoConfigured(): boolean {
    return this.config.predictionMarketPrograms.some(
      id => id === MONACO_PROGRAM_ID.toBase58()
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  Bot is already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ Bot started\n');

    if (this.config.targetAddresses.length === 0) {
      console.warn('⚠️  No target addresses configured. Add TARGET_ADDRESSES to .env');
    }

    if (this.config.predictionMarketPrograms.length === 0) {
      console.warn('⚠️  No prediction market programs configured. Add PREDICTION_MARKET_PROGRAMS to .env');
    }

    this.monitorLoop();
  }

  private async monitorLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        this.resetDailyLossIfNeeded();

        if (this.dailyLoss >= this.config.maxDailyLoss) {
          console.log(`⛔ Daily loss limit reached: ${this.dailyLoss} SOL`);
          await this.sleep(this.config.pollInterval);
          continue;
        }

        for (const targetAddress of this.config.targetAddresses) {
          await this.monitorAddress(targetAddress);
        }

        await this.sleep(this.config.pollInterval);
      } catch (error) {
        console.error('❌ Error in monitor loop:', error);
        await this.sleep(this.config.pollInterval);
      }
    }
  }

  private async monitorAddress(targetAddress: string): Promise<void> {
    try {
      const publicKey = new PublicKey(targetAddress);
      
      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit: 10 }
      );

      for (const sigInfo of signatures) {
        if (this.lastProcessedSignatures.has(sigInfo.signature)) {
          continue; 
        }

        const tx = await this.connection.getTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (tx && this.isPredictionMarketTransaction(tx)) {
          console.log(`📊 Found prediction market transaction: ${sigInfo.signature}`);
          await this.processTransaction(tx, targetAddress, sigInfo.signature);
        }

        this.lastProcessedSignatures.add(sigInfo.signature);
      }
    } catch (error) {
      console.error(`❌ Error monitoring address ${targetAddress}:`, error);
    }
  }

  private isPredictionMarketTransaction(tx: any): boolean {
    if (!tx || !tx.transaction || !tx.transaction.message) {
      return false;
    }

    if (this.monacoParser.isMonacoTransaction(tx)) {
      return true;
    }

    const programIds = tx.transaction.message.accountKeys
      .map((key: any) => key.pubkey?.toString() || key.toString())
      .filter((id: string) => this.config.predictionMarketPrograms.includes(id));

    return programIds.length > 0;
  }

  private async processTransaction(tx: any, sourceAddress: string, txSignature?: string): Promise<void> {
    try {
      console.log(`🔄 Processing transaction from ${sourceAddress}...`);
      
      const trade = await this.parsePredictionMarketTransaction(tx, txSignature);
      
      if (!trade) {
        console.log('   Could not parse trade from transaction');
        return;
      }

      console.log(`   Trade: ${trade.action} ${trade.outcome} on market ${trade.marketAddress.toBase58()}`);
      console.log(`   Amount: ${trade.amount} ${trade.action === 'BUY' ? 'SOL' : 'shares'}`);
      if (trade.price) {
        console.log(`   Price: ${trade.price}`);
      }

      await this.executeCopyTrade(trade);
      
    } catch (error) {
      console.error('❌ Error processing transaction:', error);
    }
  }

  private async parsePredictionMarketTransaction(tx: any, txSignature?: string): Promise<ParsedTrade | null> {
    if (!tx || !tx.transaction || !tx.transaction.message) {
      return null;
    }

    if (this.monacoParser.isMonacoTransaction(tx) && txSignature) {
      const monacoTrade = await this.monacoParser.parseTransaction(txSignature);
      if (monacoTrade) {
        const outcome: 'YES' | 'NO' = monacoTrade.forOutcome ? 'YES' : 'NO';
        const action: 'BUY' | 'SELL' = monacoTrade.orderType === 'back' ? 'BUY' : 'SELL';
        
        return {
          marketAddress: monacoTrade.marketPk,
          outcome,
          action,
          amount: monacoTrade.stake,
          price: monacoTrade.expectedPrice,
        };
      }
    }

    const instructions = tx.transaction.message.instructions;
    const accountKeys = tx.transaction.message.accountKeys;

    for (const programId of this.config.predictionMarketPrograms) {
      if (programId === MONACO_PROGRAM_ID.toBase58()) continue;
      
      const programInvolved = accountKeys.some(
        (key: any) => {
          const keyStr = key.pubkey?.toString() || key.toString();
          return keyStr === programId;
        }
      );

      if (!programInvolved) continue;

      for (const ix of instructions) {
        const ixProgramId = typeof ix.programId === 'string' 
          ? ix.programId 
          : ix.programId?.toString() || accountKeys[ix.programIdIndex]?.toString();

        if (ixProgramId === programId) {
          try {
            const marketIndex = ix.accounts?.[0] || 0;
            const marketAddress = accountKeys[marketIndex]?.pubkey || accountKeys[marketIndex];
            
            if (!marketAddress) continue;

            return {
              marketAddress: new PublicKey(marketAddress),
              outcome: 'YES',
              action: 'BUY',
              amount: 0.1,
            };
          } catch (error) {
            console.error('Error parsing instruction:', error);
            continue;
          }
        }
      }
    }

    return null;
  }

  private async executeCopyTrade(trade: ParsedTrade): Promise<void> {
    try {
      if (!this.monacoPositionManager) {
        console.error('   Monaco position manager not initialized');
        return;
      }

      const adjustedAmount = trade.amount * this.config.copyMultiplier;

      if (adjustedAmount > this.config.maxPositionSize) {
        console.log(`   ⚠️  Trade size ${adjustedAmount} exceeds max ${this.config.maxPositionSize}, skipping`);
        return;
      }

      console.log(`   📝 Executing copy trade: ${trade.action} ${adjustedAmount} ${trade.outcome} shares`);
      
      let signature: string;
      const maxPrice = trade.price ? trade.price * 1.01 : undefined;
      const minPrice = trade.price ? trade.price * 0.99 : undefined;

      if (trade.action === 'BUY') {
        if (trade.outcome === 'YES') {
          signature = await this.monacoPositionManager.buyYesShares(
            trade.marketAddress, 
            adjustedAmount,
            maxPrice
          );
        } else {
          signature = await this.monacoPositionManager.buyNoShares(
            trade.marketAddress, 
            adjustedAmount,
            maxPrice
          );
        }
      } else {
        if (trade.outcome === 'YES') {
          signature = await this.monacoPositionManager.sellYesShares(
            trade.marketAddress, 
            adjustedAmount,
            minPrice
          );
        } else {
          signature = await this.monacoPositionManager.sellNoShares(
            trade.marketAddress, 
            adjustedAmount,
            minPrice
          );
        }
      }

      console.log(`   ✅ Trade executed: ${signature}`);
      
    } catch (error) {
      console.error('   ❌ Error executing copy trade:', error);
    }
  }

  private resetDailyLossIfNeeded(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyLoss = 0;
      this.lastResetDate = today;
      console.log('📅 Daily loss counter reset');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop(): void {
    this.isRunning = false;
    console.log('🛑 Bot stopped');
  }
}

