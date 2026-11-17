# Final GUI accessibility & acceptance validation (TRI-29)

**Owner:** Nela · **Cycle 5** · Validated against the final Figma and the
accessibility acceptance checklist on the current `main` build.

Scope: the frontend GUI (app shell, builder, guided session, progress, profile/
settings). Backend/tracking integration is owned by other tickets.

## Method

Exercised complete phone (375×812) and desktop flows in-browser, checked the
DOM/ARIA and computed styles, and drove the keyboard and drawer paths. Results
below; defects found were fixed in this ticket.

## Results

### Navigation & timers — no critical defects
| Check | Result |
|---|---|
| All routes render (home, training, drill, review, setup, session, progress, profile) | ✅ no console errors on any route |
| Active destination marked | ✅ `aria-current="page"` on the current nav item; Training stays active across the training flow |
| Guided session timers run, pause-aware, complete → summary | ✅ verified end to end; session recorded to Progress |
| Focus moves to `<main>` on route change | ✅ `#view[tabindex="-1"]`, focused after navigation |
| No horizontal overflow at 375px | ✅ `scrollWidth == clientWidth` on content-heavy Progress |

### Keyboard — recorded
| Check | Result |
|---|---|
| Skip link to main content | ✅ `.skip-link` → `#view`, focuses main |
| Visible focus on every control | ✅ `:focus-visible` orange ring (reads on light content and navy sidebar) |
| Mobile drawer opens with focus moved inside | ✅ focus → close button; `aria-expanded="true"`; background scroll locked |
| Drawer **Esc** closes and restores focus | ✅ closes, unlocks scroll, focus returns to the menu button |
| Drawer focus trap (Tab cycles within) | ✅ Tab/Shift+Tab wrap at the first/last focusable |
| Every button/link has an accessible name | ✅ none found without text / `aria-label` |

### Glove use — recorded
| Check | Result |
|---|---|
| Primary session controls are large | ✅ `.large-ctrl` / `.large-start` `min-height: 64px` |
| Destructive action confirms first | ✅ End Workout opens a confirmation dialog (`role="alertdialog"`) |
| Voice "End" also routes to the confirmation | ✅ a mishear cannot end a session |

### Colour-blind-friendly cues
Status is conveyed with **icon + text**, never colour alone, everywhere:
- Settings switches show **On/Off** text + `aria-pressed`; segmented controls
  show a ✓ tick on the selected option.
- Pills, live-coaching cues, and recommendation evidence pair a glyph with words.
- Progress focus bars pair each bar with a label **and** a numeric count.
- Reps show the words **"Not measured"** rather than a colour or a bare `0`.

## Misleading simulated behaviour — removed / clearly labelled

Audited every "simulated / sample / AI" claim in the UI:

- **Home note was stale and misleading** — it said *voice* and *AI advice* were
  "simulated". Voice is real (TRI-18) and recommendations are real, explainable
  rules (TRI-23). **Fixed:** the note now says timers, navigation, guided
  sessions, optional voice, and saved progress all work, and that **camera-based
  rep/technique tracking** is the next phase and is clearly labelled wherever it
  would appear.
- **Home "getting started" cards** reworded so progress/recommendations are
  described as real (saved on device; from your own history), not sample-only.
- **Account note** corrected: guest data already saves on-device; accounts add
  cross-device sync later (no fake sign-in).
- Remaining labelled examples are honest and kept: the Training "Recommended"
  sample (explicit **"Sample data"** note) and the Progress empty-state preview
  (explicit **"Example — not your data"**). The guided session states
  **"timer-only"** throughout and never fakes camera measurement.

## Client-acceptance feedback — triage

No new client feedback items were open against the GUI at validation time. The
acceptance checklist items above all pass. Carry-over / handoff items:

| Item | Owner | Status |
|---|---|---|
| Camera-based rep/technique tracking | Kem (TRI-15/21/22) | Out of scope here; honestly labelled in the GUI |
| Account sign-in / cross-device sync | Backend (later) | Labelled; guest on-device works today |
| Real-device phone pass (not just emulation) | Team | **Recommended before release** — emulation ≠ real device |
| Teammate review of this validation | Team | Pending human sign-off |

## Verdict

No critical navigation or timer defects. Keyboard, glove-use, and colour-blind
checks pass and are recorded above. The one misleading claim found (stale home
copy) was fixed. Remaining gaps are known, out-of-scope-for-GUI, and clearly
labelled in the product.
