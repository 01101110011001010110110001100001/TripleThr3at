// Live technique feedback — cue vocabulary + audio prompts (TRI-17).
// -------------------------------------------------------------------------
// The guided session (TRI-12) runs in **timer-only** mode: real computer-vision
// tracking (TRI-15) is not wired in yet. This module is the single place the UI
// turns *tracking events* into athlete-facing cues, so when TRI-15 lands the
// session screens need no change — they already render whatever cue the engine
// produces (see `session.js` → `ingestTrackingEvent`).
//
// Until tracking exists, the session emits **time-based** heads-up / posture
// reminders and the ten-seconds-left prompt, and it is honest that nothing is
// being measured from a camera. Design rules enforced here:
//   • Every cue carries a non-colour glyph + a text label — never colour alone.
//   • Audio is an optional enhancement: it can be muted and the preference
//     persists; it is silenced while the session is paused (session.js).
//   • Positive / corrective cues are only produced from real tracking events,
//     so timer-only mode never fakes measured feedback.

const AUDIO_KEY = "ss_feedback_audio";

// Cue kinds → accessible glyph + spoken label + tone class (for CSS only).
// Glyphs are monochrome Unicode that render without relying on colour.
export const CUE = {
  positive: { glyph: "✓", label: "Good", tone: "good" },
  corrective: { glyph: "△", label: "Adjust", tone: "warn" },
  heads_up: { glyph: "⊙", label: "Heads up", tone: "info" },
  reminder: { glyph: "ⓘ", label: "Reminder", tone: "info" },
  time: { glyph: "◷", label: "Time", tone: "time" },
  unavailable: { glyph: "⊘", label: "Tracking", tone: "muted" },
};

// Build a full cue object {kind, glyph, label, tone, text} from a kind + text.
export function makeCue(kind, text) {
  const meta = CUE[kind] || CUE.reminder;
  return { kind, glyph: meta.glyph, label: meta.label, tone: meta.tone, text };
}

// The ten-seconds-left prompt (same for every drill).
export const TEN_SECONDS_CUE = makeCue("time", "Ten seconds left — strong finish.");

// Per-drill reminder rotation: heads-up, the drill's own technique cue, posture.
// Time-based reminders only — honestly framed as reminders, not measurements.
export function reminderRotation(drill) {
  return [
    makeCue("heads_up", "Eyes up — look forward, not down at the puck."),
    makeCue("reminder", (drill && drill.cue) || "Keep your technique clean and controlled."),
    makeCue("heads_up", "Stay low — chest up, knees soft, weight balanced."),
  ];
}

// --- Audio (Web Speech API, capability-honest) ---------------------------

let audioOn = loadAudioPref();

function loadAudioPref() {
  try {
    // Default ON; a stored "off" mutes it. Guarded for private-mode throws.
    return localStorage.getItem(AUDIO_KEY) !== "off";
  } catch {
    return true;
  }
}

// Is spoken audio even possible in this browser? Shown honestly in the UI.
export function speechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function audioEnabled() {
  return audioOn && speechSupported();
}

export function setAudio(on) {
  audioOn = !!on;
  try {
    localStorage.setItem(AUDIO_KEY, audioOn ? "on" : "off");
  } catch {
    /* persistence is best-effort */
  }
  if (!audioOn) cancelSpeech();
  return audioEnabled();
}

export function toggleAudio() {
  return setAudio(!audioOn);
}

// Stop anything currently being spoken (used on pause / leave / new prompt).
export function cancelSpeech() {
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

// Speak a short prompt. Returns true only if it was actually spoken, so the
// caller never assumes audio happened. The latest prompt cancels any previous
// one, so prompts never queue up (an extra guard against audio spam).
export function speak(text) {
  if (!audioEnabled() || !text) return false;
  try {
    const u = new SpeechSynthesisUtterance(String(text));
    u.rate = 1.05;
    u.pitch = 1;
    u.volume = 1;
    u.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}
