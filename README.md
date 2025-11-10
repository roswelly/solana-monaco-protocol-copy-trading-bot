# Solana Prediction Market Copy Trading Bot MVP

A Node.js + TypeScript bot that monitors and copies trades from selected addresses on Solana prediction markets.

**Currently configured for Monaco Protocol** - A decentralized betting and prediction market platform on Solana.

## Architecture

**No smart contract needed for MVP** - This bot runs as a client-side application that:
- Monitors trades from target addresses
- Executes similar trades on your behalf
- Interacts with existing prediction market smart contracts (Monaco Protocol)

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

Edit `.env` file to configure:
- Target addresses to copy trades from
- Risk management parameters
- Prediction market program IDs (Monaco Protocol: `monacoUXKtUi6vKsQwaLyxmXKSievfNWEcYXTgkbCih`)
- Trade execution settings

See `MONACO_PROTOCOL_SETUP.md` for detailed Monaco Protocol setup instructions.

## Features (MVP)

- [ ] Monitor target addresses for trades
- [ ] Detect prediction market transactions
- [ ] Copy trades with configurable parameters
- [ ] Basic risk management
- [ ] Logging and monitoring

## Monaco Protocol Integration

This bot is configured for **Monaco Protocol**:
- **Program ID**: `monacoUXKtUi6vKsQwaLyxmXKSievfNWEcYXTgkbCih`
- **SDK**: `@monaco-protocol/client`
- **Website**: https://www.monacoprotocol.xyz/

See `MONACO_PROTOCOL_SETUP.md` for:
- Setup instructions
- Monaco Protocol concepts
- Transaction parsing details
- Testing guide

## Future Enhancements

- Multi-user support (would require smart contract)
- Advanced risk management
- Performance analytics
- Web dashboard
- Stop-loss/take-profit automation
- Support for other prediction market platforms

