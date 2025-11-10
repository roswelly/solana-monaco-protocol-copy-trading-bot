import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { MonacoProtocolIntegration, MonacoMarket, MonacoPosition } from './monaco-protocol';

export interface Position {
  marketId: string;
  outcome: 'YES' | 'NO';
  shares: number;
  averagePrice: number;
  currentValue: number;
  unrealizedPnl: number;
}

export interface MarketPrices {
  yesPrice: number;
  noPrice: number;
  timestamp: Date;
}

export class MonacoPositionManager {
  private monaco: MonacoProtocolIntegration;

  constructor(connection: Connection, wallet: Keypair) {
    this.monaco = new MonacoProtocolIntegration(connection, wallet);
  }

  async getAllPositions(userAddress: PublicKey): Promise<Position[]> {
    const monacoPositions = await this.monaco.getUserPositions(userAddress);
    
    return monacoPositions.map(pos => {
      const outcome: 'YES' | 'NO' = pos.outcomeIndex === 0 ? 'YES' : 'NO';
      const shares = pos.matchedAmount + pos.pendingAmount;
      
      return {
        marketId: pos.marketPk.toBase58(),
        outcome,
        shares,
        averagePrice: pos.averageMatchedPrice,
        currentValue: shares * pos.averageMatchedPrice,
        unrealizedPnl: 0,
      };
    });
  }

  async getMarketPositions(
    userAddress: PublicKey,
    marketAddress: PublicKey
  ): Promise<{ yes: Position | null; no: Position | null }> {
    const positions = await this.monaco.getMarketPositions(userAddress, marketAddress);
    
    const yesPos = positions.find(p => p.outcomeIndex === 0);
    const noPos = positions.find(p => p.outcomeIndex === 1);

    return {
      yes: yesPos ? {
        marketId: yesPos.marketPk.toBase58(),
        outcome: 'YES',
        shares: yesPos.matchedAmount + yesPos.pendingAmount,
        averagePrice: yesPos.averageMatchedPrice,
        currentValue: (yesPos.matchedAmount + yesPos.pendingAmount) * yesPos.averageMatchedPrice,
        unrealizedPnl: 0,
      } : null,
      no: noPos ? {
        marketId: noPos.marketPk.toBase58(),
        outcome: 'NO',
        shares: noPos.matchedAmount + noPos.pendingAmount,
        averagePrice: noPos.averageMatchedPrice,
        currentValue: (noPos.matchedAmount + noPos.pendingAmount) * noPos.averageMatchedPrice,
        unrealizedPnl: 0,
      } : null,
    };
  }

  async getMarketPrices(marketAddress: PublicKey): Promise<MarketPrices> {
    const prices = await this.monaco.getMarketPrices(marketAddress);
    
    if (!prices) {
      return {
        yesPrice: 0.5,
        noPrice: 0.5,
        timestamp: new Date(),
      };
    }

    return {
      yesPrice: prices.yesPrice,
      noPrice: prices.noPrice,
      timestamp: new Date(),
    };
  }

  async buyYesShares(
    marketAddress: PublicKey,
    amount: number,
    maxPrice?: number
  ): Promise<string> {
    const expectedPrice = maxPrice || 0.99;
    return await this.monaco.placeBackOrder(marketAddress, 0, amount, expectedPrice);
  }

  async buyNoShares(
    marketAddress: PublicKey,
    amount: number,
    maxPrice?: number
  ): Promise<string> {
    const expectedPrice = maxPrice || 0.99;
    return await this.monaco.placeLayOrder(marketAddress, 0, amount, expectedPrice);
  }

  async sellYesShares(
    marketAddress: PublicKey,
    shares: number,
    minPrice?: number
  ): Promise<string> {
    const expectedPrice = minPrice || 0.01;
    return await this.monaco.placeLayOrder(marketAddress, 0, shares, expectedPrice);
  }

  async sellNoShares(
    marketAddress: PublicKey,
    shares: number,
    minPrice?: number
  ): Promise<string> {
    const expectedPrice = minPrice || 0.01;
    return await this.monaco.placeBackOrder(marketAddress, 0, shares, expectedPrice);
  }

  getMonacoClient(): MonacoProtocolIntegration {
    return this.monaco;
  }
}

