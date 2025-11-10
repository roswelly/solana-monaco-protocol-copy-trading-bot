# Monaco Protocol Copy Trading Bot Setup

## Overview

This bot is configured to work with **Monaco Protocol**, a decentralized betting and prediction market platform on Solana.

- **Program ID**: `monacoUXKtUi6vKsQwaLyxmXKSievfNWEcYXTgkbCih`
- **Website**: https://www.monacoprotocol.xyz/
- **SDK**: `@monaco-protocol/client`
- **Documentation**: https://github.com/MonacoProtocol/sdk

## Monaco Protocol Features

- **Global liquidity pool** for betting markets
- **No restrictions** on winners
- **1% commission fees**
- **No KYC required**
- **Permissionless** trading

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `@monaco-protocol/client` - Monaco Protocol SDK
- `@solana/web3.js` - Solana blockchain interaction
- Other required dependencies

### 2. Configure Environment

Create a `.env` file:

```env
# Solana RPC URL (use a private RPC for better performance)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# Your wallet private key (base58 encoded JSON array)
PRIVATE_KEY=[YOUR_PRIVATE_KEY]

# Monaco Protocol program ID (already configured)
PREDICTION_MARKET_PROGRAMS=monacoUXKtUi6vKsQwaLyxmXKSievfNWEcYXTgkbCih

# Addresses to copy trades from (comma-separated)
TARGET_ADDRESSES=Address1,Address2,Address3

# Risk management
MAX_POSITION_SIZE=1.0
MAX_DAILY_LOSS=5.0
COPY_MULTIPLIER=1.0

# Monitoring interval (milliseconds)
POLL_INTERVAL=5000
```

### 3. Understanding Monaco Protocol

#### Market Structure
- Markets have **binary outcomes** (YES/NO)
- Each market has **outcomes** (typically 2: For/Against)
- **Back orders** = Buying YES (betting for outcome)
- **Lay orders** = Selling YES / Buying NO (betting against outcome)

#### Order Types
- **Back**: Betting FOR an outcome (buying YES)
- **Lay**: Betting AGAINST an outcome (selling YES / buying NO)

#### Prices
- Prices range from **0.00 to 1.00** (probability)
- YES at $0.65 = 65% chance event happens
- NO at $0.35 = 35% chance event doesn't happen

## How the Bot Works

1. **Monitors** target addresses for Monaco Protocol transactions
2. **Parses** transactions to extract:
   - Market address
   - Outcome (YES/NO)
   - Order type (back/lay)
   - Stake amount
   - Expected price
3. **Executes** copy trades using Monaco Protocol SDK
4. **Manages** risk with position limits and daily loss caps

## Monaco Protocol Integration Files

- `src/prediction-markets/monaco-protocol.ts` - Monaco client wrapper
- `src/prediction-markets/monaco-position-manager.ts` - Position management
- `src/prediction-markets/monaco-transaction-parser.ts` - Transaction parsing

## Testing

### 1. Test on Devnet First

Before using real funds, test on Solana devnet:

```typescript
// Update RPC URL to devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### 2. Find Test Markets

Use Monaco SDK to find active markets:

```typescript
import { MonacoProtocolIntegration } from './prediction-markets/monaco-protocol';

const monaco = new MonacoProtocolIntegration(connection, wallet);
const markets = await monaco.getActiveMarkets();
console.log('Active markets:', markets);
```

### 3. Test Copy Trading

1. Find a target address that trades on Monaco
2. Add it to `TARGET_ADDRESSES` in `.env`
3. Run the bot: `npm run dev`
4. Monitor logs for detected trades

## Important Notes

### Transaction Parsing

The transaction parser (`monaco-transaction-parser.ts`) currently has placeholder logic. You may need to:

1. **Inspect real Monaco transactions** on Solana Explorer
2. **Decode instruction data** based on Monaco's instruction format
3. **Update the parser** with actual instruction structure

### Monaco SDK Documentation

Refer to Monaco Protocol SDK examples:
- GitHub: https://github.com/MonacoProtocol/sdk
- Examples: https://github.com/MonacoProtocol/sdk-examples

### Order Execution

Monaco uses an order book system:
- Orders may not fill immediately
- Prices can move between order placement and execution
- Consider using limit orders with price tolerance

## Troubleshooting

### "Monaco position manager not initialized"
- Ensure `PREDICTION_MARKET_PROGRAMS` includes Monaco program ID
- Check that program ID is correct: `monacoUXKtUi6vKsQwaLyxmXKSievfNWEcYXTgkbCih`

### "Could not parse trade from transaction"
- Transaction parser may need updates for Monaco's instruction format
- Inspect transaction on Solana Explorer to understand structure
- Update `monaco-transaction-parser.ts` accordingly

### "Error placing order"
- Check wallet has sufficient SOL for stake + fees
- Verify market is still open
- Check expected price is within valid range (0-1)

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Configure `.env` file
3. ⚠️ **Update transaction parser** with Monaco's actual instruction format
4. ⚠️ **Test on devnet** with small amounts
5. ⚠️ **Monitor and refine** copy trading logic

## Resources

- Monaco Protocol: https://www.monacoprotocol.xyz/
- Monaco SDK: https://github.com/MonacoProtocol/sdk
- Solana Explorer: https://explorer.solana.com
- Monaco Program: https://explorer.solana.com/address/monacoUXKtUi6vKsQwaLyxmXKSievfNWEcYXTgkbCih

