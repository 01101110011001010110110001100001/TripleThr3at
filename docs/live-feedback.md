# Live technique feedback & audio prompts (TRI-17)

Connects the guided session (TRI-12) to athlete-facing coaching cues: heads-up /
posture reminders, a ten-seconds-left prompt, and — once computer-vision
tracking (TRI-15) lands — positive / corrective feedback. It is deliberately
**honest about capability**: the session runs in timer-only mode today, so the
cues shown are time-based reminders, never measurements faked from a camera.

## Where it lives

| File | Role |
| --- | --- |
| `frontend/js/feedback.js` | Cue vocabulary (`CUE`), the per-drill reminder rotation, the ten-seconds cue, and the Web Speech audio layer (mute + persistence + capability check). |
| `frontend/js/session.js` | Schedules cues inside the pause-aware tick, exposes `toggleAudioPrompts()` and the `ingestTrackingEvent()` seam. |
| `frontend/js/sessionviews.js` | Renders the **Live coaching** panel (`renderCoach`) and the screen-reader announcement (`coachAnnouncement`). |
| `frontend/js/app.js` | Swaps the panel in place on a `"coach"` notification, so a changed cue never steals focus or resets scroll. |
| `frontend/css/styles.css` | `.coach*` panel styles, cue tones, and the `.sr-only` live region. |

## What the athlete sees

During the **active** phase a *Live coaching* panel sits under the timer:

- A **steady reminder** of the current drill's technique cue between prompts.
- **Transient prompts** that appear on a schedule and then fade back to the
  steady reminder:
  - **Heads-up / posture reminders** — a three-cue rotation ("Eyes up…", the
    drill's own cue, "Stay low…").
  - **Ten seconds left** — a single prompt as the active timer enters its final
    ten seconds.
- Once TRI-15 is wired in, **Good** / **Adjust** cues from real movement
  tracking appear in the same panel (see the integration seam below).

### Never colour alone

Every cue carries a **monochrome glyph and a worded label** (`Good:`,
`Adjust:`, `Heads up:`, `Reminder:`, `Time:`), so meaning never depends on
colour. Tone colours (green/amber/blue/orange) are an extra signal, not the
only one. This matches the app-wide "icon + text, never colour alone" rule.

## Rate limiting

Reminders are limited to **one per 45 seconds** of active time (first at 20s),
and none fires inside the final 15 seconds where it would collide with the
ten-seconds prompt. The ten-seconds prompt fires **once per drill**. Audio uses
`speechSynthesis.cancel()` before each utterance, so prompts never queue up.

All scheduling is measured in **real drill-seconds**, so it is unaffected by the
Ready-screen *Demo speed* (~15×). One consequence: at demo speed a drill never
sits in its final-ten-seconds window, so the ten-seconds prompt is only seen in
**real-time mode** (turn Demo speed off on the Ready screen to review it).

## Audio (mutable, capability-honest)

- Spoken prompts use the **Web Speech API**. If the browser has no speech
  support the UI says so and falls back to visual cues only — audio is never
  assumed to have happened.
- The **Audio prompts** toggle (Ready screen and the active panel) mutes /
  unmutes spoken prompts; the choice **persists** in `localStorage`
  (`ss_feedback_audio`). Visual cues always remain.
- **Pause silences prompts.** The scheduler only runs while the session is
  actually running (not paused, no dialog open), and pausing cancels any
  in-flight speech. The pause banner states that audio prompts are stopped.

## Accessibility channels

The same prompt reaches everyone through three independent channels:

1. **Visual** — the on-screen cue (glyph + label + text).
2. **Audio** — spoken via the Web Speech API (mutable).
3. **Screen reader** — a single persistent assertive live region
   (`[data-bind="coach-sr"]`) carries the active prompt. The visual panel is
   marked `aria-live="off"` so the announcement is not duplicated by the
   parent `<main aria-live="polite">`.

## Integration seam for real tracking (TRI-15)

Timer-only mode never fabricates measured feedback. When TRI-15 emits movement
events, route each one to:

```js
import { ingestTrackingEvent } from "./session.js";
// evt = { kind: "positive" | "corrective" | "heads_up" | ..., text: "…" }
ingestTrackingEvent(evt);
```

It surfaces the cue (visual + audio + SR) with **no change to the session
views** — they already render whatever cue the engine produces. Until then the
panel honestly reads: *"Timer-only mode — these are time-based reminders, not
live camera measurements."*

## Verification

- Headless harness driving the real `session.js` tick (demo off) confirms
  reminders fire at 20 / 65 / 110 / 155s (gaps of 45s) and the ten-seconds
  prompt fires at `activeRemaining === 10`.
- In-browser: reminders rotate and fade, the SR live region populates only
  while a prompt is active, the audio toggle persists across drills, and pause
  freezes the timer and silences audio.
