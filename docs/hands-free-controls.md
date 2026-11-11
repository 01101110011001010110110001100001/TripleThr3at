# Hands-free controls & accessible training flow (TRI-18)

Covers two things for the guided session (TRI-12): (1) the **touch** flow is the
always-reliable, glove-friendly baseline, and (2) an **optional voice** layer for
the core transport commands, plus the scope decision for what voice does *not*
try to do.

## Touch is the baseline (always works)

Every session control is a large, glove-friendly target and is always present —
voice is only ever additive, never a replacement:

- Controls use `.large-ctrl` / `.large-start`: **≥64px tall, ≥140px wide**,
  which clears the WCAG 2.5.5 target-size guidance comfortably for gloved taps.
- The transport verbs are always reachable by touch: **Start** (Ready /
  countdown), **Pause / Resume**, **Complete Drill**, **Skip Rest**, and **End
  Workout**.
- **Destructive actions confirm.** "End Workout" opens a confirmation dialog
  before anything is discarded, so neither a fat-fingered tap nor a misheard
  voice command can end a session outright.
- Visible `:focus-visible` rings and the app-wide "icon + text, never colour
  alone" rule apply to every control.

## Voice: the supported subset

Voice is an **opt-in convenience** layer wired to the same session functions as
the touch buttons, so it inherits their phase guards. Exposed commands:

| Say | Does | Notes |
| --- | --- | --- |
| **"Start" / "begin"** | Start the countdown | Ready screen only |
| **"Pause" / "hold"** | Pause the timer | Active / countdown / rest |
| **"Resume" / "continue"** | Resume from pause | Only while paused |
| **"Skip"** | Skip the rest period | Rest screen only |
| **"End" / "stop"** | Open the End-Workout confirmation | Never ends directly |

Only these are exposed; the UI lists exactly this set so athletes aren't guessing.

### How false triggers are addressed

Always-listening voice mishears things, so the design keeps a mistake cheap:

1. **Opt-in and not persisted.** Nothing listens until the athlete taps the
   toggle (that tap also triggers the microphone-permission prompt). It is *not*
   remembered across reloads, so the mic is never opened by surprise.
2. **Tiny, exact grammar.** Transcripts are matched on **whole words only**, so
   "restart", "upstart", or "I feel great" never fire a command — anything
   outside the five verbs is ignored.
3. **Destructive command is guarded.** "End" opens the confirmation dialog
   rather than ending, so a mishear can't end a session.
4. **Debounced.** A repeated identical command inside 1.2s is dropped.
5. **Phase-guarded.** Commands run through the same functions as touch, so an
   out-of-context command (e.g. "skip" while not resting) is a harmless no-op.
6. **Session-scoped.** Recognition runs only on the guided-session screen and is
   stopped on leaving it or reaching the summary.
7. **Low-confidence rejected.** A positive confidence below 0.5 is treated as a
   mishear (engines that report 0 for continuous results are still accepted).

## Scope decision — what voice does *not* do

The point of this ticket was to decide what is feasible and ship only that:

- **Unsupported browsers get touch only.** The Web Speech *recognition* API is
  Chromium-family today (Chrome, Edge). Where it's absent (e.g. Firefox), the
  voice panel is **omitted** and replaced with a one-line note that touch always
  works. Nothing half-working is shown.
- **No wake word / always-on assistant.** Out of scope — it would mean
  continuous background listening and a much larger false-trigger surface. Voice
  is a manual, in-session toggle instead.
- **No free-form or drill-specific commands** (e.g. "add a drill", "how many
  reps"). Out of scope; only the five transport verbs are supported.
- **No offline / on-device model.** Recognition uses the browser's built-in
  engine, which may route audio to a cloud service; this is acceptable for a
  convenience toggle but is why it is opt-in and not persisted.

**Conclusion:** voice start/pause/resume/skip/end is feasible as an optional,
capability-gated convenience on Chromium browsers, with touch as the reliable
baseline everywhere. Reviewers should confirm recognition on a **real device
with a microphone** (the in-app Browser pane blocks mic capture), per the
"mobile preview ≠ real device" reviewer note.

## Where it lives

| File | Role |
| --- | --- |
| `frontend/js/voice.js` | Capability check, opt-in recognition lifecycle, the five-command grammar, debounce, and status reporting. |
| `frontend/js/sessionviews.js` | `renderVoice()` / `renderVoiceInner()` — the voice panel shown in every session phase. |
| `frontend/js/app.js` | `handleVoiceCommand()` routes commands to the session controls; disables voice on summary / leaving the session. |
| `frontend/css/styles.css` | `.voice*` panel styles. |
