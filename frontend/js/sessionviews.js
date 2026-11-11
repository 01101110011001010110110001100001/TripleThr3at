// Guided session runtime views (TRI-12).
// Renders the current session phase (ready / countdown / active / rest /
// summary) from session.js state. Copy matches the final Figma prototype.
// Controls use data-action attributes wired in app.js; big .large-ctrl / touch
// targets keep the controls usable with gloves.

import { getDrill, formatDuration, targetLabel } from "./drills.js";
import { drillDiagram } from "./diagram.js";
import { getState } from "./session.js";
import { CUE } from "./feedback.js";
import { getVoiceStatus } from "./voice.js";

function tag(label) {
  return `<span class="tag tag--orange">${label}</span>`;
}

// --- Hands-free voice control (TRI-18) -----------------------------------

// Inner content of the voice panel. Rendered identically in every session
// phase and swapped in place by app.js, so one updater serves all of them.
// When the browser has no speech-recognition support the panel honestly says
// so and points at the always-available touch controls.
export function renderVoiceInner() {
  const v = getVoiceStatus();
  if (!v.supported) {
    return `<p class="voice-note"><span class="coach-glyph" aria-hidden="true">${CUE.unavailable.glyph}</span> Voice control isn’t available in this browser — the touch controls below always work.</p>`;
  }
  const on = v.enabled;
  const statusWord = on ? (v.listening ? "Listening…" : "On") : "Off";
  const heard = v.lastCommand
    ? `<span class="voice-ran">✓ Ran: <b>${v.lastCommand}</b></span>`
    : v.lastHeard
    ? `Heard: “${v.lastHeard}”`
    : "Listening — say a command.";
  return `
    <div class="voice-head">
      <span class="coach-eyebrow">Hands-free voice <span class="voice-tag">optional</span></span>
      <button type="button" class="coach-audio" data-action="toggle-voice" aria-pressed="${on}">
        <span class="coach-glyph" aria-hidden="true">${on ? "◉" : "○"}</span>
        <span>Voice: <b>${statusWord}</b></span>
      </button>
    </div>
    <p class="voice-cmds">Say: ${v.commands.map((c) => `<b>${c.label}</b>`).join(" · ")}</p>
    ${on ? `<p class="voice-heard">${heard}</p>` : ""}
    ${
      v.error === "not-allowed" || v.error === "service-not-allowed"
        ? `<p class="voice-err"><span class="coach-glyph" aria-hidden="true">${CUE.unavailable.glyph}</span> Microphone access was blocked — touch controls still work.</p>`
        : ""
    }
    <p class="voice-note"><span class="coach-glyph" aria-hidden="true">ⓘ</span> Touch always works. “End” by voice opens a confirmation first, so a misheard word never ends your session.</p>`;
}

// Voice panel wrapper. aria-live="off" so recognition status chatter never
// spams assistive tech — the real confirmation is the session change itself
// (announced by the pause banner / phase change).
export function renderVoice() {
  return `<div class="voice" data-bind="voice" aria-live="off">${renderVoiceInner()}</div>`;
}

// --- Live technique feedback (TRI-17) ------------------------------------

// Spoken-audio preference control. Honest about capability: when the browser
// has no speech support we say so and fall back to visual cues only.
function audioControl(st) {
  if (!st.audioSupported) {
    return `<p class="coach-audio coach-audio--off"><span class="coach-glyph" aria-hidden="true">${CUE.unavailable.glyph}</span> Audio prompts aren’t available in this browser — visual cues are shown instead.</p>`;
  }
  const on = st.audioOn;
  return `
    <button type="button" class="coach-audio" data-action="toggle-audio" aria-pressed="${on}">
      <span class="coach-glyph" aria-hidden="true">${on ? "♪" : CUE.unavailable.glyph}</span>
      <span>Audio prompts: <b>${on ? "On" : "Muted"}</b></span>
    </button>`;
}

// The live coaching panel body. Rendered inline in the active view and swapped
// in place by app.js whenever a prompt changes, so it never steals focus or
// resets scroll. Returns a transient prompt if one is showing, otherwise the
// steady technique reminder for the current drill.
export function renderCoach(st) {
  const p = st.prompt;
  const cue = p || {
    glyph: CUE.reminder.glyph,
    label: "Reminder",
    tone: "info",
    text: st.drill.cue,
  };
  return `
    <div class="coach-head">
      <span class="coach-eyebrow">Live coaching</span>
      ${audioControl(st)}
    </div>
    <div class="coach-row coach-row--${cue.tone}">
      <span class="coach-glyph" aria-hidden="true">${cue.glyph}</span>
      <span class="coach-text"><b>${cue.label}:</b> ${cue.text}</span>
    </div>
    <p class="coach-note">
      <span class="coach-glyph" aria-hidden="true">${CUE.unavailable.glyph}</span>
      Timer-only mode — these are time-based reminders, not live camera
      measurements. Movement tracking arrives in a later update.
    </p>`;
}

// The screen-reader announcement for the current prompt (empty when none).
// Fed into a single persistent live region so announcements are reliable and
// not duplicated by the parent <main aria-live="polite">.
export function coachAnnouncement(st) {
  return st.prompt ? `${st.prompt.label}. ${st.prompt.text}` : "";
}

// Finish-early confirmation dialog (shared by countdown / active / rest).
function confirmDialog(detail) {
  return `
    <div class="confirm-backdrop" data-action="keep-going"></div>
    <div class="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <h2 id="confirm-title">End workout early?</h2>
      <p>${detail}</p>
      <div class="confirm-actions">
        <button type="button" class="btn btn--secondary" data-action="keep-going">Keep going</button>
        <button type="button" class="btn btn--danger" data-action="confirm-end">End workout</button>
      </div>
    </div>`;
}

// --- Ready ---------------------------------------------------------------

function ready(st) {
  const d = st.drill;
  const n = st.workout.length;
  const goal =
    d.measurement === "repetitions" ? targetLabel(d) : "complete the full interval";
  return `
    <section class="view view--session session-ready">
      <button type="button" class="back-link" data-action="back-review"><span aria-hidden="true">←</span> Back to Workout Review</button>
      ${tag(`DRILL ${st.index + 1} OF ${n} · TIMER-ONLY MODE`)}
      <h1>Ready to <em>start?</em></h1>
      <p class="lead">${d.name} · Selected goal: ${goal}</p>

      ${drillDiagram(d)}

      <section class="next-brief">
        <span>COMING UP</span>
        <h2>${d.name}</h2>
        <p>${formatDuration(d.activeSeconds)} active · ${goal} · ${d.cue}</p>
      </section>

      <p class="timer-only-note"><b>Camera measurements unavailable in timer-only mode.</b> Use the touch countdown below. Camera tracking arrives in a later update.</p>

      ${demoToggle(st)}

      <div class="audio-pref">
        ${audioControl(st)}
        <p class="audio-pref__note">Spoken heads-up and “ten seconds left” prompts play during each drill. Visual cues always show; pause silences prompts and you can mute anytime.</p>
      </div>

      ${renderVoice()}

      <button type="button" class="btn btn--primary large-start" data-action="start-countdown">Start 3-Second Touch Countdown</button>
    </section>`;
}

// --- Countdown -----------------------------------------------------------

function countdown(st) {
  const n = st.workout.length;
  return `
    <section class="view view--session session-countdown">
      <div class="session-top">
        ${tag(`DRILL ${st.index + 1} OF ${n} · ${st.drill.name.toUpperCase()}`)}
        <button type="button" class="end-workout" data-action="end-confirm">End Workout</button>
      </div>
      <div class="countdown-number" data-bind="countdown" aria-live="assertive">${st.countdown}</div>
      <h2>${st.paused ? "Countdown paused" : "Get ready"}</h2>
      <p>Timer-only mode · touch controls active</p>
      <div class="countdown-actions">
        <button type="button" class="large-ctrl" data-action="toggle-pause">${st.paused ? "▶ Resume" : "Ⅱ Pause"}</button>
        <button type="button" class="large-ctrl secondary" data-action="start-now">Start now</button>
      </div>
      ${renderVoice()}
      ${st.confirmOpen ? confirmDialog("The countdown is paused. The summary will preserve the current drill as not started.") : ""}
    </section>`;
}

// --- Active --------------------------------------------------------------

function active(st) {
  const d = st.drill;
  const n = st.workout.length;
  return `
    <section class="view view--session session-active">
      <div class="session-top">
        ${tag(`DRILL ${st.index + 1} OF ${n} · TIMER ONLY`)}
        <button type="button" class="end-workout" data-action="end-confirm">End Workout</button>
      </div>

      <div class="active-content">
        <div class="active-readout">
          <div class="active-label">${d.name.toUpperCase()}</div>
          <div class="timer" data-bind="active-remaining" role="timer" aria-live="off">${formatDuration(st.activeRemaining)}</div>
          <div class="timer-caption">ACTIVE TIME REMAINING</div>
        </div>
        <div class="active-diagram">
          ${drillDiagram(d)}
          <p class="active-diagram__note">Instruction diagram · timer-only mode</p>
        </div>
      </div>

      <div class="coach" data-bind="coach" aria-live="off">${renderCoach(st)}</div>
      <span class="sr-only" data-bind="coach-sr" role="status" aria-live="assertive">${coachAnnouncement(st)}</span>

      ${st.paused ? `<div class="pause-banner">Workout paused · elapsed active time and audio prompts are stopped</div>` : ""}

      <div class="active-controls">
        <button type="button" class="large-ctrl" data-action="toggle-pause"><b aria-hidden="true">${st.paused ? "▶" : "Ⅱ"}</b><span>${st.paused ? "Resume" : "Pause"}</span></button>
        <button type="button" class="large-ctrl primary" data-action="complete-drill"><b aria-hidden="true">✓</b><span>Complete Drill</span></button>
      </div>

      ${renderVoice()}

      ${st.confirmOpen ? confirmDialog("The active timer is paused. The summary will include only active and rest time completed before this dialog opened.") : ""}
    </section>`;
}

// --- Rest ----------------------------------------------------------------

function rest(st) {
  const n = st.workout.length;
  const next = getDrill(st.workout[st.index + 1]);
  const nextGoal =
    next.measurement === "repetitions" ? targetLabel(next) : "complete the full interval";
  return `
    <section class="view view--session session-rest">
      <div class="rest-icon" aria-hidden="true">◷</div>
      ${tag(`DRILL ${st.index + 1} OF ${n} COMPLETE`)}
      <h1>Rest</h1>
      <div class="rest-timer" data-bind="rest-remaining" role="timer" aria-live="off">${formatDuration(st.restRemaining)}</div>
      <p>${st.paused ? "Rest paused · the next drill will not start yet." : "Rest ends on the next drill’s Ready screen."}</p>

      <section class="next-drill">
        <span>NEXT · DRILL ${st.index + 2} OF ${n}</span>
        <h2>${next.name}</h2>
        <p><b>Selected duration:</b> ${formatDuration(next.activeSeconds)}</p>
        <p><b>Selected goal:</b> ${nextGoal}</p>
        <p><b>Instructions:</b> ${next.instructions[0]}</p>
        <p><b>Technique cue:</b> ${next.cue}</p>
      </section>

      <div class="rest-actions">
        <button type="button" class="large-ctrl dark" data-action="toggle-pause">${st.paused ? "Resume Rest" : "Pause Rest"}</button>
        <button type="button" class="large-ctrl" data-action="skip-rest">Skip Rest · Ready Next Drill</button>
        <button type="button" class="end-rest" data-action="end-confirm">End workout early</button>
      </div>

      ${renderVoice()}

      ${st.confirmOpen ? confirmDialog("The rest timer is paused. The next drill will not start while this dialog is open.") : ""}
    </section>`;
}

// --- Summary -------------------------------------------------------------

function summary(st) {
  const n = st.workout.length;
  const early = st.endedEarly;
  const completed = st.completedCount;

  const rows = st.workout
    .map((name, i) => {
      const d = getDrill(name);
      const done = i < completed;
      const partial = st.partial && i === completed;
      const statusIcon = done ? "✓" : partial ? "◐" : "○";
      const statusText = done
        ? "Completed"
        : partial
        ? "Partially completed"
        : "Not started";
      const goal =
        d.measurement === "repetitions" ? targetLabel(d) : "Timed technique goal";
      return `
      <li class="summary-drill ${done ? "is-done" : partial ? "is-partial" : ""}">
        <span class="summary-status" aria-hidden="true">${statusIcon}</span>
        <div>
          <b>${name}</b>
          <small>${formatDuration(d.activeSeconds)} · ${goal} · ${statusText}</small>
        </div>
      </li>`;
    })
    .join("");

  return `
    <section class="view view--session session-summary">
      <div class="summary-hero">
        <div class="trophy" aria-hidden="true">${early ? "◷" : "★"}</div>
        ${tag(early ? "WORKOUT ENDED EARLY" : "WORKOUT COMPLETE")}
        <h1>${early ? "Good work <em>showing up.</em>" : "Workout <em>complete.</em>"}</h1>
        <p>${
          early
            ? "This summary includes only the training and rest time completed before you stopped."
            : "You completed every selected drill in the planned order."
        }</p>
      </div>

      <div class="summary-metrics">
        <div class="metric">
          <small>COMPLETED DRILLS</small>
          <b>${completed} of ${n}</b>
          <span>${st.partial ? "1 partially completed" : early ? "Stopped before the next drill" : "Full workout"}</span>
        </div>
        <div class="metric">
          <small>ELAPSED ACTIVE TIME</small>
          <b>${formatDuration(st.activeElapsed)}</b>
          <span>${formatDuration(st.restElapsed)} elapsed rest</span>
        </div>
        <div class="metric">
          <small>TRAINING MODE</small>
          <b>Timer only</b>
          <span>No camera measurements</span>
        </div>
      </div>

      <section class="panel summary-drill-list">
        <h3>Workout drill status</h3>
        <ul>${rows}</ul>
      </section>

      <div class="cta-row">
        <button type="button" class="btn btn--primary" data-action="back-training">Back to Training</button>
        <button type="button" class="btn btn--secondary" data-action="back-review">Review This Workout</button>
      </div>
    </section>`;
}

// --- Shared bits ---------------------------------------------------------

function demoToggle(st) {
  return `
    <label class="demo-speed">
      <input type="checkbox" data-action="toggle-demo" ${st.demo ? "checked" : ""} />
      <span>Demo speed <b>${st.demo ? "on" : "off"}</b> — runs timers ~15× so the flow is quick to review.</span>
    </label>`;
}

function fallback() {
  return `
    <section class="view view--session">
      <h1>No active workout</h1>
      <p class="lead">Start a session from the workout review to use the guided timers.</p>
      <div class="cta-row"><a class="btn btn--primary" href="#/training">Go to Workout Builder</a></div>
    </section>`;
}

const PHASES = { ready, countdown, active, rest, summary };

// Returns the HTML for the current session phase.
export function renderSession() {
  const st = getState();
  if (!st.workout.length) return fallback();
  const fn = PHASES[st.phase] || fallback;
  return fn(st);
}
