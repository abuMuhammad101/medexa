# Deviations and design decisions

Search the code for `DESIGN-DECISION` to find each one in place.

## Not verified against Figma

- **Figma variables were not read.** `get_variable_defs` needs a layer selected in Figma desktop, so `tokens.css` uses the prompt's token block plus values sampled from the frame renders. Re-check them against the Design System page.
- **Pixel match was not measured.** Layout was built from 1440 px renders of 2536:7000, 2566:3355, 2405:14310, 2566:4423, 2405:14603 and 2405:14969 by eye. The 2 px spacing check has not been run.
- **Card 3 (2405:14908)** rendered blank from the API, so it was built from its appearance as the neighbour in 2405:14969.

## Decisions on design conflicts

| Conflict | Decision |
| --- | --- |
| Ink vs blue primary | Blue primary for all text buttons; ink only for round icon buttons (carousel arrows) |
| Header date (Tue Jul 13 is a Monday), past encounter dates | One sim clock based on the real current date; all dates are generated from it |
| Member ID placeholder "Last Name" | "Auto-derived from Emirates ID" |
| Timer 20:02 vs transcript 12:10 to 12:25; duplicate first lines | Transcript uses session offsets; every line is distinct |
| Dr. Aris in Pulse panel | Signed-in clinician (Dr. Sarah) everywhere |
| 14 days (SOAP) vs three weeks (transcript) | One fixture value `complaintDays = 21`: "three weeks (21 days)" |
| Knee flexion for a lower back patient | Lumbar flexion +15 degrees |
| Same Ref ID on every row | Unique Ref IDs |
| CPT/ICD (Priority Queue) vs CCHI-BS (billing) | Kept as drawn. **Open question for the product owner:** which code systems should the demo claim? |
| "Send" has no target | Popover: Send summary to patient, or Submit claim to NPHIES |
| Pending at 58% | Pending stays under 20% until SOAP synthesis passes 70% |
| Upcoming Encounters badge 19 | Badge is the real count (8 seeded) |
| Pill padding 12 vs 14 px | 14 px |
| Third timeline line copy | "...with the patient to show what we worked on." |
| Recharts | Charts are hand-written SVG so the scrub tooltip, the keyboard equivalent and token colours are fully controlled. Recharts was not installed. |
| Priority deck colours | Middle deck tone darkened (`--color-deck-2`) so white text passes 4.5:1 |
| AI glow stops | `--ai-glow` uses blue, then violet, then cyan |

## Not done / known gaps

- Lighthouse scores (target: accessibility 95, performance 85) were not measured. The JS bundle is one 649 kB minified chunk (204 kB gzip); lazy-loading the session and review routes would help performance.
- A full contrast audit and screen-reader pass were not run. The live regions, labels and focus management are built in but untested with a real screen reader.
- The Playwright spec passes (2 tests: the full path, and the `?fail=submit` network error, rejection and acceptance sequence). Run it with `npx playwright install chromium && npm run test:e2e`.
- Dark theme is a basic token swap, as the prompt's stretch goal allows.
- Below 768 px the side rail is hidden; the page stays usable but the avatar/role menu is not reachable there.
- Real microphone audio is only permission-checked; the orb level and transcript are always scripted.
