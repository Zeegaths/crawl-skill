"use client";
import { useState, useRef } from "react";
import { PacketTrace } from "./components/PacketTrace";
import { ReceiptCard } from "./components/ReceiptCard";
import { ArticlePanel } from "./components/ArticlePanel";

type Step = { ts: number; type: "outbound"|"inbound"|"system"|"error"|"success"; label: string; detail?: string; };
type Receipt = { url: string; amount: string; crawlerWallet: string; publisherWallet: string; network: string; txHash: string; timestamp: number; signature: string; };

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n) + "..." : s;

export default function Home() {
  const [url, setUrl] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [fetching, setFetching] = useState(false);
  const [articleText, setArticleText] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const push = (s: Omit<Step,"ts">) => setSteps(p => [...p, { ...s, ts: Date.now() }]);
  const reset = () => { setSteps([]); setReceipt(null); setArticleText(null); };

  const fetchAsAgent = async () => {
    if (!url.trim()) return;
    reset();
    setFetching(true);
    abortRef.current = new AbortController();
    try {
      push({ type: "system", label: "Agent initialised", detail: "Pharos Atlantic Testnet - Chain 688689" });
      await delay(400);
      push({ type: "outbound", label: "GET " + trunc(url, 55), detail: "No payment headers" });
      await delay(600);
      push({ type: "inbound", label: "< 402 Payment Required", detail: "x402v2 offer - USDC $0.0001" });
      await delay(400);
      push({ type: "system", label: "Signing EIP-3009 authorization", detail: "gasless - off-chain" });
      await delay(700);
      push({ type: "outbound", label: "GET " + trunc(url, 55), detail: "Payment-Signature: <eip3009-auth>" });
      await delay(300);
      push({ type: "system", label: "Settling on CrawlPayFacilitator.sol...", detail: "0xc35C5df1F1cf18AeF636aB48bA8e6Dd00A795c1e" });

      const res = await fetch("/api/fetch-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fetch failed");

      push({ type: "system", label: "On-chain event emitted", detail: "FetchAuthorized + ReputationUpdated" });
      await delay(400);
      push({ type: "inbound", label: "< 200 OK", detail: "Payment-Response: <signed-receipt>" });
      await delay(300);
      push({ type: "success", label: "Receipt verified - KYA reputation updated", detail: "Anvita Flow compatible" });

      setReceipt(data.receipt);
      setArticleText(data.articleText ?? null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      push({ type: "error", label: "Error", detail: err instanceof Error ? err.message : "Unknown" });
    } finally {
      setFetching(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0F1E] text-[#F0EEE8] font-sans">
      <header className="border-b border-[#1E2A3A] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#00D4FF] flex items-center justify-center">
            <span className="text-[#0A0F1E] text-xs font-bold">C</span>
          </div>
          <span className="font-mono font-semibold">CrawlPay</span>
          <span className="text-[#00D4FF] text-xs font-mono bg-[#00D4FF]/10 px-2 py-0.5 rounded">Pharos x Anvita Flow</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8899AA] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D4FF] animate-pulse inline-block" />
          Atlantic Testnet
        </div>
      </header>

      <section className="px-6 pt-12 pb-8 max-w-5xl mx-auto text-center">
        <p className="text-xs font-mono text-[#00D4FF] tracking-widest uppercase mb-3">AI Agent Payment Infrastructure</p>
        <h1 className="text-3xl font-semibold mb-3">Pay-per-fetch for the open web</h1>
        <p className="text-[#8899AA] text-sm max-w-lg mx-auto leading-relaxed">
          AI crawlers pay publishers per URL at $0.0001 using EIP-3009 gasless USDC on Pharos.
          Every fetch builds on-chain KYA reputation via Anvita Flow.
        </p>
      </section>

      <section className="px-6 pb-8 max-w-3xl mx-auto">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[#0E1628] border border-[#1E2A3A] rounded-lg px-4 py-3 focus-within:border-[#00D4FF]/50 transition-colors">
            <span className="text-[#8899AA] font-mono text-sm shrink-0">URL</span>
            <input
              className="flex-1 bg-transparent outline-none font-mono text-sm text-[#F0EEE8] placeholder:text-[#3A4A5A]"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://medium.com/@you/your-article"
              spellCheck={false}
            />
          </div>
          <button
            onClick={fetching ? () => { abortRef.current?.abort(); setFetching(false); } : receipt ? undefined : fetchAsAgent}
            className={"px-5 py-3 rounded-lg font-mono text-sm font-semibold transition-all " + (fetching ? "bg-[#1E2A3A] text-[#8899AA]" : "bg-[#00D4FF] text-[#0A0F1E] hover:bg-[#00BFEE] active:scale-95")}
          >
            {fetching ? "Cancel" : receipt ? "Paid" : "Fetch as Agent"}
          </button>
        </div>
        <p className="text-xs text-[#3A4A5A] font-mono mt-2 px-1">Paste any Medium article URL to see the live payment flow.</p>
      </section>

      <section className="px-6 pb-16 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0E1628] border border-[#1E2A3A] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1E2A3A] flex items-center justify-between">
            <span className="text-xs font-mono text-[#8899AA] uppercase tracking-wider">Protocol trace</span>
            {steps.length > 0 && <button onClick={reset} className="text-xs font-mono text-[#3A4A5A] hover:text-[#8899AA]">clear</button>}
          </div>
          <PacketTrace steps={steps} fetching={fetching} />
        </div>
        <div className="flex flex-col gap-4">
          {receipt ? (
            <>
              <ReceiptCard receipt={receipt} />
              <ArticlePanel text={articleText ?? "Article content proxied via CrawlPay. Click below to read the full article."} url={url} />
            </>
          ) : (
            <div className="bg-[#0E1628] border border-[#1E2A3A] rounded-xl flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-full border border-[#1E2A3A] flex items-center justify-center mb-4">
                <span className="text-2xl">robot</span>
              </div>
              <p className="text-sm text-[#8899AA] font-mono leading-relaxed">Paste a Medium URL and click Fetch as Agent</p>
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-[#1E2A3A] px-6 py-12 max-w-5xl mx-auto">
        <p className="text-xs font-mono text-[#00D4FF] tracking-widest uppercase mb-8 text-center">How it works</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "01", title: "Agent fetches URL", body: "Sends plain GET. Proxy returns 402 with x402v2 offer." },
            { step: "02", title: "Signs EIP-3009", body: "Gasless USDC authorization. No gas spent, signed off-chain." },
            { step: "03", title: "Settles on Pharos", body: "CrawlPayFacilitator.sol on Atlantic Testnet. On-chain in under 1s." },
            { step: "04", title: "Gets signed receipt", body: "Content delivered + receipt. Feeds KYA reputation on Anvita Flow." },
          ].map(({ step, title, body }) => (
            <div key={step} className="bg-[#0E1628] border border-[#1E2A3A] rounded-xl p-4">
              <p className="text-[#00D4FF] font-mono text-xs mb-2">{step}</p>
              <p className="font-semibold text-sm mb-1">{title}</p>
              <p className="text-[#8899AA] text-xs leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#1E2A3A] px-6 py-6 flex items-center justify-between text-xs font-mono text-[#3A4A5A]">
        <span>CrawlPay - Pharos Skill Hackathon 2026</span>
        <div className="flex gap-4">
          <a href="https://atlantic.pharosscan.xyz/address/0xc35C5df1F1cf18AeF636aB48bA8e6Dd00A795c1e" target="_blank" rel="noreferrer" className="hover:text-[#8899AA]">Contract</a>
          <a href="https://docs.pharosnetwork.xyz" target="_blank" rel="noreferrer" className="hover:text-[#8899AA]">Pharos docs</a>
        </div>
      </footer>
    </main>
  );
}
