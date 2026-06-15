"use client";

export function ArticlePanel({ text, url }: { text: string; url: string }) {
  return (
    <div className="bg-[#0E1628] border border-[#1E2A3A] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1E2A3A] flex items-center justify-between">
        <span className="text-xs font-mono text-[#8899AA] uppercase tracking-wider">Content unlocked</span>
        <span className="text-emerald-400 text-xs font-mono">paid</span>
      </div>
      <div className="p-4 max-h-36 overflow-y-auto">
        <p className="text-xs text-[#8899AA] font-mono leading-relaxed whitespace-pre-wrap">
          {text.slice(0, 400)}{text.length > 400 ? "..." : ""}
        </p>
      </div>
      <div className="px-4 pb-4 border-t border-[#1E2A3A] pt-3">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="block text-center bg-[#00D4FF] text-[#0A0F1E] text-xs font-mono font-semibold py-2 rounded-lg hover:bg-[#00BFEE] transition-colors"
        >
          Read full article
        </a>
        <p className="text-[10px] font-mono text-[#3A4A5A] mt-2">
          Payment verified on Pharos. Receipt is your access proof.
        </p>
      </div>
    </div>
  );
}