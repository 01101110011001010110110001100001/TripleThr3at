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
import {
  reminderRotation,
  makeCue,
  TEN_SECONDS_CUE,
  speak,
  cancelSpeech,
  audioEnabled,
  speechSupported,
  toggleAudio,
} from "./feedback.js";

const DEMO_MULTIPLIER = 15; // demo speed so a review isn't a 4-minute wait

// Live-feedback cadence (all measured in real drill-seconds, so the schedule is
// unaffected by demo speed). Reminders are rate-limited to one per REMINDER_GAP.
const REMINDER_FIRST = 20; // first reminder after 20s of active time
const REMINDER_GAP = 45; // minimum active-seconds between reminders
const PROMPT_TTL = 8; // active-seconds a transient prompt stays on screen
const TEN_AT = 10; // "ten seconds left" threshold
const REMINDER_LOCKOUT = 15; // no reminders inside the final seconds

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

  // --- Live technique feedback (TRI-17) ---
  prompt: null, // current transient cue {kind, glyph, label, tone, text} or null
  promptTtl: 0, // active-seconds the current prompt stays visible
  announce: 0, // bumps whenever a prompt should be announced (SR live region)
  reminders: [], // per-drill reminder rotation
  reminderIndex: 0,
  nextReminderAt: REMINDER_FIRST, // active-elapsed threshold for the next reminder
  tenFired: false, // ten-seconds-left prompt fired for this drill
  audioOn: audioEnabled(), // spoken prompts on (and supported)
  audioSupported: speechSupported(),
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
    const prevRemaining = s.activeRemaining;
    s.activeRemaining -= dec;
    s.activeElapsed += dec;
    s.currentActiveElapsed += dec;
    if (s.activeRemaining <= 0) {
      completeDrill();
      return;
    }
    // Live feedback: a changed prompt needs a coach re-render ("coach"),
    // otherwise only the timer readout moved ("tick").
    const changed = updateActiveFeedback(prevRemaining, dec);
    notify(changed ? "coach" : "tick");
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
  // Reset per-drill live feedback and announce the start.
  s.reminders = reminderRotation(d);
  s.reminderIndex = 0;
  s.nextReminderAt = REMINDER_FIRST;
  s.tenFired = false;
  s.prompt = null;
  s.promptTtl = 0;
  speak(`${d.name}. Go.`);
}

// --- Live technique feedback (TRI-17) ------------------------------------

// Show a cue and (if audio is on and the session is running) speak it. Pause
// silences prompts because the tick is gated by running(), so this is only
// ever reached while the session is actually running.
function setPrompt(cue) {
  s.prompt = cue;
  s.promptTtl = PROMPT_TTL;
  s.announce += 1; // signals the SR live region to re-announce
  speak(`${cue.label}. ${cue.text}`);
}

// Runs once per active tick (never while paused). Returns true when the visible
// prompt changed, so the caller knows to re-render the coach panel.
function updateActiveFeedback(prevRemaining, dec) {
  let changed = false;

  // Expire the current transient prompt back to the steady reminder.
  if (s.prompt) {
    s.promptTtl -= dec;
    if (s.promptTtl <= 0) {
      s.prompt = null;
      changed = true;
    }
  }

  // Ten-seconds-left prompt — fires once, on crossing into the final window.
  if (!s.tenFired && prevRemaining > TEN_AT && s.activeRemaining <= TEN_AT) {
    setPrompt(TEN_SECONDS_CUE);
    s.tenFired = true;
    return true;
  }

  // Heads-up / posture reminder — rate-limited, and never in the final seconds
  // where it would collide with the ten-seconds prompt.
  if (
    s.activeRemaining > REMINDER_LOCKOUT &&
    s.activeElapsed >= s.nextReminderAt &&
    s.reminders.length
  ) {
    setPrompt(s.reminders[s.reminderIndex % s.reminders.length]);
    s.reminderIndex += 1;
    s.nextReminderAt = s.activeElapsed + REMINDER_GAP;
    return true;
  }

  return changed;
}

// Integration seam for real computer-vision tracking (TRI-15). Timer-only mode
// never calls this, so measured positive/corrective cues are never faked; once
// TRI-15 emits events, routing them here surfaces live feedback with no change
// to the session views. `evt` is { kind: "positive"|"corrective"|..., text }.
export function ingestTrackingEvent(evt) {
  if (!running() || s.phase !== "active" || !evt || !evt.text) return;
  setPrompt(makeCue(evt.kind || "reminder", evt.text));
  notify("coach");
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
  s.prompt = null;
  cancelSpeech(); // never talk over the summary
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
  s.prompt = null;
  s.promptTtl = 0;
  s.reminders = [];
  s.reminderIndex = 0;
  s.nextReminderAt = REMINDER_FIRST;
  s.tenFired = false;
  s.audioOn = audioEnabled();
  s.audioSupported = speechSupported();
  cancelSpeech();
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
  if (s.paused) cancelSpeech(); // pause silences in-flight audio prompts
  notify("phase");
}

// Mute / unmute spoken prompts (visual cues always remain). Persists.
export function toggleAudioPrompts() {
  s.audioOn = toggleAudio();
  notify("phase");
  return s.audioOn;
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
  s.prompt = null;
  cancelSpeech();
  stopLoop();
}

export function isActive() {
  return s.activeRun || s.phase === "summary";
}

// Read-only snapshot for the views.
export function getState() {
  return { ...s, drill: s.workout.length ? currentDrill() : null };
}
