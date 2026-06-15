# MatchSats ⚡

> **AI Matchmaking + Lightning Escrow for Conferences.**
> Built in Africa, for Africa.

---

## The Problem

Conferences are expensive and wasted. Visibility gaps make it impossible to find the 1% of people who matter. Passive tools — WhatsApp groups, badge scans — fail because no-shows are free. There's no skin in the game.

## The Solution

MatchSats introduces **Economic Integrity** to networking.

- **AI finds the match** — semantic analysis of your Nostr profile, skills, and intent
- **Bitcoin Lightning Escrow ensures the follow-through** — both parties lock sats before the meeting. Show up, get refunded. Ghost, and they keep your sats.

> *"Remove Bitcoin and you have an app a VC already built. Keep it and you have something nobody else has shipped."*

---

## How It Works

```
1. Scan in via LNURL-auth       → your Lightning wallet is your identity
2. Define your Digital Aura     → skills, intent, personality matrix
3. Get AI-matched               → top 3 peers with IR-grade rationale
4. Lock sats                    → both parties commit via Lightning hold invoice
5. Meet                         → confirm attendance to release escrow
6. Record & summarize           → Whisper transcription in English + Swahili
```

---

## Escrow State Machine

The **Confirm** tap is the only signal. Ambiguity always resolves in the user's favour.

| Scenario | Person A | Person B | Outcome | LNbits Action |
|:---|:---|:---|:---|:---|
| **Both Confirm** | Tapped | Tapped | Full Refund | `cancelInvoice` ×2 |
| **A Confirms, B Silent** | Tapped | No Action | B Penalised | `settleInvoice(B)`, `cancel(A)` |
| **Neither Confirms** | No Action | No Action | Full Refund | `cancelInvoice` ×2 (Timeout) |
| **Explicit Dispute** | Tapped | Either | Manual Review | Freeze / Manual Resolution |

---

## Tech Stack

### Identity
- **LNURL-auth** — passwordless, wallet-based identity via Lightning. No email. No password.

### Escrow
- **LNbits Hold Invoices** — state-machine driven via BullMQ. Never settlement-first.

### Data Layer
- **Nostr** — NIP-01 profiles, decentralised event storage. Events signed via NIP-07 or temporary session keys.

### AI Engine
- **OpenAI API** — semantic matching & meeting summarisation
- **OpenAI Whisper** — Swahili-native audio transcription
- **Masakhane / AfroXLMR** — Yoruba / Amharic / Hausa NLP routing

### Frontend
- **Next.js 15** (PWA-ready)
- **Tailwind CSS**, Lucide React, Radix UI

### Backend
- **Node.js**, SQLite (minimal state tracking), BullMQ

---

## Language & Regional Intelligence

MatchSats is built for the African market and respects its linguistic complexity.

- **Code-switching** — recognises Kenyan Swahili-English-Sheng mixing via `lingua-py` segment tagging before LLM routing
- **Sentiment calibration** — AfriSenti-calibrated logic (e.g. *"Poa sana"* = high praise / Positive)
- **Sovereign aesthetic** — the UI evokes institutional trust, not crypto-degen culture

---

## API

| Endpoint | Description |
|:---|:---|
| `POST /api/match` | Triggers OpenAI to analyse Nostr profiles, returns top 3 matches + rationale |
| `POST /api/invoices` | Creates a Lightning hold invoice for a meeting commitment |
| `POST /api/invoices/:id/confirm` | Confirms attendance, triggers escrow resolution |

---

## Pages

| Route | Description |
|:---|:---|
| `/` | Landing page |
| `/login` | LNURL-auth wallet connect |
| `/profile` | Define Your Digital Aura |
| `/matches` | AI-matched peers, active meetings |
| `/matches/[id]` | Match detail, lock sats flow |
| `/matches/[id]/review` | Post-meeting confirmation, transcription, escrow resolution |

---

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Type check
npm run type-check

# Run tests
npx playwright test
```

### Standards
- **Files** — kebab-case (`escrow-handler.ts`)
- **Variables** — camelCase
- **TypeScript** — strict mode, no `any`, interfaces for all Nostr event structures
- **Security** — always use Hold Invoices, never settlement-first
- **Tests** — Playwright for PWA mobile flow, unit tests for BullMQ state transitions

---

## Meeting Memory Flow

```
Audio recording
    → OpenAI Whisper (transcription)
    → lingua-py (language detection + segment tagging)
    → AfroXLMR / OpenAI router (language-aware NLP)
    → OpenAI Summariser
    → Output in English + Swahili
```

---

## Contrast Scale (UI)

| Role | Color |
|:---|:---|
| Headlines | `#fff` |
| Body text | `#bbb` / `#aaa` |
| Secondary | `#888` |
| Labels | `#666` |
| Dimmed | `#555` |

Brand colors: `#cafd00` (lime) · `#9d7bb8` (purple) · `#0a0a0a` (background)

---

## License

Built in Nairobi. Powered by Lightning. ⚡
