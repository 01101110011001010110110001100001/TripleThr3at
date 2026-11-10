// Guided workout session runtime (TRI-12).
// -------------------------------------------------------------------------
// Drives the pause-aware workout: a small state machine that walks the chosen
// drill order through ready → countdown → active → rest → summary, with
// pause/resume, finish-early confirmation, and a completion summary.
//
// Timers are pause-aware: the 1-second tick only advances while the session is
// running (not paused, no confirm dialog open), so paused time is excluded
// from the elapsed active/rest totals. Completion is guarded so a drill cannot
// be completed twice (timer reaching zero and the Complete button cannot both
// advance the session).
//
// The runtime owns its interval and notifies subscribers with a reason:
//   "tick"  — only a timer value changed (update the time display in place)
//   "phase" — structural change (re-render the view)

import { getDrill } from "./drills.js";

const DEMO_MULTIPLIER = 15; // demo speed so a review isn't a 4-minute wait

const s = {
  activeRun: false, // is a session in progress (vs. idle)
  mode: "timer", // "timer" (built here) | "camera" (simulated — TRI-15)
  source: "custom",
  workout: [], // snapshot of the chosen drill order (names)
  index: 0,
  phase: "ready", // ready | countdown | active | rest | summary
  countdown: 3,
  activeRemaining: 0,
  restRemaining: 0,
  activeElapsed: 0, // accumulated, pause-excluded
  restElapsed: 0,
  currentActiveElapsed: 0, // active time on the current drill (for "partial")
  completedCount: 0, // drills fully completed
  partial: false, // current drill partially done when ended early
  paused: false,
  confirmOpen: false,
  endedEarly: false,
  demo: true,
};

let timer = null;
const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(reason) {
  listeners.forEach((fn) => fn(reason));
}

// --- Interval ------------------------------------------------------------

function running() {
  return s.activeRun && !s.paused && !s.confirmOpen;
}

function startLoop() {
  if (timer) return;
  timer = setInterval(tick, 1000);
}

function stopLoop() {
  if (timer) clearInterval(timer);
  timer = null;
}

function currentDrill() {
  return getDrill(s.workout[s.index]);
}

function tick() {
  if (!running()) return; // pause-aware: no time accrues while paused/confirming

  if (s.phase === "countdown") {
    s.countdown -= 1;
    if (s.countdown <= 0) {
      enterActive();
      notify("phase");
    } else {
      notify("tick");
    }
    return;
  }

  if (s.phase === "active") {
    const step = s.demo ? DEMO_MULTIPLIER : 1;
    const dec = Math.min(step, s.activeRemaining);
    s.activeRemaining -= dec;
    s.activeElapsed += dec;
    s.currentActiveElapsed += dec;
    if (s.activeRemaining <= 0) {
      completeDrill();
    } else {
      notify("tick");
    }
    return;
  }

  if (s.phase === "rest") {
    const step = s.demo ? DEMO_MULTIPLIER : 1;
    const dec = Math.min(step, s.restRemaining);
    s.restRemaining -= dec;
    s.restElapsed += dec;
    if (s.restRemaining <= 0) {
      continueNext();
    } else {
      notify("tick");
    }
    return;
  }
}

// --- Phase transitions ---------------------------------------------------

function enterActive() {
  const d = currentDrill();
  s.phase = "active";
  s.activeRemaining = d.activeSeconds;
  s.currentActiveElapsed = 0;
}

// Completing the current drill — guarded so it only fires once per drill.
function completeDrill() {
  if (s.phase !== "active") return;
  s.completedCount = s.index + 1;
  const isLast = s.index >= s.workout.length - 1;
  if (isLast) {
    finish(false);
    return;
  }
  const d = currentDrill();
  if (d.restSeconds > 0) {
    s.phase = "rest";
    s.restRemaining = d.restSeconds;
  } else {
    continueNext();
    return;
  }
  notify("phase");
}

function continueNext() {
  s.index += 1;
  if (s.index >= s.workout.length) {
    finish(false);
    return;
  }
  s.phase = "ready";
  notify("phase");
}

function finish(early) {
  s.endedEarly = early;
  // A drill with some active time that was not completed counts as partial.
  s.partial =
    early && s.phase === "active" && s.currentActiveElapsed > 0;
  s.phase = "summary";
  s.activeRun = false;
  s.paused = false;
  s.confirmOpen = false;
  stopLoop();
  notify("phase");
}

// --- Public controls -----------------------------------------------------

export function beginSession({ workout, source, mode = "timer" }) {
  s.activeRun = true;
  s.mode = mode;
  s.source = source;
  s.workout = [...workout];
  s.index = 0;
  s.phase = "ready";
  s.countdown = 3;
  s.activeRemaining = 0;
  s.restRemaining = 0;
  s.activeElapsed = 0;
  s.restElapsed = 0;
  s.currentActiveElapsed = 0;
  s.completedCount = 0;
  s.partial = false;
  s.paused = false;
  s.confirmOpen = false;
  s.endedEarly = false;
  startLoop();
  notify("phase");
}

export function startCountdown() {
  s.phase = "countdown";
  s.countdown = 3;
  s.paused = false;
  notify("phase");
}

// Skip the countdown and begin the active timer immediately.
export function startNow() {
  enterActive();
  notify("phase");
}

export function togglePause() {
  s.paused = !s.paused;
  notify("phase");
}

// "Complete Drill" button — same guarded path as the timer reaching zero.
export function completeNow() {
  if (s.phase !== "active") return;
  s.activeRemaining = 0;
  completeDrill();
}

// Skip the rest period and advance to the next drill.
export function skipRest() {
  if (s.phase !== "rest") return;
  continueNext();
}

export function openEndConfirm() {
  s.confirmOpen = true;
  notify("phase");
}

export function keepGoing() {
  s.confirmOpen = false;
  notify("phase");
}

export function confirmEnd() {
  finish(true);
}

export function toggleDemo() {
  s.demo = !s.demo;
  notify("phase");
}

// Tear down and leave the session (back to the training list).
export function resetSession() {
  s.activeRun = false;
  s.phase = "ready";
  stopLoop();
}

export function isActive() {
  return s.activeRun || s.phase === "summary";
}

// Read-only snapshot for the views.
export function getState() {
  return { ...s, drill: s.workout.length ? currentDrill() : null };
}
