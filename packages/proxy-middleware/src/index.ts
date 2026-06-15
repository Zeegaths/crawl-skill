import type { Request, Response, NextFunction } from "express";

export interface CrawlPayGateOptions {
  publisherWallet: string;
  facilitatorUrl: string;
  pricePerFetch?: number;    // atomic USDC (default 100 = $0.0001)
  freeForHumans?: boolean;   // default true
}

const BOT_PATTERNS = [
  /crawlpay/i,
  /bot/i,
  /spider/i,
  /crawler/i,
  /agent/i,
  /python-requests/i,
  /curl/i,
  /wget/i,
];

function isAIAgent(userAgent: string): boolean {
  return BOT_PATTERNS.some(p => p.test(userAgent));
}

/**
 * Express/Next.js middleware that gates URLs behind CrawlPay x402 payments.
 *
 * Publishers add this once — AI agents pay automatically via @crawlpay/skill,
 * humans pass through free.
 *
 * @example
 * // Express
 * app.use(crawlPayGate({
 *   publisherWallet: "0x...",
 *   facilitatorUrl: "https://your-facilitator.com",
 * }));
 *
 * @example
 * // Next.js middleware.ts
 * export { crawlPayGateNext as middleware } from "@crawlpay/proxy-middleware";
 */
export function crawlPayGate(options: CrawlPayGateOptions) {
  const price = options.pricePerFetch ?? 100;
  const freeForHumans = options.freeForHumans ?? true;

  return function crawlPayMiddleware(req: Request, res: Response, next: NextFunction) {
    const ua = req.headers["user-agent"] ?? "";
    const paymentSig = req.headers["payment-signature"];

    // Humans pass through free
    if (freeForHumans && !isAIAgent(ua)) {
      return next();
    }

    // Agent with payment header — verify via facilitator then serve
    if (paymentSig) {
      return next(); // facilitator verification handled at route level
    }

    // Agent without payment — return 402 with x402v2 offer
    res.status(402).json({
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: "pharosAtlantic",
          maxAmountRequired: price.toString(),
          payTo: options.publisherWallet,
          asset: "USDC",
          extra: {
            name: "CrawlPayFacilitator",
            version: "1",
            facilitatorUrl: options.facilitatorUrl,
          },
        },
      ],
    });
  };
}

/**
 * Verify a payment signature and record the settlement.
 * Call this in your route handler after crawlPayGate middleware.
 */
export async function verifyAndSettle(
  paymentSig: string,
  url: string,
  facilitatorUrl: string
): Promise<{ valid: boolean; receipt?: unknown }> {
  try {
    const res = await fetch(`${facilitatorUrl}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentSig, url }),
    });
    if (!res.ok) return { valid: false };
    const data = await res.json();
    return { valid: true, receipt: data.receipt };
  } catch {
    return { valid: false };
  }
}
