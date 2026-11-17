// Saved workout history & progress metrics (TRI-23).
// -------------------------------------------------------------------------
// The guided session (session.js) records one entry here every time a session
// reaches its summary — complete OR ended early. Progress reads these REAL
// saved metrics; it never fabricates data.
//
// Honesty rules enforced here:
//   • Only metrics that timer-only mode can actually observe are stored:
//     elapsed active / rest time and which drills were completed. Repetition
//     counts need camera tracking (TRI-15), so they are NOT stored and must be
//     shown as "not measured", never as 0 — missing data is distinct from zero.
//   • Recommendations are derived from the stored history and cite the counts
//     they are based on; with no history there are no recommendations.
//
// Records persist to localStorage (guest, on-device). Every access is guarded
// for private-mode / blocked storage.

import { DRILLS, getDrill } from "./drills.js";

const STORAGE_KEY = "sticksmart.history.v1";
const MAX_RECORDS = 200; // keep storage bounded; newest kept
const DAY = 86400000;

// The four training focuses present in the catalog (one drill each).
export const FOCUSES = ["Puck control", "Speed", "Coordination", "Awareness"];

let records = load(); // newest-first
const listeners = new Set();

// --- Persistence ---------------------------------------------------------

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRecord).sort((a, b) => b.ts - a.ts);
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* best-effort; persistence is a convenience */
  }
}

function isValidRecord(r) {
  return (
    r &&
    typeof r.ts === "number" &&
    Array.isArray(r.workout) &&
    typeof r.completedCount === "number"
  );
}

// --- Subscriptions -------------------------------------------------------

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

// --- Recording -----------------------------------------------------------

// Build and store a record from a finished-session snapshot (session.js state).
// Returns the stored record. Defensive against partial snapshots.
export function recordSession(snap) {
  if (!snap || !Array.isArray(snap.workout) || !snap.workout.length) return null;
  const completedCount = Math.max(0, Math.min(snap.completedCount || 0, snap.workout.length));
  const record = {
    ts: Date.now(),
    source: snap.source || "custom",
    mode: snap.mode || "timer",
    workout: [...snap.workout],
    plannedCount: snap.workout.length,
    completedCount,
    partial: !!snap.partial,
    endedEarly: !!snap.endedEarly,
    activeSeconds: Math.round(snap.activeElapsed || 0),
    restSeconds: Math.round(snap.restElapsed || 0),
  };
  records = [record, ...records].slice(0, MAX_RECORDS);
  save();
  notify();
  return record;
}

// Remove all saved progress (guest, on-device). Caller confirms intent.
export function clearHistory() {
  records = [];
  save();
  notify();
}

// --- Reads ---------------------------------------------------------------

export function getSessions() {
  return [...records];
}

export function getLatest() {
  return records[0] || null;
}

function inWindow(fromDaysAgo, toDaysAgo) {
  const now = Date.now();
  const start = now - toDaysAgo * DAY;
  const end = now - fromDaysAgo * DAY;
  return records.filter((r) => r.ts >= start && r.ts < end + 1);
}

// Aggregate a set of records. `byFocus` counts COMPLETED drills per focus only.
export function summarize(list) {
  const sum = {
    count: list.length,
    activeSeconds: 0,
    restSeconds: 0,
    drillsCompleted: 0,
    fullCompletions: 0,
    byFocus: {},
  };
  FOCUSES.forEach((f) => (sum.byFocus[f] = 0));
  list.forEach((r) => {
    sum.activeSeconds += r.activeSeconds || 0;
    sum.restSeconds += r.restSeconds || 0;
    sum.drillsCompleted += r.completedCount || 0;
    if (!r.endedEarly) sum.fullCompletions += 1;
    for (let i = 0; i < r.completedCount; i++) {
      const d = getDrill(r.workout[i]);
      if (d && sum.byFocus[d.focus] != null) sum.byFocus[d.focus] += 1;
    }
  });
  return sum;
}

// Consecutive-day streak ending today or yesterday (keeps the streak alive
// until a full day is actually missed).
export function currentStreak() {
  if (!records.length) return 0;
  const days = new Set(
    records.map((r) => Math.floor(r.ts / DAY)) // day index
  );
  const today = Math.floor(Date.now() / DAY);
  if (!days.has(today) && !days.has(today - 1)) return 0;
  let streak = 0;
  let d = days.has(today) ? today : today - 1;
  while (days.has(d)) {
    streak += 1;
    d -= 1;
  }
  return streak;
}

// Everything the Progress view needs, computed from real saved metrics.
export function getProgress() {
  return {
    all: getSessions(),
    latest: getLatest(),
    week: { current: summarize(inWindow(0, 7)), previous: summarize(inWindow(7, 14)) },
    month: summarize(inWindow(0, 30)),
    allTime: summarize(records),
    streak: currentStreak(),
  };
}

// --- Recommendations (explainable, evidence-citing) ----------------------

// Returns up to three recommendations, each { title, text, evidence, drill? }.
// Every recommendation is derived from stored history and states the counts it
// is based on. With no history, returns [] — no advice is invented.
// `prefs` is passed in (goalFocus) so this module stays free of a prefs import.
export function recommend({ goalFocus } = {}) {
  if (!records.length) return [];
  const recs = [];
  const used = new Set(); // drill names already recommended

  const recent = inWindow(0, 14);
  const basis = recent.length ? recent : records;
  const windowLabel = recent.length ? "the last 2 weeks" : "your sessions so far";
  const sum = summarize(basis);

  // 1) Balance: nudge toward the least-trained focus.
  const counts = FOCUSES.map((f) => [f, sum.byFocus[f] || 0]).sort((a, b) => a[1] - b[1]);
  const [leastFocus, leastCount] = counts[0];
  const [topFocus, topCount] = counts[counts.length - 1];
  if (topCount > leastCount) {
    const drill = DRILLS.find((d) => d.focus === leastFocus);
    if (drill) {
      used.add(drill.name);
      recs.push({
        title: `Add more ${leastFocus.toLowerCase()} training`,
        text: `Add ${drill.name} to even out your training.`,
        evidence: `In ${windowLabel} you completed ${topFocus} ${topCount}× but ${leastFocus} only ${leastCount}×.`,
        drill,
      });
    }
  }

  // 2) Goal alignment: if the user's primary goal is under-trained, surface it.
  if (goalFocus && FOCUSES.includes(goalFocus)) {
    const drill = DRILLS.find((d) => d.focus === goalFocus);
    const goalCount = sum.byFocus[goalFocus] || 0;
    const avg = sum.drillsCompleted / FOCUSES.length;
    if (drill && !used.has(drill.name) && goalCount <= avg) {
      used.add(drill.name);
      recs.push({
        title: `Work toward your goal`,
        text: `${drill.name} targets ${goalFocus.toLowerCase()}, your chosen focus.`,
        evidence: `Your primary goal is ${goalFocus}, completed ${goalCount}× in ${windowLabel}.`,
        drill,
      });
    }
  }

  // 3) Consistency: if it has been a few days, nudge a short session.
  const daysSince = Math.floor((Date.now() - records[0].ts) / DAY);
  if (daysSince >= 3) {
    recs.push({
      title: "Get back on the ice",
      text: "A short session keeps your hands sharp.",
      evidence: `Your last saved workout was ${daysSince} day${daysSince === 1 ? "" : "s"} ago.`,
    });
  }

  // 4) Early-finish pattern: suggest a shorter, finishable workout.
  const last = records.slice(0, 3);
  const early = last.filter((r) => r.endedEarly).length;
  if (last.length >= 2 && early >= 2) {
    recs.push({
      title: "Try a shorter workout",
      text: "Build a 2-drill session you can finish fully.",
      evidence: `${early} of your last ${last.length} workouts ended early.`,
    });
  }

  return recs.slice(0, 3);
}
