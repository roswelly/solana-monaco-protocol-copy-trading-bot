import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { MonacoProtocolClient } from '@monaco-protocol/client';

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
  outcomeIndex: number;
  outcomeTitle: string;
  matchedAmount: number;
  pendingAmount: number;
  availableAmount: number;
  averageMatchedPrice: number;
}

export interface MonacoTrade {
  marketPk: PublicKey;
  outcomeIndex: number;
  forOutcome: boolean;
  stake: number;
  expectedPrice: number;
  orderType: 'back' | 'lay';
}

export class MonacoProtocolIntegration {
  private client: MonacoProtocolClient;
  private connection: Connection;
  private wallet: Keypair;

  constructor(connection: Connection, wallet: Keypair) {
    this.connection = connection;
    this.wallet = wallet;
    this.client = new MonacoProtocolClient(connection, MONACO_PROGRAM_ID);
  }

  async getActiveMarkets(): Promise<MonacoMarket[]> {
    try {
      const markets = await this.client.markets.getMarkets({
        status: 'open',
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

  async getMarketPrices(marketPk: PublicKey): Promise<{ yesPrice: number; noPrice: number } | null> {
    try {
      const market = await this.getMarket(marketPk);
      if (!market) return null;

      const ladder = await this.client.markets.getMarketLadder(marketPk);
      
      return {
        yesPrice: 0.5,
        noPrice: 0.5,
      };
    } catch (error) {
      console.error(`Error fetching market prices for ${marketPk.toBase58()}:`, error);
      return null;
    }
  }

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

  async getMarketPositions(userPk: PublicKey, marketPk: PublicKey): Promise<MonacoPosition[]> {
    const allPositions = await this.getUserPositions(userPk);
    return allPositions.filter(pos => pos.marketPk.equals(marketPk));
  }

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
        forOutcome: true,
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
        forOutcome: false,
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

  async parseTransaction(txSignature: string): Promise<MonacoTrade | null> {
    try {
      const tx = await this.connection.getTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) return null;

      const accountKeys = tx.transaction.message.accountKeys;
      const monacoInvolved = accountKeys.some(
        (key: any) => key.pubkey?.toString() === MONACO_PROGRAM_ID.toBase58() ||
                      key.toString() === MONACO_PROGRAM_ID.toBase58()
      );

      if (!monacoInvolved) return null;

      const instructions = tx.transaction.message.instructions;

      for (const ix of instructions) {
      }

      return null;
    } catch (error) {
      console.error(`Error parsing transaction ${txSignature}:`, error);
      return null;
    }
  }

  getProgramId(): PublicKey {
    return MONACO_PROGRAM_ID;
  }
}

