# Getting Started: Binary Positions on Solana Prediction Markets

## Overview

Binary positions on Solana prediction markets are **YES/NO shares** on events. For example:
- "Will BTC hit $100k by Dec 2024?" → Buy YES or NO shares
- "Will Trump win 2024 election?" → Buy YES or NO shares

## How It Works

1. **Markets**: Each event has a market with YES and NO shares
2. **Prices**: Share prices reflect probability (0.00 - 1.00)
   - YES at $0.65 = 65% chance event happens
   - NO at $0.35 = 35% chance event doesn't happen
3. **Settlement**: When event resolves:
   - Winning shares = $1.00 each
   - Losing shares = $0.00 each

## Step 1: Find Prediction Market Platforms

Available platforms on Solana:
- **Jupiter Prediction Market** (with Kalshi)
- **Solymarkets**
- **PrismBet**

## Step 2: Get Program IDs

Each platform has a Solana program ID. You need this to interact with them.

**Methods to find program IDs:**
1. Check platform documentation
2. Use Solana Explorer to inspect market transactions
3. See `src/prediction-markets/how-to-find-program-ids.md` for detailed guide

**Quick method:**
```typescript
// Find program ID from a known market transaction
const tx = await connection.getTransaction('TRANSACTION_SIGNATURE');
// Look at tx.transaction.message.accountKeys for program IDs
```

## Step 3: Find Markets

### Option A: Platform API (Easiest)
Many platforms provide REST APIs:
```typescript
const response = await fetch('https://api.platform.com/markets');
const markets = await response.json();
```

### Option B: On-Chain Query
```typescript
import { MarketFinder } from './prediction-markets/market-finder';

const finder = new MarketFinder(connection, programId);
const markets = await finder.findAllMarkets();
```

## Step 4: Get Your Positions

### If Platform Uses SPL Tokens:
```typescript
// YES/NO shares are SPL tokens
const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
  wallet.publicKey,
  { programId: TOKEN_PROGRAM_ID }
);
// Filter for prediction market tokens
```

### If Platform Uses PDAs:
```typescript
// Positions stored in Program Derived Addresses
import { PositionManager } from './prediction-markets/position-manager';

const manager = new PositionManager(connection, wallet, programId);
const positions = await manager.getAllPositions(wallet.publicKey);
```

## Step 5: Execute Trades

```typescript
const positionManager = new PositionManager(connection, wallet, programId);

// Buy YES shares
await positionManager.buyYesShares(marketAddress, 0.1); // 0.1 SOL

// Buy NO shares
await positionManager.buyNoShares(marketAddress, 0.1);

// Sell shares
await positionManager.sellYesShares(marketAddress, 100); // 100 shares
```

## Step 6: Get Market Prices

```typescript
const prices = await positionManager.getMarketPrices(marketAddress);
console.log(`YES: $${prices.yesPrice}, NO: $${prices.noPrice}`);
```

## Implementation Checklist

- [ ] Find program ID for your chosen platform
- [ ] Understand their account structure (SPL tokens vs PDAs)
- [ ] Implement transaction parsing (see `src/bot.ts` for template)
- [ ] Test on devnet first
- [ ] Add to your copy trading bot

## Platform-Specific Notes

### Jupiter Prediction Market
- Integrated with Kalshi
- Check Jupiter docs for program ID and SDK

### Solymarkets
- Check their website/docs for program ID
- May have API available

### PrismBet
- Check their docs for integration details

## Next Steps

1. **Choose a platform** and get their program ID
2. **Study their transaction structure** by inspecting real transactions
3. **Implement parsing** in `parsePredictionMarketTransaction()` in `src/bot.ts`
4. **Implement trade execution** in `PositionManager` methods
5. **Test on devnet** before using real funds

## Resources

- `src/prediction-markets/` - Utility classes for markets and positions
- `src/prediction-markets/how-to-find-program-ids.md` - Guide to finding program IDs
- `src/prediction-markets/jupiter-example.ts` - Example integration

