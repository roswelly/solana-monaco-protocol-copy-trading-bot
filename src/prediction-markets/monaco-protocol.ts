/**
 * Monaco Protocol Integration
 * 
 * Monaco Protocol is a decentralized betting engine on Solana
 * Program ID: monacoUXKtUi6vKsQwaLyxmXKSievfNWEcYXTgkbCih
 * 
 * Documentation: https://www.monacoprotocol.xyz/
 * SDK: https://github.com/MonacoProtocol/sdk
 * Client: @monaco-protocol/client
 */

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { MonacoProtocolClient } from '@monaco-protocol/client';

// Monaco Protocol mainnet program ID
export const MONACO_PROGRAM_ID = new PublicKey('monacoUXKtUi6vKsQwaLyxmXKSievfNWEcYXTgkbCih');

export interface MonacoMarket {
  marketPk: PublicKey;
  marketTitle: string;
  marketLockTimestamp: number;
  marketSettleTimestamp?: number;
  marketStatus: string;
  eventAccount: PublicKey;
  mintAccount: PublicKey;
  marketOutcomesCount: number;
  inplayEnabled: boolean;
}

export interface MonacoPosition {
  marketPk: PublicKey;
  marketTitle: string;
  outcomeIndex: number; // 0 = YES/For, 1 = NO/Against
  outcomeTitle: string;
  matchedAmount: number;
  pendingAmount: number;
  availableAmount: number;
  averageMatchedPrice: number;
}

export interface MonacoTrade {
  marketPk: PublicKey;
  outcomeIndex: number; // 0 = YES, 1 = NO
  forOutcome: boolean; // true = YES, false = NO
  stake: number; // Amount in SOL or token
  expectedPrice: number; // Price per share (0-1)
  orderType: 'back' | 'lay'; // back = buy YES, lay = sell YES
}

/**
 * Monaco Protocol Client Wrapper
 */
export class MonacoProtocolIntegration {
  private client: MonacoProtocolClient;
  private connection: Connection;
  private wallet: Keypair;

  constructor(connection: Connection, wallet: Keypair) {
    this.connection = connection;
    this.wallet = wallet;
    this.client = new MonacoProtocolClient(connection, MONACO_PROGRAM_ID);
  }

  /**
   * Get all active markets
   */
  async getActiveMarkets(): Promise<MonacoMarket[]> {
    try {
      const markets = await this.client.markets.getMarkets({
        status: 'open', // 'open', 'locked', 'settled'
      });

      return markets.data.markets.map((market: any) => ({
        marketPk: new PublicKey(market.publicKey),
        marketTitle: market.marketTitle,
        marketLockTimestamp: market.marketLockTimestamp,
        marketSettleTimestamp: market.marketSettleTimestamp,
        marketStatus: market.marketStatus,
        eventAccount: new PublicKey(market.eventAccount),
        mintAccount: new PublicKey(market.mintAccount),
        marketOutcomesCount: market.marketOutcomesCount,
        inplayEnabled: market.inplayEnabled,
      }));
    } catch (error) {
      console.error('Error fetching Monaco markets:', error);
      return [];
    }
  }

  /**
   * Get market by public key
   */
  async getMarket(marketPk: PublicKey): Promise<MonacoMarket | null> {
    try {
      const market = await this.client.markets.getMarket(marketPk);
      
      if (!market.data) return null;

      return {
        marketPk: new PublicKey(market.data.publicKey),
        marketTitle: market.data.marketTitle,
        marketLockTimestamp: market.data.marketLockTimestamp,
        marketSettleTimestamp: market.data.marketSettleTimestamp,
        marketStatus: market.data.marketStatus,
        eventAccount: new PublicKey(market.data.eventAccount),
        mintAccount: new PublicKey(market.data.mintAccount),
        marketOutcomesCount: market.data.marketOutcomesCount,
        inplayEnabled: market.data.inplayEnabled,
      };
    } catch (error) {
      console.error(`Error fetching market ${marketPk.toBase58()}:`, error);
      return null;
    }
  }

  /**
   * Get market prices (YES/NO)
   */
  async getMarketPrices(marketPk: PublicKey): Promise<{ yesPrice: number; noPrice: number } | null> {
    try {
      const market = await this.getMarket(marketPk);
      if (!market) return null;

      // Get market odds/ladder
      const ladder = await this.client.markets.getMarketLadder(marketPk);
      
      // Monaco uses back/lay pricing
      // YES price = best back price for outcome 0
      // NO price = best back price for outcome 1
      
      // This is simplified - you may need to calculate from order book
      return {
        yesPrice: 0.5, // Calculate from ladder
        noPrice: 0.5,  // Calculate from ladder
      };
    } catch (error) {
      console.error(`Error fetching market prices for ${marketPk.toBase58()}:`, error);
      return null;
    }
  }

  /**
   * Get user positions across all markets
   */
  async getUserPositions(userPk: PublicKey): Promise<MonacoPosition[]> {
    try {
      const positions = await this.client.markets.getMarketPositionsForUser(userPk);
      
      return positions.data.marketPositions.map((pos: any) => ({
        marketPk: new PublicKey(pos.market),
        marketTitle: pos.marketTitle || '',
        outcomeIndex: pos.outcomeIndex,
        outcomeTitle: pos.outcomeTitle || '',
        matchedAmount: pos.matchedAmount || 0,
        pendingAmount: pos.pendingAmount || 0,
        availableAmount: pos.availableAmount || 0,
        averageMatchedPrice: pos.averageMatchedPrice || 0,
      }));
    } catch (error) {
      console.error(`Error fetching positions for ${userPk.toBase58()}:`, error);
      return [];
    }
  }

  /**
   * Get positions for a specific market
   */
  async getMarketPositions(userPk: PublicKey, marketPk: PublicKey): Promise<MonacoPosition[]> {
    const allPositions = await this.getUserPositions(userPk);
    return allPositions.filter(pos => pos.marketPk.equals(marketPk));
  }

  /**
   * Place a back order (buy YES)
   */
  async placeBackOrder(
    marketPk: PublicKey,
    outcomeIndex: number,
    stake: number,
    expectedPrice: number
  ): Promise<string> {
    try {
      const response = await this.client.orders.placeOrder({
        marketPk,
        outcomeIndex,
        forOutcome: true, // back = buying YES
        stake,
        expectedPrice,
        payer: this.wallet.publicKey,
      });

      return response.data.tnxSignature;
    } catch (error) {
      console.error('Error placing back order:', error);
      throw error;
    }
  }

  /**
   * Place a lay order (sell YES / buy NO)
   */
  async placeLayOrder(
    marketPk: PublicKey,
    outcomeIndex: number,
    stake: number,
    expectedPrice: number
  ): Promise<string> {
    try {
      const response = await this.client.orders.placeOrder({
        marketPk,
        outcomeIndex,
        forOutcome: false, // lay = selling YES / buying NO
        stake,
        expectedPrice,
        payer: this.wallet.publicKey,
      });

      return response.data.tnxSignature;
    } catch (error) {
      console.error('Error placing lay order:', error);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderPk: PublicKey): Promise<string> {
    try {
      const response = await this.client.orders.cancelOrder({
        orderPk,
        authority: this.wallet.publicKey,
      });

      return response.data.tnxSignature;
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  }

  /**
   * Parse Monaco transaction to extract trade information
   */
  async parseTransaction(txSignature: string): Promise<MonacoTrade | null> {
    try {
      const tx = await this.connection.getTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) return null;

      // Check if transaction involves Monaco program
      const accountKeys = tx.transaction.message.accountKeys;
      const monacoInvolved = accountKeys.some(
        (key: any) => key.pubkey?.toString() === MONACO_PROGRAM_ID.toBase58() ||
                      key.toString() === MONACO_PROGRAM_ID.toBase58()
      );

      if (!monacoInvolved) return null;

      // Parse instructions to extract trade data
      // Monaco uses specific instruction formats - you'll need to decode based on their structure
      const instructions = tx.transaction.message.instructions;

      for (const ix of instructions) {
        // Monaco order placement instruction structure
        // You'll need to decode the instruction data
        // This is a placeholder - implement based on Monaco's instruction format
        
        // Example structure (adjust based on actual Monaco format):
        // - Instruction discriminator
        // - Market public key
        // - Outcome index
        // - For outcome (bool)
        // - Stake amount
        // - Expected price
        
        // For now, return placeholder
        // You'll need to implement actual parsing based on Monaco SDK/docs
      }

      return null; // Placeholder
    } catch (error) {
      console.error(`Error parsing transaction ${txSignature}:`, error);
      return null;
    }
  }

  /**
   * Get program ID
   */
  getProgramId(): PublicKey {
    return MONACO_PROGRAM_ID;
  }
}

