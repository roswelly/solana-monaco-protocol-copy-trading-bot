# How to Find Prediction Market Program IDs on Solana

## Method 1: Platform Documentation

Check the official documentation for each platform:
- **Jupiter**: https://docs.jup.ag
- **Solymarkets**: Check their docs/website
- **PrismBet**: Check their docs/website

## Method 2: On-Chain Analysis

### Using Solana Explorer

1. Go to https://explorer.solana.com
2. Search for known market addresses
3. Look at the "Program" field in transaction details
4. This shows the program ID that created the market

### Using Solscan

1. Go to https://solscan.io
2. Search for a market transaction
3. View transaction details
4. Find the program ID in the instruction list

## Method 3: Transaction History

If you know a market address or a user who has traded:

```typescript
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');
const marketAddress = new PublicKey('MARKET_ADDRESS_HERE');

// Get recent transactions
const signatures = await connection.getSignaturesForAddress(marketAddress, { limit: 10 });

// Get transaction details
for (const sig of signatures) {
  const tx = await connection.getTransaction(sig.signature, {
    maxSupportedTransactionVersion: 0,
  });
  
  // Find program IDs in the transaction
  if (tx) {
    const programIds = tx.transaction.message.accountKeys
      .filter(key => key.signer === false && key.writable === false)
      .map(key => key.pubkey.toString());
    
    console.log('Program IDs:', programIds);
  }
}
```

## Method 4: Program Account Search

```typescript
// Search for accounts owned by unknown program
// This is more exploratory
const accounts = await connection.getProgramAccounts(
  new PublicKey('UNKNOWN_PROGRAM_ID'),
  {
    filters: [
      { dataSize: 256 }, // Adjust size based on what you're looking for
    ],
  }
);
```

## Method 5: Platform APIs

Many platforms expose their program IDs via APIs:

```typescript
// Example: Query platform API
const response = await fetch('https://api.platform.com/info');
const data = await response.json();
console.log('Program ID:', data.programId);
```

## Method 6: GitHub/Source Code

Check if the platform is open source:
- Look for their GitHub repository
- Program IDs are often in constants or config files
- Example: `PROGRAM_ID = new PublicKey('...')`

## Method 7: Discord/Community

- Join the platform's Discord
- Ask in their developer channel
- Check pinned messages or docs

## Common Program ID Locations

Once you have a program ID, you can:
1. View it on Solana Explorer: `https://explorer.solana.com/address/{PROGRAM_ID}`
2. See all accounts it owns
3. View recent transactions
4. Analyze the program's structure

## Example: Finding Jupiter Prediction Market Program

```bash
# 1. Search for "Jupiter prediction market" transactions
# 2. Look at transaction details
# 3. Find the program ID in the instruction
# 4. Verify it's the correct program by checking account structure
```

## Next Steps After Finding Program ID

1. **Get Program Accounts**: See what accounts the program owns
2. **Analyze Account Structure**: Understand how markets are stored
3. **Decode Instructions**: Understand the instruction format
4. **Build Integration**: Create your bot's interaction logic

