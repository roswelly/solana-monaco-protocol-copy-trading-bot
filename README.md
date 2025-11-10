# Solana Prediction Market Copy Trading Bot MVP

A Node.js + TypeScript bot that monitors and copies trades from selected addresses on Solana prediction markets.

## Architecture

**No smart contract needed for MVP** - This bot runs as a client-side application that:
- Monitors trades from target addresses
- Executes similar trades on your behalf
- Interacts with existing prediction market smart contracts

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Or use a private RPC like Helius, QuickNode, etc.
PRIVATE_KEY=your_wallet_private_key_base58
# Or use a keypair file path
```

3. Run the bot:
```bash
npm run dev
```

## Configuration

Edit `src/config.ts` to configure:
- Target addresses to copy trades from
- Risk management parameters
- Prediction market program IDs
- Trade execution settings

## Features (MVP)

- [ ] Monitor target addresses for trades
- [ ] Detect prediction market transactions
- [ ] Copy trades with configurable parameters
- [ ] Basic risk management
- [ ] Logging and monitoring

## Future Enhancements

- Multi-user support (would require smart contract)
- Advanced risk management
- Performance analytics
- Web dashboard
- Stop-loss/take-profit automation

