// User preferences, guest identity & profile state (TRI-24).
// -------------------------------------------------------------------------
// The single source of truth for the guest's supported preferences: training
// environment, skill level / primary goal, two accessibility toggles (large
// workout text, reduced motion), and an OPTIONAL location/weather opt-in.
//
// Design rules enforced here (from the final Figma and the TRI-24 acceptance
// criteria):
//   • Every control is functional — a preference is stored, applied, and read
//     back; there are no decorative toggles that do nothing.
//   • The location/weather prompt is OPTIONAL and defaults OFF. Nothing in the
//     app gates training on it, so declining it never blocks indoor training.
//   • Accessibility toggles take effect immediately by adding a class to the
//     document element, so CSS can respond app-wide (see css/styles.css).
//   • Preferences persist to localStorage and survive navigation / reload,
//     with every access guarded for private-mode / blocked storage.
//
// Spoken-audio ("Audio prompts") is NOT stored here — feedback.js already owns
// that preference (shared with the guided session), so settings delegates to it
// rather than keeping a second, divergent copy.

const STORAGE_KEY = "sticksmart.prefs.v1";

// Allowed values, so a stale/garbage stored value can never set an unknown
// state. The first entry of each is the default.
export const ENVIRONMENTS = ["indoor", "outdoor"];
export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"];
export const GOALS = ["control", "speed", "coordination", "awareness"];

// Human labels for the stored values (used by the views and recommendations).
export const GOAL_LABELS = {
  control: "Puck control",
  speed: "Hand speed",
  coordination: "Coordination",
  awareness: "Head-up awareness",
};
export const SKILL_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const DEFAULTS = {
  displayName: "", // optional guest display name
  environment: "indoor",
  skillLevel: "beginner",
  primaryGoal: "control",
  largeText: false, // accessibility: larger workout text
  reducedMotion: false, // accessibility: user override on top of the OS setting
  locationWeather: false, // OPTIONAL outdoor weather tips — off by default
  setupComplete: false, // has the optional setup flow been acknowledged
};

const state = { ...DEFAULTS };
const listeners = new Set();

// --- Persistence ---------------------------------------------------------

function sanitize(saved) {
  if (!saved || typeof saved !== "object") return;
  if (typeof saved.displayName === "string") {
    state.displayName = saved.displayName.slice(0, 40);
  }
  if (ENVIRONMENTS.includes(saved.environment)) state.environment = saved.environment;
  if (SKILL_LEVELS.includes(saved.skillLevel)) state.skillLevel = saved.skillLevel;
  if (GOALS.includes(saved.primaryGoal)) state.primaryGoal = saved.primaryGoal;
  state.largeText = !!saved.largeText;
  state.reducedMotion = !!saved.reducedMotion;
  state.locationWeather = !!saved.locationWeather;
  state.setupComplete = !!saved.setupComplete;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) sanitize(JSON.parse(raw));
  } catch {
    /* private mode / blocked storage — run with defaults */
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* persistence is a convenience, not a requirement */
  }
}

// --- Apply to the document -----------------------------------------------

// Accessibility preferences are reflected as classes on <html> so the whole
// app (and the guided session) responds without each view opting in.
export function applyPrefs() {
  const root = document.documentElement;
  if (!root) return;
  root.classList.toggle("pref-large-text", state.largeText);
  root.classList.toggle("pref-reduced-motion", state.reducedMotion);
}

// --- Subscriptions -------------------------------------------------------

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

// --- Getters -------------------------------------------------------------

export function getPrefs() {
  return { ...state };
}

export function isDefault() {
  return (
    !state.displayName &&
    state.environment === DEFAULTS.environment &&
    state.skillLevel === DEFAULTS.skillLevel &&
    state.primaryGoal === DEFAULTS.primaryGoal &&
    !state.largeText &&
    !state.reducedMotion &&
    !state.locationWeather
  );
}

// --- Mutations -----------------------------------------------------------

// Set a single preference. Unknown keys and out-of-range values are ignored so
// a bad caller can never corrupt the stored state. Returns the committed value.
export function setPref(key, value) {
  switch (key) {
    case "displayName":
      state.displayName = String(value || "").slice(0, 40);
      break;
    case "environment":
      if (!ENVIRONMENTS.includes(value)) return state[key];
      state.environment = value;
      break;
    case "skillLevel":
      if (!SKILL_LEVELS.includes(value)) return state[key];
      state.skillLevel = value;
      break;
    case "primaryGoal":
      if (!GOALS.includes(value)) return state[key];
      state.primaryGoal = value;
      break;
    case "largeText":
    case "reducedMotion":
    case "locationWeather":
    case "setupComplete":
      state[key] = !!value;
      break;
    default:
      return undefined; // unknown preference — no-op
  }
  save();
  applyPrefs();
  notify();
  return state[key];
}

// Restore every preference to its default (used by "Reset to defaults").
export function resetPrefs() {
  Object.assign(state, DEFAULTS);
  save();
  applyPrefs();
  notify();
}

// Load persisted values and apply the accessibility classes as early as
// possible (before the first view renders).
load();
applyPrefs();
