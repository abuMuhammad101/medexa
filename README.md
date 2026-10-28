# Medexa Live Demo

Front-end-only, fully clickable demo of Medexa: an AI agent that listens to a clinician's
session and strengthens the claim before submission (UAE / GCC: NPHIES, CCHI-BS, Daman,
NAS, SAICO, Al-Futtaim TPA, AED). **All data is fictional.** Codes and amounts are illustrative.

## Setup

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests (rules engine, validators, stores)
npm run check:tokens # fails on hard-coded colours / px outside tokens.css
npm run build        # typecheck + production build
npx playwright install chromium && npm run test:e2e   # full-path end-to-end
```

## What's in it

| Route | Screen |
| --- | --- |
| `/` | Control room: KPI cards with scrub charts, Upcoming Encounters, Priority Queue, Live Agent Pipeline, Patient Details modal |
| `/encounters` | Full encounter list with search, filters and sort (also the KPI drill-down) |
| `/session/:id` | Live Session: insights feed, recording stage, transcript, orb, Pulse panel |
| `/review/:id/:step` | Review Assistant carousel: SOAP Notes, Billing Intelligence, Patient Summary |
| `/kit` | UI kit: every component and state |
| `/m/:module` | "Not in this demo" for the other nav items |

## Scenarios

Pick one in the Demo director (or the command palette). It applies to the next session started.

| Scenario | What happens |
| --- | --- |
| Clean claim | Everything documented and coded; readiness stays high |
| Missing documentation | Gait training (9.7.41) has no supporting diagnosis and no scored outcome measure: 2 Active Denial Loop items, readiness 78.4% |
| Pre-auth needed | Dry needling (9.5.20) is raised late; the payer needs pre-authorisation |
| Payer rejection | Coding is clean, but NPHIES rejects on eligibility until it is re-verified |

Error states on purpose: add `?fail=submit` (network error, then rejection, then accepted),
`?fail=save`, `?fail=eligibility`, `?fail=lookup` or `?fail=draft` to the URL.

## Presenter shortcuts

| Key | Where | Action |
| --- | --- | --- |
| `Shift+D` | anywhere | Demo director: scenario, speed 1x/2x/4x, simulate voice Stop, drop connection, skip 15 s, offline, lock, reset |
| `Ctrl/Cmd+K` | anywhere | Command palette: jump to patient, start session, switch scenario, toggle language/theme |
| `Space` | Live Session | Pause / resume |
| `P` | Live Session | Toggle Pulse panel |
| `K` / `D` | Live Session | Keep / dismiss the focused (or newest) suggestion |
| `S` | Live Session | Simulate the "Stop" voice command |
| `Left` / `Right` | Review Assistant | Previous / next card (browser Back also works) |

## Reset data

Demo director → **Reset demo**, or avatar menu (bottom of the rail) → **Reset demo data**.
Data persists in `localStorage` (`medexa-demo-v1`); the live session is in `sessionStorage`
so a refresh offers Resume or Discard.

## Architecture

```
src/
  styles/tokens.css     the only place raw design values live
  components/ui/        typed kit (Button, IconButton, pills, fields, Modal, Drawer, Toast, charts, ...)
  features/dashboard/   KPIs, encounters, priority queue, pipeline, patient modal
  features/session/     feed, transcript, orb, Pulse panel
  features/review/      SOAP, billing, summary, send/submit flow
  engine/               clock (single sim clock), scenarios, rules (pure), pipeline, KPI series
  mocks/                fixtures + fake API (200-800 ms latency, ?fail= switches)
  store/                zustand: demo (persisted), session (sessionStorage), ui, toast
```

Session playback is a pure function of `elapsedMs`, so the transcript and suggestions are derived,
never stored, and every timer reads from `engine/clock.ts` (the Demo director speed drives it all).
