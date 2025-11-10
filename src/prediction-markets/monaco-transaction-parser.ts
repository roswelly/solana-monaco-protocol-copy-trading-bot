import { Connection, PublicKey } from '@solana/web3.js';
import { MONACO_PROGRAM_ID, MonacoTrade } from './monaco-protocol';

export interface ParsedMonacoTrade {
  marketPk: PublicKey;
  outcomeIndex: number;
  forOutcome: boolean;
  stake: number;
  expectedPrice: number;
  orderType: 'back' | 'lay';
}

export class MonacoTransactionParser {
  constructor(private connection: Connection) {}

  isMonacoTransaction(tx: any): boolean {
    if (!tx || !tx.transaction || !tx.transaction.message) {
      return false;
    }

    const accountKeys = tx.transaction.message.accountKeys;
    const monacoProgramId = MONACO_PROGRAM_ID.toBase58();

    return accountKeys.some((key: any) => {
      const keyStr = key.pubkey?.toString() || key.toString();
      return keyStr === monacoProgramId;
    });
  }

  async parseTransaction(txSignature: string): Promise<ParsedMonacoTrade | null> {
    try {
      const tx = await this.connection.getTransaction(txSignature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !this.isMonacoTransaction(tx)) {
        return null;
      }

      const instructions = tx.transaction.message.instructions;
      const accountKeys = tx.transaction.message.accountKeys;

      for (const ix of instructions) {
        const programIdIndex = typeof ix.programIdIndex === 'number' 
          ? ix.programIdIndex 
          : accountKeys.findIndex((k: any) => 
              (k.pubkey?.toString() || k.toString()) === MONACO_PROGRAM_ID.toBase58()
            );

        if (programIdIndex === -1) continue;

        try {
          const marketIndex = ix.accounts?.[0] || 0;
          const marketPk = accountKeys[marketIndex]?.pubkey || accountKeys[marketIndex];

          if (!marketPk) continue;

          return {
            marketPk: new PublicKey(marketPk),
            outcomeIndex: 0,
            forOutcome: true,
            stake: 0.1,
            expectedPrice: 0.5,
            orderType: 'back',
          };
        } catch (error) {
          console.error('Error parsing Monaco instruction:', error);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error(`Error parsing Monaco transaction ${txSignature}:`, error);
      return null;
    }
  }

  convertToStandardTrade(parsed: ParsedMonacoTrade): MonacoTrade {
    return {
      marketPk: parsed.marketPk,
      outcomeIndex: parsed.outcomeIndex,
      forOutcome: parsed.forOutcome,
      stake: parsed.stake,
      expectedPrice: parsed.expectedPrice,
      orderType: parsed.orderType,
    };
  }
}

