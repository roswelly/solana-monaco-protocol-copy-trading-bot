# Solana Prediction Markets Guide

## Available Platforms

1. **Jupiter Prediction Market** (with Kalshi integration)
   - Program ID: TBD (check Jupiter docs)
   - Website: https://jup.ag
   
2. **Solymarkets**
   - Program ID: TBD (check their docs)
   - Website: https://soly.markets

3. **PrismBet**
   - Program ID: TBD (check their docs)
   - Website: https://prismbet.net

## How Binary Positions Work

Binary positions are YES/NO shares on events:
- **YES shares**: Worth $1.00 if event happens, $0.00 if it doesn't
- **NO shares**: Worth $1.00 if event doesn't happen, $0.00 if it does
- **Price**: Reflects probability (e.g., 0.65 = 65% chance)
- **Settlement**: When event resolves, winning shares = $1.00, losing = $0.00

## Finding Markets

1. **Via Platform APIs/Websites**: Most platforms have APIs or web interfaces
2. **On-chain**: Query program accounts to find market accounts
3. **Event Listeners**: Monitor for new market creation events

## Getting Your Positions

1. **Query Position Accounts**: Each position is stored in a PDA (Program Derived Address)
2. **Check Token Balances**: Some platforms use SPL tokens for YES/NO shares
3. **Query Market State**: Get current prices and your holdings

## Executing Trades

1. **Build Instruction**: Create buy/sell instruction for the platform
2. **Include Accounts**: Market, outcome, position accounts, etc.
3. **Transfer Payment**: Send SOL/tokens to cover the trade
4. **Sign & Send**: Execute transaction

