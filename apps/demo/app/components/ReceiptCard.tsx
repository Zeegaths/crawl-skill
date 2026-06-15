"use client";
import { useState } from "react";

type Receipt = {
  url: string;
  amount: string;
  crawlerWallet: string;
  publisherWallet: string;
  network: string;
  txHash: string;
  timestamp: number;
  signature: string;
};

export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const [expanded, setExpanded] = useState(false);
  const tr = (s: string, n: number) => s && s.length > n ? s.slice(0, n) + "..." : s;

  const fields = [
    { label: "amount", value: receipt.amount + " USDC (atomic)" },
    { label: "network", value: receipt.network },
    { label: "crawler", value: tr(receipt.crawlerWallet, 20) },
    { label: "publisher", value: tr(receipt.publisherWallet, 20) },
    { label: "tx", value: tr(receipt.txHash, 22) },
    { label: "signed", value: new Date(receipt.timestamp * 1000).toUTCString() },
  ];

  return (
    <div className="bg-[#0E1628] border border-[#00D4FF]/30 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1E2A3A] flex items-center justify-between bg-[#00D4FF]/5">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-sm">v</span>
          <span className="text-xs font-mono text-[#F0EEE8] font-semibold">CrawlPayReceipt</span>
        </div>
        <span className="text-[10px] font-mono text-[#00D4FF] bg-[#00D4FF]/10 px-2 py-0.5 rounded">verified</span>
      </div>
      <div className="px-4 py-3 border-b border-[#1E2A3A]">
        <p className="text-[10px] font-mono text-[#3A4A5A] mb-1">url</p>
        <p className="text-xs font-mono text-[#8899AA] break-all">{receipt.url}</p>
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-3">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] font-mono text-[#3A4A5A] mb-0.5">{label}</p>
            <p className="text-xs font-mono text-[#F0EEE8]">{value}</p>
          </div>
        ))}
      </div>
      <div className="px-4 pb-3">
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] font-mono text-[#3A4A5A] hover:text-[#8899AA] transition-colors">
          {expanded ? "hide signature" : "show signature"}
        </button>
        {expanded && (
          <p className="mt-2 text-[10px] font-mono text-[#3A4A5A] break-all bg-[#0A0F1E] rounded p-2">{receipt.signature}</p>
        )}
      </div>
      {receipt.txHash && !receipt.txHash.includes("demo") && (
        <div className="px-4 pb-4">
          <a href={"https://atlantic.pharosscan.xyz/tx/" + receipt.txHash} target="_blank" rel="noreferrer" className="text-[10px] font-mono text-[#00D4FF] hover:underline">
            View on Pharos Scan
          </a>
        </div>
      )}
    </div>
  );
}
