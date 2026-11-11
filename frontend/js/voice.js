// Hands-free voice control — supported-subset, opt-in, false-trigger-safe (TRI-18).
// -------------------------------------------------------------------------
// Touch is always the reliable baseline (big glove-friendly controls); voice is
// an **optional** convenience layer for the core transport commands. It is only
// exposed when the browser actually supports the Web Speech *recognition* API
// (Chromium-family today), so unsupported browsers simply never see it.
//
// False triggers are the main risk with always-listening voice, so:
//   • It is **opt-in** (off by default) and **not persisted** — nothing listens
//     until the athlete taps the toggle (that tap is also the gesture that
//     requests microphone permission), and a reload starts fresh (no surprise
//     mic access).
//   • Only an **exact, tiny grammar** maps to commands; anything else is ignored.
//   • The destructive command ("end") never ends directly — the caller routes it
//     to the existing confirmation dialog, so a misheard word cannot end a
//     session.
//   • Repeated identical commands are **debounced**.
//   • Recognition is scoped to the guided session and stopped on leaving it.
//
// See docs/hands-free-controls.md for the full scope decision.

const DEBOUNCE_MS = 1200;

// The exposed, supported command set. `words` are matched as whole words/phrases
// (longer phrases listed first so "end workout" wins over "end").
const VOCAB = [
  { cmd: "start", label: "“Start”", words: ["start", "begin"] },
  { cmd: "pause", label: "“Pause”", words: ["pause", "hold"] },
  { cmd: "resume", label: "“Resume”", words: ["resume", "continue"] },
  { cmd: "skip", label: "“Skip”", words: ["skip"] },
  { cmd: "end", label: "“End”", words: ["end workout", "stop workout", "end", "stop"] },
];

let rec = null;
let enabled = false;
let listening = false;
let lastHeard = "";
let lastCommand = "";
let error = "";
let onCommand = null;
let onStatus = null;
let lastCmdName = "";
let lastCmdAt = 0;

export function voiceSupported() {
  return (
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );
}

// Register the command + status callbacks (wired once in app.js).
export function initVoice({ onCommand: oc, onStatus: os } = {}) {
  onCommand = oc || null;
  onStatus = os || null;
}

export function getVoiceStatus() {
  return {
    supported: voiceSupported(),
    enabled,
    listening,
    lastHeard,
    lastCommand,
    error,
    commands: VOCAB.map(({ cmd, label }) => ({ cmd, label })),
  };
}

function emitStatus() {
  if (onStatus) onStatus(getVoiceStatus());
}

// Map a raw transcript to a supported command, or null. Whole-word match only.
function parse(transcript) {
  const t = ` ${transcript.toLowerCase().replace(/[^a-z\s]/g, " ")} `.replace(/\s+/g, " ");
  for (const { cmd, words } of VOCAB) {
    for (const w of words) {
      if (t.includes(` ${w} `)) return cmd;
    }
  }
  return null;
}

function buildRecognition() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const r = new Ctor();
  r.lang = "en-US";
  r.continuous = true;
  r.interimResults = false;
  r.maxAlternatives = 1;

  r.onstart = () => {
    listening = true;
    error = "";
    emitStatus();
  };

  r.onresult = (e) => {
    const res = e.results[e.results.length - 1];
    if (!res || !res.isFinal) return;
    const alt = res[0];
    lastHeard = (alt.transcript || "").trim();
    const cmd = parse(lastHeard);
    // Some engines report confidence 0 for continuous results; accept those,
    // but reject a low positive confidence as a likely mishear.
    const confOk = !alt.confidence || alt.confidence >= 0.5;
    if (cmd && confOk) {
      const now = Date.now();
      if (cmd === lastCmdName && now - lastCmdAt < DEBOUNCE_MS) {
        emitStatus();
        return; // debounce repeats
      }
      lastCmdName = cmd;
      lastCmdAt = now;
      lastCommand = cmd;
      emitStatus();
      if (onCommand) onCommand(cmd);
    } else {
      emitStatus(); // heard something, but not a command
    }
  };

  r.onerror = (e) => {
    error = e.error || "error";
    if (error === "not-allowed" || error === "service-not-allowed") {
      enabled = false;
      listening = false;
    }
    emitStatus();
  };

  r.onend = () => {
    listening = false;
    // Continuous recognition stops itself on silence; restart while enabled.
    if (enabled) {
      try {
        r.start();
        listening = true;
      } catch {
        /* already starting */
      }
    }
    emitStatus();
  };

  return r;
}

export function enableVoice() {
  if (!voiceSupported()) return false;
  if (!rec) rec = buildRecognition();
  enabled = true;
  error = "";
  lastHeard = "";
  lastCommand = "";
  try {
    rec.start();
  } catch {
    /* start() throws if already running — fine */
  }
  emitStatus();
  return true;
}

export function disableVoice() {
  enabled = false;
  listening = false;
  if (rec) {
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
  }
  emitStatus();
}

export function toggleVoice() {
  if (enabled) {
    disableVoice();
    return false;
  }
  return enableVoice();
}

export function isVoiceEnabled() {
  return enabled;
}
