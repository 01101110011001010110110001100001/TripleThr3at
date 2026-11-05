// Workout builder state (TRI-11).
// -------------------------------------------------------------------------
// Holds the guest's in-progress workout: the ordered list of drills, which
// "source" is being reviewed (manual custom, the preset, or the recommended
// sequence), and a one-step undo buffer for removals.
//
// The custom workout persists to localStorage so the guest's state stays
// correct across navigation and reloads. Preset and recommended are reviewed
// on separate working copies so editing them never touches the custom list
// (Figma: "a ready-made sequence kept separate from your custom workout").
//
// Views read state through the getters and re-render via subscribe().

import { PRESET_DRILLS } from "./drills.js";

const STORAGE_KEY = "sticksmart.workout.v1";

const state = {
  custom: [], // ordered drill names — the guest's manual workout
  source: "custom", // "custom" | "preset" | "recommended" — what Review shows
  preset: [...PRESET_DRILLS], // working copy edited on the preset review
  recommended: [...PRESET_DRILLS], // working copy edited on the recommended review
  removed: null, // { name, index, source } — last removal, for Undo
};

const listeners = new Set();

// --- Persistence ---------------------------------------------------------

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.custom)) state.custom = saved.custom;
  } catch {
    /* private mode / blocked storage — run with defaults */
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ custom: state.custom }));
  } catch {
    /* ignore — persistence is a convenience, not a requirement */
  }
}

load();

// --- Subscriptions -------------------------------------------------------

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

// --- Which list is active for a given source -----------------------------

function listFor(source) {
  if (source === "preset") return state.preset;
  if (source === "recommended") return state.recommended;
  return state.custom;
}

function setListFor(source, next) {
  if (source === "preset") state.preset = next;
  else if (source === "recommended") state.recommended = next;
  else {
    state.custom = next;
    save();
  }
}

// --- Getters -------------------------------------------------------------

export function getSource() {
  return state.source;
}

// The list currently being reviewed.
export function getActive() {
  return [...listFor(state.source)];
}

// The guest's manual custom workout (used by the builder page).
export function getCustom() {
  return [...state.custom];
}

export function getRemoved() {
  return state.removed;
}

export function isInCustom(name) {
  return state.custom.includes(name);
}

// --- Review entry points -------------------------------------------------

// Open the review page against one of the three sources. Preset and
// recommended reset their working copy from the canonical sequence so each
// review starts clean.
export function reviewSource(source) {
  state.source = source;
  if (source === "preset") state.preset = [...PRESET_DRILLS];
  if (source === "recommended") state.recommended = [...PRESET_DRILLS];
  state.removed = null;
  notify();
}

// --- Mutations (manual builder — custom list only) -----------------------

export function addToCustom(name) {
  if (state.custom.includes(name)) return;
  state.custom = [...state.custom, name];
  save();
  notify();
}

// --- Mutations on the active (reviewed) list -----------------------------

export function removeFromActive(name) {
  const list = listFor(state.source);
  const index = list.indexOf(name);
  if (index === -1) return;
  const next = list.slice(0, index).concat(list.slice(index + 1));
  setListFor(state.source, next);
  state.removed = { name, index, source: state.source };
  notify();
}

// Builder page removal (always the custom list, with undo).
export function removeFromCustom(name) {
  const index = state.custom.indexOf(name);
  if (index === -1) return;
  state.custom = state.custom
    .slice(0, index)
    .concat(state.custom.slice(index + 1));
  save();
  state.removed = { name, index, source: "custom" };
  notify();
}

export function undoRemoval() {
  const r = state.removed;
  if (!r) return;
  const list = listFor(r.source);
  if (!list.includes(r.name)) {
    const next = [...list];
    next.splice(Math.min(r.index, next.length), 0, r.name);
    setListFor(r.source, next);
  }
  state.removed = null;
  notify();
}

export function clearRemoved() {
  if (!state.removed) return;
  state.removed = null;
  notify();
}

// Move a drill in the active list by delta (-1 up, +1 down).
export function moveInActive(index, delta) {
  const list = [...listFor(state.source)];
  const target = index + delta;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  setListFor(state.source, list);
  notify();
}

// Drag-and-drop: move the drill at `from` to position `to` in the active list.
export function reorderActive(from, to) {
  if (from === to || from == null || to == null) return;
  const list = [...listFor(state.source)];
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return;
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);
  setListFor(state.source, list);
  notify();
}
