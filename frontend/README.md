# StickSmart — Frontend (App Shell & Navigation)

Plain **HTML5 + CSS + vanilla JS** (no framework, no build step). This is the
TRI-6 deliverable: the app shell and persistent navigation that every later
screen plugs into. It currently calls no backend; it will call Ethan's
Python/MySQL API over `fetch` in a later ticket.

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
  js/app.js       Hash router, active-nav state, drawer open/close + focus handling, guest state
  js/views.js     View render functions (Home, Training, Progress, Profile, Setup)
  js/drills.js    The 4 drills (copy from Figma + TT3database/drill_catalog.sql)
```

## Navigation (matches the final Figma)

Persistent destinations: **Home · Training · Progress · Profile**. **Settings
live inside Profile** (per the final Figma / TRI-5 PDF §5).

- **Desktop (≥768px):** a navy **left sidebar** with the StickSmart brand and
  the four destinations. The active item gets a navy fill and an orange left
  accent bar.
- **Phones (<768px):** a fixed **bottom dock** with the four destinations, plus
  a hamburger (top bar) that slides the sidebar in as a **drawer**. The drawer
  closes after a destination is selected, on Esc, and on backdrop tap.

Routes are hash-based: `#/home`, `#/training`, `#/progress`, `#/profile`,
`#/setup` (and `#/profile#settings` to jump to the Settings section).

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

Shell + navigation only. The setup wizard, drill details/builder, workout
runtime & timers, results, real auth/persistence, and camera/voice (simulated)
are placeholders here and ship in later tickets.

## Note for reviewers

**Mobile preview ≠ real device.** Test on an actual phone before the handoff
(TRI-5 PDF §5), not just the browser's responsive mode.
