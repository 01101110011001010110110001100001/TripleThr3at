# Results, progress & recommendations (TRI-23)

**Owner:** Nela · **Cycle 4**

How Progress is built from real saved metrics, and how each acceptance
criterion is met.

## Data flow

1. The guided session (`frontend/js/session.js`) calls `recordSession()` once,
   in `finish()`, whenever a session reaches its summary — completed **or**
   ended early.
2. [`frontend/js/history.js`](../frontend/js/history.js) stores the record in
   `localStorage` (`sticksmart.history.v1`), capped at 200 records, guarded for
   private-mode/blocked storage.
3. The Progress view reads aggregates via `getProgress()` and suggestions via
   `recommend()`.

## What is recorded

Only what timer-only mode can actually observe:

| Field | Meaning |
|---|---|
| `ts` | When the session finished |
| `workout` | Ordered drill names |
| `plannedCount` / `completedCount` | Drills planned vs. fully completed |
| `partial` / `endedEarly` | Whether it ended early / had a partial drill |
| `activeSeconds` / `restSeconds` | Pause-excluded elapsed time |

**Not recorded:** repetition counts. Those need camera tracking (TRI-15), so
Progress shows reps as **"Not measured"**, never `0`.

## Recommendations (explainable, evidence-citing)

`recommend({ goalFocus })` returns up to three suggestions, each derived from the
stored history and stating the counts it is based on:

1. **Balance** — nudges toward the least-trained focus, citing the busiest vs.
   least focus counts over the last 2 weeks.
2. **Goal alignment** — if the user's primary goal focus is below their average
   completed-drills, suggests its drill (skipped if it duplicates #1).
3. **Consistency** — if the last saved workout was ≥3 days ago, cites how long.
4. **Early-finish** — if ≥2 of the last 3 sessions ended early, suggests a
   shorter, finishable workout.

With **no history, `recommend()` returns `[]`** — no advice is invented.

## Acceptance criteria

- **Empty history has a helpful state.** "No saved workouts yet" explains what
  will be tracked, notes reps aren't measured (not zero), links to build a
  workout, and shows a **clearly-labelled example** ("Example — not your data").
- **Missing data is distinguished from zero.** Reps → "Not measured". The
  week-over-week trend says "No sessions last week to compare against yet" when
  there is no prior-week data, rather than implying a 0/decline.
- **Recommendations cite session evidence.** Every card shows a "Because:" line
  with real counts from the stored history.
- **No simulated advice presented as real.** The only sample content is the
  empty-state example, explicitly labelled; recommendations come solely from
  real records.

## Accessibility

- Focus-balance bars pair each bar with a text label and a numeric count.
- Recommendation evidence uses an icon + text; drill links are standard buttons
  with visible focus. The streak and "saved on this device" state are text, not
  colour.
