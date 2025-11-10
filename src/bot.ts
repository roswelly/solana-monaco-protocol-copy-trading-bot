import { Connection, PublicKey, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import { BotConfig } from './config';
import { PositionManager } from './prediction-markets/position-manager';

export interface ParsedTrade {
  marketAddress: PublicKey;
  outcome: 'YES' | 'NO';
  action: 'BUY' | 'SELL';
  amount: number; // SOL amount for buy, shares for sell
  price?: number; // Price per share if available
}

export class CopyTradingBot {
  private connection: Connection;
  private wallet: Keypair;
  private config: BotConfig;
  private isRunning: boolean = false;
  private lastProcessedSignatures: Set<string> = new Set();
  private dailyLoss: number = 0;
  private lastResetDate: string = new Date().toDateString();
  private positionManagers: Map<string, PositionManager> = new Map();

  constructor(connection: Connection, wallet: Keypair, config: BotConfig) {
    this.connection = connection;
    this.wallet = wallet;
    this.config = config;
    
    // Initialize position managers for each program
    for (const programId of config.predictionMarketPrograms) {
      this.positionManagers.set(
        programId,
        new PositionManager(connection, wallet, new PublicKey(programId))
      );
    }
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
          await this.processTransaction(tx, targetAddress);
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

    const programIds = tx.transaction.message.accountKeys
      .map((key: any) => key.toString())
      .filter((id: string) => this.config.predictionMarketPrograms.includes(id));

    return programIds.length > 0;
  }

  private async processTransaction(tx: any, sourceAddress: string): Promise<void> {
    try {
      console.log(`🔄 Processing transaction from ${sourceAddress}...`);
      
      // Parse transaction to extract trade information
      const trade = this.parsePredictionMarketTransaction(tx);
      
      if (!trade) {
        console.log('   Could not parse trade from transaction');
        return;
      }

      console.log(`   Trade: ${trade.action} ${trade.outcome} on market ${trade.marketAddress.toBase58()}`);
      console.log(`   Amount: ${trade.amount} ${trade.action === 'BUY' ? 'SOL' : 'shares'}`);

      // Execute copy trade
      await this.executeCopyTrade(trade);
      
    } catch (error) {
      console.error('❌ Error processing transaction:', error);
    }
  }

  /**
   * Parse prediction market transaction
   * 
   * This is platform-specific - you need to implement based on your platform's structure
   */
  private parsePredictionMarketTransaction(tx: any): ParsedTrade | null {
    if (!tx || !tx.transaction || !tx.transaction.message) {
      return null;
    }

    // Find which prediction market program this transaction uses
    const instructions = tx.transaction.message.instructions;
    const accountKeys = tx.transaction.message.accountKeys;

    for (const programId of this.config.predictionMarketPrograms) {
      const programPubkey = new PublicKey(programId);
      
      // Check if this transaction involves this program
      const programInvolved = accountKeys.some(
        (key: any) => key.pubkey?.toString() === programId || key.toString() === programId
      );

      if (!programInvolved) continue;

      // Find the instruction for this program
      for (const ix of instructions) {
        const ixProgramId = typeof ix.programId === 'string' 
          ? ix.programId 
          : ix.programId?.toString() || accountKeys[ix.programIdIndex]?.toString();

        if (ixProgramId === programId) {
          // Platform-specific parsing
          // You need to decode the instruction data based on your platform's format
          
          // Example structure (adjust for your platform):
          // - Instruction discriminator (first 8 bytes)
          // - Market address (PublicKey, 32 bytes)
          // - Outcome (u8: 0 = NO, 1 = YES)
          // - Amount (u64, 8 bytes)
          // - Action (u8: 0 = BUY, 1 = SELL)
          
          // For now, return a placeholder that you'll need to implement
          // See src/prediction-markets/ for examples
          
          try {
            // Try to extract from instruction accounts
            // Market is often in accounts[0] or accounts[1]
            const marketIndex = ix.accounts?.[0] || 0;
            const marketAddress = accountKeys[marketIndex]?.pubkey || accountKeys[marketIndex];
            
            if (!marketAddress) continue;

            // Decode instruction data (platform-specific)
            // const data = Buffer.from(ix.data, 'base64');
            // const outcome = data[8]; // Example
            // const amount = data.readBigUInt64LE(9); // Example
            // const action = data[17]; // Example

            // Placeholder - implement based on your platform
            return {
              marketAddress: new PublicKey(marketAddress),
              outcome: 'YES', // Parse from instruction data
              action: 'BUY',   // Parse from instruction data
              amount: 0.1,     // Parse from instruction data (SOL or shares)
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

  /**
   * Execute a copy trade
   */
  private async executeCopyTrade(trade: ParsedTrade): Promise<void> {
    try {
      // Find the appropriate position manager
      let positionManager: PositionManager | undefined;
      for (const [programId, manager] of this.positionManagers.entries()) {
        // Check if this market belongs to this program
        // You may need to query the market to find its program
        positionManager = manager;
        break; // For now, use first available
      }

      if (!positionManager) {
        console.error('   No position manager found for this trade');
        return;
      }

      // Apply copy multiplier
      const adjustedAmount = trade.amount * this.config.copyMultiplier;

      // Check position size limits
      if (adjustedAmount > this.config.maxPositionSize) {
        console.log(`   ⚠️  Trade size ${adjustedAmount} exceeds max ${this.config.maxPositionSize}, skipping`);
        return;
      }

      // Execute the trade
      console.log(`   📝 Executing copy trade: ${trade.action} ${adjustedAmount} ${trade.outcome} shares`);
      
      let signature: string;
      if (trade.action === 'BUY') {
        if (trade.outcome === 'YES') {
          signature = await positionManager.buyYesShares(trade.marketAddress, adjustedAmount);
        } else {
          signature = await positionManager.buyNoShares(trade.marketAddress, adjustedAmount);
        }
      } else {
        if (trade.outcome === 'YES') {
          signature = await positionManager.sellYesShares(trade.marketAddress, adjustedAmount);
        } else {
          signature = await positionManager.sellNoShares(trade.marketAddress, adjustedAmount);
        }
      }

      console.log(`   ✅ Trade executed: ${signature}`);
      
    } catch (error) {
      console.error('   ❌ Error executing copy trade:', error);
      // Update daily loss if trade failed
      // this.dailyLoss += trade.amount;
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

