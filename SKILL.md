# CrawlPay Skill — Pharos AI Agent Payment Infrastructure

## Capability Index

This Skill enables any AI agent to pay for paywalled web content using
EIP-3009 gasless USDC on Pharos Atlantic Testnet. Every fetch produces
a cryptographically signed receipt that feeds into Anvita Flow KYA
agent reputation.

| Agent intent | Phrase examples | Action |
|---|---|---|
| Fetch a paywalled URL | "get this article", "fetch this page", "read this URL" | `skill.fetch(url)` |
| Check agent reputation | "what is my reputation", "how many fetches have I done" | `skill.getReputation(contract, rpc)` |
| Set fetch budget | "limit my spending to $0.01" | `new CrawlPaySkill({ budget: 10000 })` |

## Quick Start

```typescript
import { CrawlPaySkill } from "@crawlpay/skill";

const skill = new CrawlPaySkill({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  facilitatorUrl: "https://your-facilitator.com",
  budget: 10000, // $0.01 max spend
});

// Fetch any URL — payment handled automatically
const { content, receipt } = await skill.fetch("https://medium.com/p/your-article");

console.log(content);        // article text
console.log(receipt.txHash); // on-chain proof on Pharos
```

## Protocol Flow

```
1. Agent calls skill.fetch(url)
2. Skill sends GET — publisher proxy returns 402 + x402v2 offer
3. Skill signs EIP-3009 TransferWithAuthorization (gasless, off-chain)
4. Skill submits to CrawlPayFacilitator.sol on Pharos Atlantic Testnet
5. Contract emits FetchAuthorized + ReputationUpdated events
6. Agent receives content + signed CrawlPayReceipt
7. Receipt feeds into Anvita Flow KYA reputation system
```

## On-Chain Contract

```
CrawlPayFacilitator: 0xc35C5df1F1cf18AeF636aB48bA8e6Dd00A795c1e
Network:             Pharos Atlantic Testnet (Chain ID 688689)
Explorer:            https://atlantic.pharosscan.xyz/address/0xc35C5df1F1cf18AeF636aB48bA8e6Dd00A795c1e
Deploy Tx:           0xd5c4ff459546e05645f2b0b31278cd0bf0e6949c15227279afb27bb947c1763d
```

### Contract Interface (KYA-compatible)

```solidity
// Settle a paid fetch
function settle(
    address agent,
    address publisher,
    bytes32 urlHash,
    uint256 amount,
    bytes32 nonce,
    uint256 timestamp,
    bytes calldata signature
) external;

// Query agent reputation — Anvita Flow KYA compatible
function getReputation(address agent)
    external view returns (
        uint256 fetchCount,
        uint256 totalSpent,
        uint256 firstSeen,
        uint256 lastSeen
    );

// Gate access by reputation threshold
function isVerifiedAgent(address agent, uint256 minFetches)
    external view returns (bool);
```

## Receipt Model

Every paid fetch produces a portable signed receipt:

```json
{
  "version": "1",
  "url": "https://medium.com/p/...",
  "urlHash": "0x...",
  "amount": "100",
  "currency": "USDC",
  "network": "pharosAtlantic",
  "chainId": 688689,
  "crawlerWallet": "0x...",
  "publisherWallet": "0x...",
  "facilitatorContract": "0xc35C5df1F1cf18AeF636aB48bA8e6Dd00A795c1e",
  "txHash": "0x...",
  "signature": "0x..."
}
```

## Publisher Integration

```typescript
import { crawlPayGate } from "@crawlpay/proxy-middleware";

app.use(crawlPayGate({
  publisherWallet: "0xYourWallet",
  facilitatorUrl: "https://your-facilitator.com",
  pricePerFetch: 100,
}));
```

## Anvita Flow KYA Integration

CrawlPayFacilitator emits ReputationUpdated on every fetch.
Any Anvita Flow KYA-compliant contract can query agent reputation:

```typescript
const rep = await skill.getReputation(
  "0xc35C5df1F1cf18AeF636aB48bA8e6Dd00A795c1e",
  "https://atlantic.dplabs-internal.com"
);
// rep.fetchCount — total paid fetches
// rep.totalSpent — total USDC spent (atomic)
// rep.firstSeen  — first fetch timestamp
// rep.lastSeen   — most recent fetch
```

## Live Demo

https://crawlpay-pharos.vercel.app

Paste any Medium article URL and click "Fetch as Agent" to see the
full protocol flow with real on-chain settlement on Pharos.

## References

- x402 Protocol: https://x402.org
- EIP-3009: https://eips.ethereum.org/EIPS/eip-3009
- Pharos Docs: https://docs.pharosnetwork.xyz
- Anvita Flow: https://flow.anvita.xyz
- Contract: https://atlantic.pharosscan.xyz/address/0xc35C5df1F1cf18AeF636aB48bA8e6Dd00A795c1e