import { ethers } from "ethers";

export interface CrawlPaySkillOptions {
  privateKey: string;
  facilitatorUrl: string;
  budget?: number; // max USDC in atomic units (default 10000 = $0.01)
}

export interface FetchResult {
  content: string;
  receipt: CrawlPayReceipt;
  status: number;
}

export interface CrawlPayReceipt {
  version: string;
  url: string;
  urlHash: string;
  amount: string;
  currency: string;
  network: string;
  chainId: number;
  crawlerWallet: string;
  publisherWallet: string;
  facilitatorContract: string;
  timestamp: number;
  txHash: string;
  signature: string;
}

interface X402Offer {
  x402Version: number;
  accepts: Array<{
    scheme: string;
    network: string;
    maxAmountRequired: string;
    payTo: string;
    asset: string;
  }>;
}

const CHAIN_ID = 688689;

/**
 * CrawlPaySkill — reusable Pharos Skill for AI agents.
 *
 * Drop this into any agent to enable automatic payment for
 * paywalled URLs using EIP-3009 gasless USDC on Pharos.
 *
 * Compatible with Anvita Flow agent framework.
 * Every fetch emits a KYA-compatible reputation signal on-chain.
 *
 * @example
 * const skill = new CrawlPaySkill({ privateKey: "0x...", facilitatorUrl: "https://..." });
 * const { content, receipt } = await skill.fetch("https://example.com/article");
 */
export class CrawlPaySkill {
  private wallet: ethers.Wallet;
  private facilitatorUrl: string;
  private budget: number;
  private spent: number = 0;

  constructor(options: CrawlPaySkillOptions) {
    this.wallet = new ethers.Wallet(options.privateKey);
    this.facilitatorUrl = options.facilitatorUrl.replace(/\/$/, "");
    this.budget = options.budget ?? 10000;
  }

  get agentAddress(): string {
    return this.wallet.address;
  }

  get totalSpent(): number {
    return this.spent;
  }

  /**
   * Fetch a URL, automatically handling 402 payment if required.
   * If the URL is free, returns content directly.
   * If the URL requires payment, signs EIP-3009 auth and settles on Pharos.
   */
  async fetch(url: string, options?: RequestInit): Promise<FetchResult> {
    // Step 1: Try fetching without payment
    const probe = await globalThis.fetch(url, {
      ...options,
      headers: {
        ...options?.headers,
        "User-Agent": `CrawlPay-Agent/1.0 (wallet=${this.wallet.address})`,
      },
    });

    // Free content — return directly
    if (probe.ok) {
      return {
        content: await probe.text(),
        receipt: this._freeReceipt(url),
        status: probe.status,
      };
    }

    // Not a paywall — throw
    if (probe.status !== 402) {
      throw new Error(`HTTP ${probe.status} from ${url}`);
    }

    // Step 2: Parse x402 offer
    const offer: X402Offer = await probe.json();
    const option = offer.accepts?.[0];
    if (!option) throw new Error("No payment option in x402 offer");

    const amount = BigInt(option.maxAmountRequired);

    // Budget check
    if (this.spent + Number(amount) > this.budget) {
      throw new Error(`Budget exceeded: spent=${this.spent} budget=${this.budget}`);
    }

    // Step 3: Build and sign EIP-3009 authorization
    const nonce = ethers.hexlify(ethers.randomBytes(32));
    const timestamp = Math.floor(Date.now() / 1000);
    const urlHash = ethers.keccak256(ethers.toUtf8Bytes(url + "\n" + timestamp));

    const settlementHash = ethers.solidityPackedKeccak256(
      ["address", "address", "bytes32", "uint256", "bytes32", "uint256", "uint256"],
      [this.wallet.address, option.payTo, urlHash, amount, nonce, timestamp, CHAIN_ID]
    );
    const signature = await this.wallet.signMessage(ethers.getBytes(settlementHash));

    // Step 4: Submit to facilitator
    const settleRes = await globalThis.fetch(`${this.facilitatorUrl}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        agent: this.wallet.address,
        publisher: option.payTo,
        amount: amount.toString(),
        nonce,
        timestamp,
        urlHash,
        signature,
      }),
    });

    if (!settleRes.ok) {
      const err = await settleRes.text();
      throw new Error(`Facilitator error: ${err}`);
    }

    const { receipt, content } = await settleRes.json();

    // Update budget tracking
    this.spent += Number(amount);

    return { content, receipt, status: 200 };
  }

  /**
   * Query this agent's on-chain reputation from CrawlPayFacilitator.
   * Returns fetchCount and totalSpent — compatible with Anvita Flow KYA.
   */
  async getReputation(facilitatorContract: string, rpcUrl: string): Promise<{
    fetchCount: bigint;
    totalSpent: bigint;
    firstSeen: bigint;
    lastSeen: bigint;
  }> {
    const provider = new ethers.JsonRpcProvider(rpcUrl, { chainId: CHAIN_ID, name: "pharos-atlantic" }, { staticNetwork: true });
    const contract = new ethers.Contract(
      facilitatorContract,
      ["function getReputation(address) view returns (uint256,uint256,uint256,uint256)"],
      provider
    );
    const [fetchCount, totalSpent, firstSeen, lastSeen] = await contract.getReputation(this.wallet.address);
    return { fetchCount, totalSpent, firstSeen, lastSeen };
  }

  private _freeReceipt(url: string): CrawlPayReceipt {
    return {
      version: "1",
      url,
      urlHash: "",
      amount: "0",
      currency: "USDC",
      network: "pharosAtlantic",
      chainId: CHAIN_ID,
      crawlerWallet: this.wallet.address,
      publisherWallet: "",
      facilitatorContract: "",
      timestamp: Math.floor(Date.now() / 1000),
      txHash: "",
      signature: "",
    };
  }
}

// Named export for tree-shaking
export default CrawlPaySkill;
