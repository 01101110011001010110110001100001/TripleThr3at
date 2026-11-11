# StickSmart — Frontend (App Shell, Navigation, Builder & Session)

Plain **HTML5 + CSS + vanilla JS** (no framework, no build step). The app shell
and persistent navigation are the TRI-6 deliverable; the drill library, workout
builder, drill details, and workout review are **TRI-11**; the guided
pause-aware workout/rest session runtime is **TRI-12**. It currently calls no
backend; it will call Ethan's Python/MySQL API over `fetch` in a later ticket.

> **Naming:** the product UI is branded **StickSmart** (that's the name used in
> the final Figma). **TripleThr3at** is the team / repository name.

## Run it

Any static file server works. From the repo root:

```bash
python3 -m http.server 8000 --directory frontend
```

Then open <http://localhost:8000>.

> ES modules (`<script type="module">`) require `http://`, not opening the
> file directly (`file://`) — use the command above.

## Structure

```
frontend/
  index.html      App shell: skip link, navy sidebar, mobile top bar, <main>, bottom dock
  css/styles.css  Design tokens (CSS custom properties from Figma), layout, responsive, focus styles
  js/app.js       Hash router (+ params), active-nav state, drawer handling, delegated builder actions, drag-reorder
  js/views.js     View render functions (Home, Training/Builder, Drill detail, Review, Progress, Profile, Setup)
  js/workout.js   Workout state: selected drills, add/remove/reorder/undo, preset vs custom, localStorage persistence
  js/session.js   Guided-session state machine: pause-aware timers, phase transitions, finish-early, summary
  js/sessionviews.js  Runtime phase views (ready / countdown / active / rest / summary)
  js/feedback.js  Live technique feedback (TRI-17): cue vocabulary + Web Speech audio layer
  js/drills.js    The 4 drills + workout math (copy/data from Figma + TT3database/drill_catalog.sql)
  js/diagram.js   Inline-SVG rink movement diagrams, one motion path per drill
```

## Guided session (TRI-12)

*Choose Training Mode* on the review page begins a **timer-only** guided session
against the chosen order. Each drill runs a phase cycle:

**Ready → Countdown (3s) → Active → Rest → … → Summary**

- **Pause-aware timers.** Active, rest, and countdown timers only advance while
  the session is running; **paused time and time spent in the finish-early
  dialog are excluded** from the elapsed active/rest totals.
- **Controls.** Large, glove-friendly touch targets: Pause/Resume, Complete
  Drill, Skip Rest, and End Workout (with a confirmation dialog).
- **No duplicate completion.** The timer reaching zero and the Complete button
  share one guarded path, so a drill is only completed once.
- **Rest transitions follow the chosen order**; the summary distinguishes a full
  completion from an early finish (with a partially-completed drill marked).
- **Demo speed** (on by default) runs timers ~15× so the flow is quick to review;
  turn it off on the Ready screen for real-time timers.

Camera / simulated-tracking mode and the AI advisor are a later ticket (TRI-15);
the session is labeled timer-only throughout.

## Live technique feedback (TRI-17)

During the active phase a **Live coaching** panel shows heads-up / posture
reminders and a **ten-seconds-left** prompt, with optional spoken audio. It is
honest that this is **timer-only mode** — the cues are time-based reminders, not
camera measurements — and it exposes an `ingestTrackingEvent()` seam so that
when tracking (TRI-15) lands, real positive / corrective cues render in the same
panel with no view changes. Prompts are **rate-limited**, every cue uses an
**icon + worded label (never colour alone)**, **audio can be muted** (persists in
`localStorage`), and **pausing silences prompts**. Full notes:
[`docs/live-feedback.md`](../docs/live-feedback.md).

## Workout builder (TRI-11)

Three ways to assemble a session, all reachable from **Training**:

- **Manual** — browse the drill library and `+ Add drill` (or the *Add a drill*
  search) to build a custom workout; each drill is added once.
- **Preset** — *Quick Hands Builder*, a ready-made 3-drill sequence kept
  **separate** from the custom workout.
- **Recommended** — the same sequence surfaced as a clearly labeled sample.

Open any drill for **details**: how to perform it (numbered steps), marker
placement, equipment, environment, measurement, work/rest intervals, what counts
as one rep, and a technique cue (plus an animated movement diagram).

**Review** lists the chosen drills in training order. Reorder by drag, or with
the ↑/↓ controls; remove with one-step **Undo**; totals (active / rest / planned)
update live. The chosen order is what *Choose Training Mode* hands off to the
(later) guided session screens. The custom workout **persists** to
`localStorage` so guest state survives navigation and reloads.

## Navigation (matches the final Figma)

Persistent destinations: **Home · Training · Progress · Profile**. **Settings
live inside Profile** (per the final Figma / TRI-5 PDF §5).

- **Desktop (≥768px):** a navy **left sidebar** with the StickSmart brand and
  the four destinations. The active item gets a navy fill and an orange left
  accent bar.
- **Phones (<768px):** a fixed **bottom dock** with the four destinations, plus
  a hamburger (top bar) that slides the sidebar in as a **drawer**. The drawer
  closes after a destination is selected, on Esc, and on backdrop tap.

Routes are hash-based: `#/home`, `#/training`, `#/drill/<slug>`, `#/review`,
`#/session`, `#/progress`, `#/profile`, `#/setup` (and `#/profile#settings` to
jump to the Settings section).

## Accessibility & status

- Skip link to main content; `aria-current="page"` on the active destination.
- Visible keyboard focus on every control (`:focus-visible`), focus moves to
  the main region on route change, and the drawer traps focus / closes on Esc /
  restores focus to its trigger.
- Status is conveyed with **icon + text, never colour alone** (Guest pill,
  active-nav orange bar/underline, sample-data pill).
- Honours `prefers-reduced-motion`.

## Guest state

The app starts as **Guest** (no account needed to browse). State lives in
`state.user` in `js/app.js` — later tickets flip it to a real account.

## Theme

Design tokens in `:root` (`css/styles.css`) are taken from the final Figma
prototype: light paper background `#f5f7f8`, white cards, navy ink `#13233a`,
primary blue `#1676b9`, orange accent `#ff9e1b`, 16px radius, **Work Sans**
(loaded from Google Fonts). Adjust the whole theme from that one `:root` block.

## Scope

Shell, navigation, drill library, workout builder, drill details, review/reorder,
and the **timer-only guided session** (active/rest timers, pause/resume,
finish-early, completion summary). **Camera / simulated-tracking mode** and the
AI advisor (TRI-15), the full setup wizard, and real auth/persistence are
placeholders here and ship in later tickets.

## Note for reviewers

**Mobile preview ≠ real device.** Test on an actual phone before the handoff
(TRI-5 PDF §5), not just the browser's responsive mode.
