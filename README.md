# CrawlPay — Pay-per-fetch for AI Agents on Pharos

[![License: Apache 2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Pharos Atlantic Testnet](https://img.shields.io/badge/Pharos-Atlantic%20Testnet-00D4FF)](https://atlantic.pharosscan.xyz)

Open-source pay-per-fetch infrastructure for the AI Agent economy. Publishers gate URLs behind a `402 Payment Required`; AI agents pay $0.0001 USDC per fetch using EIP-3009 gasless authorizations settled on **Pharos Atlantic Testnet**. Every fetch produces a portable signed receipt that feeds into **Anvita Flow KYA agent reputation**.

Built for the **Pharos x Anvita Flow Skill-to-Agent Dual Cascade Hackathon 2026**.

## Live Demo

**https://crawlpay-pharos.vercel.app**

Paste any Medium article URL and click "Fetch as Agent" to see the full x402 payment flow with real on-chain settlement on Pharos.

## Deployed Contract

```
CrawlPayFacilitator: 0xc35C5df1F1cf18AeF636aB48bA8e6Dd00A795c1e
Network:             Pharos Atlantic Testnet (Chain ID 688689)
Deploy Tx:           0xd5c4ff459546e05645f2b0b31278cd0bf0e6949c15227279afb27bb947c1763d
Explorer:            https://atlantic.pharosscan.xyz/address/0xc35C5df1F1cf18AeF636aB48bA8e6Dd00A795c1e
```

## The Problem

AI agents crawl the web but publishers earn nothing. Ads don't work on bots. Subscriptions don't scale to millions of agents. Stripe's $0.30 minimum makes sub-cent pricing impossible. There is no economic layer between AI and content.

## The Solution

CrawlPay makes $0.0001 per-fetch pricing viable:

- **EIP-3009** — agent signs gasless USDC authorization off-chain. No gas, no transaction submitted.
- **CrawlPayFacilitator.sol on Pharos** — verifies signature, records on-chain reputation, emits events.
- **Anvita Flow KYA** — every receipt feeds the agent's on-chain reputation. Publishers can gate premium content to verified agents.

## Protocol Flow

```
1. Agent calls skill.fetch(url)
2. Publisher proxy returns 402 + x402v2 offer ($0.0001 USDC)
3. Agent signs EIP-3009 authorization (gasless, off-chain)
4. Facilitator calls CrawlPayFacilitator.sol on Pharos
5. Contract emits FetchAuthorized + ReputationUpdated
6. Agent receives content + signed CrawlPayReceipt
7. Receipt feeds Anvita Flow KYA reputation
```

## Agent Integration

```typescript
import { CrawlPaySkill } from "@crawlpay/skill";

const skill = new CrawlPaySkill({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  facilitatorUrl: "https://your-facilitator.com",
  budget: 10000,
});

const { content, receipt } = await skill.fetch("https://example.com/article");
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

## Repository Structure

```
crawlpay-pharos/
├── contracts/
│   ├── src/CrawlPayFacilitator.sol
│   └── script/Deploy.s.sol
├── packages/
│   ├── skill/
│   ├── proxy-middleware/
│   ├── types/
│   └── receipt-signer/
├── apps/
│   └── demo/
└── SKILL.md
```

## Contract Interface

```solidity
function settle(
    address agent,
    address publisher,
    bytes32 urlHash,
    uint256 amount,
    bytes32 nonce,
    uint256 timestamp,
    bytes calldata signature
) external;

function getReputation(address agent)
    external view returns (
        uint256 fetchCount,
        uint256 totalSpent,
        uint256 firstSeen,
        uint256 lastSeen
    );

function isVerifiedAgent(address agent, uint256 minFetches)
    external view returns (bool);
```

## Anvita Flow KYA Connection

Every `settle()` call records the agent's fetch count and total USDC spent on-chain and emits `ReputationUpdated`. Publishers can gate premium content to verified agents using `isVerifiedAgent()`.

## Phase 2 Roadmap

Browser extension agent — intercepts 402 responses in any browser tab, signs via MetaMask, settles on Pharos, builds KYA reputation on Anvita Flow. Zero publisher integration required.

## Tech Stack

| Layer | Tools |
|---|---|
| Blockchain | Pharos Atlantic Testnet (Chain ID 688689) |
| Smart Contract | Solidity 0.8.24, Foundry |
| Payment Protocol | x402 v2, EIP-3009 |
| Agent SDK | TypeScript, ethers.js v6 |
| Demo | Next.js 15, Tailwind CSS |

## References

- x402 Protocol: https://x402.org
- EIP-3009: https://eips.ethereum.org/EIPS/eip-3009
- Pharos Docs: https://docs.pharosnetwork.xyz
- Anvita Flow: https://flow.anvita.xyz
- Contract: https://atlantic.pharosscan.xyz/address/0xc35C5df1F1cf18AeF636aB48bA8e6Dd00A795c1e

## License

Apache License 2.0