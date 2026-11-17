# Settings, profile, guest identity & optional setup (TRI-24)

**Owner:** Nela · **Cycle 4**

This note records the scope decisions behind the Profile/Settings and the
optional setup flow, and how each acceptance criterion is met.

## What shipped

- **Profile** (`#/profile`) holds the account/guest identity and a full
  **Settings** panel (settings live inside Profile, per the final Figma).
- **Optional setup** (`#/setup`) is a short, skippable flow that writes the same
  preferences as Settings.
- A dedicated state module, [`frontend/js/prefs.js`](../frontend/js/prefs.js),
  is the single source of truth for preferences, with validation, localStorage
  persistence, and `<html>`-class application for the accessibility toggles.

## Preferences

| Preference | Values | Effect | Persists |
|---|---|---|---|
| Training environment | Indoor / Outdoor | Frames guidance; reveals the optional location opt-in when Outdoor | ✅ |
| Skill level | Beginner / Intermediate / Advanced | Frames recommendation wording (TRI-23) | ✅ |
| Primary goal | Puck control / Hand speed / Coordination / Head-up awareness | Drives Progress recommendations (TRI-23) | ✅ |
| Large workout text | On / Off | Scales the rem base app-wide (incl. session timers) via `html.pref-large-text` | ✅ |
| Reduced motion | On / Off | Disables diagram/interface animation via `html.pref-reduced-motion` (mirrors the OS `prefers-reduced-motion` rules) | ✅ |
| Audio prompts | On / Off | Spoken session cues; **delegates to `feedback.js`** so it shares one value with the guided session | ✅ (feedback.js) |
| Location for weather tips | On / Off (**default Off**) | Optional preference for outdoor weather tips (arrives with outdoor mode) | ✅ |

Guest display name is an optional text field, escaped before render, capped at
40 characters, stored on-device only.

## Acceptance criteria

- **Declining optional permissions never blocks indoor training.** The location
  opt-in defaults off, appears only for Outdoor, and no code path gates any
  training flow on it. Indoor training needs none of these settings.
- **Preferences persist as intended.** All values round-trip through
  `localStorage` (`sticksmart.prefs.v1`), guarded for private-mode/blocked
  storage, and reapply on load before the first render. Stored values are
  range-checked on read so a stale/garbage value can't set an unknown state.
- **Guest / account limits are clear.** Profile states that guest data lives on
  this device, that an account (cross-device sync/backup) is a later update, and
  that there is deliberately no sign-in button yet.
- **No nonfunctional controls.** The previous placeholder settings list was
  replaced with working controls. The one non-toggle — training mode — is shown
  as static, honest text ("Timer-only" available; camera tracking later), not a
  switch that fakes camera tracking.

## Honesty notes

- Audio has exactly one source of truth (`feedback.js`); Settings reads/writes it
  rather than keeping a second copy that could drift from the session.
- Nothing simulates camera/tracking behaviour. Location sharing stores a
  preference only; no geolocation request is made and no data is sent anywhere
  until the weather feature actually ships.

## Accessibility

- Segmented controls and switches expose state via `aria-pressed` **and** a
  visible word/tick — never colour alone.
- Switch and segmented targets are ≥40px; the display-name input commits on
  change (blur/Enter) and focus is restored to the touched control after the
  in-place re-render.
