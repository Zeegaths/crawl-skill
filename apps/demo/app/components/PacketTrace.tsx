"use client";
import { useEffect, useRef } from "react";

type Step = {
  ts: number;
  type: "outbound" | "inbound" | "system" | "error" | "success";
  label: string;
  detail?: string;
};

const TYPE_STYLES: Record<Step["type"], { color: string; prefix: string }> = {
  outbound: { color: "text-[#F0EEE8]", prefix: ">" },
  inbound:  { color: "text-[#00D4FF]", prefix: "<" },
  system:   { color: "text-[#8899AA]", prefix: "." },
  error:    { color: "text-red-400",   prefix: "x" },
  success:  { color: "text-emerald-400", prefix: "v" },
};

export function PacketTrace({ steps, fetching }: { steps: Step[]; fetching: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [steps]);

  if (steps.length === 0 && !fetching) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-xs font-mono text-[#3A4A5A]">Waiting for agent request...</p>
      </div>
    );
  }

  return (
    <div className="h-80 overflow-y-auto p-4 space-y-1 font-mono text-xs">
      {steps.map((s, i) => {
        const style = TYPE_STYLES[s.type];
        const time = new Date(s.ts).toISOString().slice(11, 23);
        return (
          <div key={i} className="flex gap-2 items-start animate-fade-in">
            <span className="text-[#3A4A5A] shrink-0">{time}</span>
            <span className={style.color + " shrink-0"}>{style.prefix}</span>
            <div className="min-w-0">
              <span className={style.color}>{s.label}</span>
              {s.detail && <span className="text-[#3A4A5A] ml-2 break-all">{s.detail}</span>}
            </div>
          </div>
        );
      })}
      {fetching && (
        <div className="flex gap-2 items-center">
          <span className="text-[#3A4A5A]">{new Date().toISOString().slice(11, 23)}</span>
          <span className="text-[#00D4FF]">.</span>
          <span className="text-[#3A4A5A] animate-pulse">processing...</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
