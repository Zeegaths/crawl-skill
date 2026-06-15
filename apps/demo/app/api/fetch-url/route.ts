import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const PHAROS_RPC = process.env.PHAROS_RPC ?? "https://atlantic.dplabs-internal.com";
const FACILITATOR_ADDRESS = process.env.FACILITATOR_ADDRESS ?? "0xc35C5df1F1cf18AeF636aB48bA8e6Dd00A795c1e";
const FACILITATOR_PRIVATE_KEY = process.env.FACILITATOR_PRIVATE_KEY ?? "";
const PUBLISHER_WALLET = process.env.PUBLISHER_WALLET ?? "0xEc1C198468cA52bF17E7b148fDbE66c581015d74";
const CHAIN_ID = 688689;

const ABI = [
  "function settle(address agent, address publisher, bytes32 urlHash, uint256 amount, bytes32 nonce, uint256 timestamp, bytes calldata signature) external",
];

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") return NextResponse.json({ error: "url required" }, { status: 400 });
    try { new URL(url); } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }
    if (!FACILITATOR_PRIVATE_KEY) return NextResponse.json({ error: "No private key" }, { status: 500 });

    const provider = new ethers.JsonRpcProvider(PHAROS_RPC, {
      chainId: CHAIN_ID,
      name: "pharos-atlantic"
    }, { staticNetwork: true });

    const facilitatorWallet = new ethers.Wallet(FACILITATOR_PRIVATE_KEY, provider);
    const crawlerWallet = new ethers.Wallet(FACILITATOR_PRIVATE_KEY);

    const nonce = ethers.hexlify(ethers.randomBytes(32)) as `0x${string}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const amount = BigInt(100);
    const urlHash = ethers.keccak256(ethers.toUtf8Bytes(url + "\n" + timestamp)) as `0x${string}`;

    const settlementHash = ethers.solidityPackedKeccak256(
      ["address", "address", "bytes32", "uint256", "bytes32", "uint256", "uint256"],
      [crawlerWallet.address, PUBLISHER_WALLET, urlHash, amount, nonce, timestamp, CHAIN_ID]
    );
    const agentSignature = await crawlerWallet.signMessage(ethers.getBytes(settlementHash));

    const contract = new ethers.Contract(FACILITATOR_ADDRESS, ABI, facilitatorWallet);
    const tx = await contract.settle(
      crawlerWallet.address, PUBLISHER_WALLET, urlHash, amount, nonce, timestamp, agentSignature
    );
    const txReceipt = await tx.wait();
    const txHash = txReceipt.hash as `0x${string}`;

    const receiptBody = {
      amount: amount.toString(),
      authorizationNonce: nonce,
      chainId: CHAIN_ID,
      crawlerWallet: crawlerWallet.address,
      currency: "USDC",
      facilitatorContract: FACILITATOR_ADDRESS,
      facilitatorPubkey: facilitatorWallet.address,
      network: "pharosAtlantic",
      publisherWallet: PUBLISHER_WALLET,
      timestamp,
      txHash,
      url,
      urlHash,
      validBefore: timestamp + 604800,
      version: "1",
    };

    const canonical = JSON.stringify(receiptBody, Object.keys(receiptBody).sort());
    const hash = ethers.keccak256(ethers.toUtf8Bytes(canonical));
    const signature = await facilitatorWallet.signMessage(ethers.getBytes(hash));

    let articleText = "";
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "CrawlPay-Agent/1.0 (Pharos Skill Hackathon)" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) articleText = extractText(await res.text());
    } catch {
      articleText = "[Content proxy unavailable]";
    }

    return NextResponse.json({
      receipt: { ...receiptBody, signature },
      articleText: articleText || null,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}

function extractText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");
  const m = text.match(/<article[\s\S]*?<\/article>/i);
  if (m) text = m[0];
  return text.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 1200);
}
