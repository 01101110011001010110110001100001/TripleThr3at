// App shell controller.
// -------------------------------------------------------------------------
// TRI-6: hash router, active-nav state, and the mobile drawer.
// TRI-11: route params for drill detail (#/drill/<slug>) and the workout
// review (#/review), plus delegated interactivity for the workout builder
// (add / remove / reorder / review) driven by data-action attributes.

import { renderView } from "./views.js";
import { renderCoach, coachAnnouncement, renderVoiceInner } from "./sessionviews.js";
import { formatDuration } from "./drills.js";
import {
  initVoice,
  toggleVoice,
  disableVoice,
  isVoiceEnabled,
} from "./voice.js";
import {
  getPrefs,
  subscribe as subscribePrefs,
  setPref,
  resetPrefs,
} from "./prefs.js";
import { toggleAudio } from "./feedback.js";
import {
  subscribe,
  addToCustom,
  removeFromCustom,
  removeFromActive,
  undoRemoval,
  clearRemoved,
  moveInActive,
  reorderActive,
  reviewSource,
  getActive,
  getSource,
} from "./workout.js";
import {
  subscribe as subscribeSession,
  beginSession,
  startCountdown,
  startNow,
  togglePause,
  completeNow,
  skipRest,
  openEndConfirm,
  keepGoing,
  confirmEnd,
  toggleDemo,
  toggleAudioPrompts,
  resetSession,
  getState as getSessionState,
} from "./session.js";

const ROUTES = ["home", "training", "progress", "profile", "setup", "drill", "review", "session"];
// Flow routes that should keep the Training nav item highlighted.
const TRAINING_FLOW = ["training", "drill", "review", "setup", "session"];

const viewEl = document.getElementById("view");

let firstRender = true;
let pendingFocus = null; // CSS selector to focus after an in-place re-render

// --- Routing -------------------------------------------------------------

// Parse location.hash into { route, param, anchor }.
// "#/drill/figure-eight-control" → { route: "drill", param: "figure-eight-control" }
// "#/profile#settings"           → { route: "profile", anchor: "settings" }
function parseHash() {
  const raw = location.hash.replace(/^#/, "");
  const [path, anchor] = raw.split("#");
  const segs = path.replace(/^\//, "").split("/");
  const route = segs[0] || "home";
  const param = segs[1] || "";
  return { route, param, anchor };
}

function setActiveNav(route) {
  const navRoute = TRAINING_FLOW.includes(route) ? "training" : route;
  document.querySelectorAll(".nav, .docklink").forEach((el) => {
    if (el.dataset.route === navRoute) {
      el.setAttribute("aria-current", "page");
    } else {
      el.removeAttribute("aria-current");
    }
  });
}

function render(route, param) {
  const known = ROUTES.includes(route);
  const { html, title } = renderView(known ? route : "notfound", param);
  viewEl.innerHTML = html;
  document.title = `${title} — StickSmart`;
  setActiveNav(known ? route : "");
}

function router() {
  // The skip link points at "#view" to focus main — it's not a route.
  if (location.hash === "#view") {
    viewEl.focus();
    return;
  }

  const { route, param, anchor } = parseHash();
  // Leaving the guided session tears down its timers and stops voice listening.
  if (route !== "session") {
    resetSession();
    if (isVoiceEnabled()) disableVoice();
  }
  render(route, param);
  closeDrawer({ restoreFocus: false });

  if (anchor && document.getElementById(anchor)) {
    document.getElementById(anchor).scrollIntoView({ behavior: "auto", block: "start" });
  } else {
    window.scrollTo(0, 0);
  }

  // Move focus to main on navigation so keyboard/SR users land on the new
  // view. Skip on the very first load to leave focus at the top.
  if (!firstRender) viewEl.focus();
  firstRender = false;
}

// Re-render the current route in place (after a state change) without the
// navigation side effects — preserve scroll position and optionally restore
// focus to a control so keyboard users are not dropped.
function rerenderInPlace() {
  const { route, param } = parseHash();
  const y = window.scrollY;
  render(route, param);
  window.scrollTo(0, y);
  if (pendingFocus) {
    const el = viewEl.querySelector(pendingFocus);
    if (el) el.focus();
    pendingFocus = null;
  }
}

// Re-render whenever the workout state changes.
subscribe(rerenderInPlace);
// …and whenever a preference changes (settings / setup toggles).
subscribePrefs(rerenderInPlace);

// Session runtime: "tick" updates only the time readouts in place (so the
// 1-second timer never steals focus or resets scroll); "phase" re-renders.
function updateTimerDisplays() {
  if (parseHash().route !== "session") return;
  const st = getSessionState();
  const set = (bind, value) => {
    const el = viewEl.querySelector(`[data-bind="${bind}"]`);
    if (el) el.textContent = value;
  };
  set("countdown", st.countdown);
  set("active-remaining", formatDuration(st.activeRemaining));
  set("rest-remaining", formatDuration(st.restRemaining));
}

// Swap the live-coaching panel in place (TRI-17) so a changed cue never steals
// focus or resets scroll — same technique as the timer readouts above.
function updateCoachDisplay() {
  if (parseHash().route !== "session") return;
  const st = getSessionState();
  if (st.phase !== "active") return;
  const el = viewEl.querySelector('[data-bind="coach"]');
  if (el) el.innerHTML = renderCoach(st); // visual only (aria-live="off")
  // Route the announcement through the one persistent assertive live region.
  const sr = viewEl.querySelector('[data-bind="coach-sr"]');
  if (sr) sr.textContent = coachAnnouncement(st);
}

subscribeSession((reason) => {
  if (reason === "tick") updateTimerDisplays();
  else if (reason === "coach") {
    updateTimerDisplays();
    updateCoachDisplay();
  } else rerenderInPlace();
  // Voice listening is scoped to an in-progress session: stop it once the
  // workout ends so the mic isn't left open on the summary screen.
  if (getSessionState().phase === "summary" && isVoiceEnabled()) disableVoice();
});

// --- Hands-free voice control (TRI-18) -----------------------------------

// Swap the voice panel(s) in place on a recognition status change, so toggling
// / listening / "heard" updates never steal focus or reset scroll.
function updateVoiceDisplay() {
  if (parseHash().route !== "session") return;
  viewEl
    .querySelectorAll('[data-bind="voice"]')
    .forEach((el) => (el.innerHTML = renderVoiceInner()));
}

// Map a recognised command to the matching touch control. Every command runs
// through the same session functions as touch, so their phase guards apply and
// an out-of-context command is simply a no-op. "end" opens the confirmation
// dialog rather than ending, so a mishear can never end the session.
function handleVoiceCommand(cmd) {
  const st = getSessionState();
  switch (cmd) {
    case "start":
      if (st.phase === "ready") startCountdown();
      break;
    case "pause":
      if (!st.paused && !st.confirmOpen && ["countdown", "active", "rest"].includes(st.phase))
        togglePause();
      break;
    case "resume":
      if (st.paused && !st.confirmOpen) togglePause();
      break;
    case "skip":
      if (st.phase === "rest" && !st.paused) skipRest();
      break;
    case "end":
      if (st.activeRun && !st.confirmOpen) openEndConfirm();
      break;
    default:
      break;
  }
}

initVoice({ onCommand: handleVoiceCommand, onStatus: updateVoiceDisplay });

// --- Dropdown (Add a drill search) ---------------------------------------

function openDropdown() {
  const menu = viewEl.querySelector(".dropdown-menu");
  const input = viewEl.querySelector("[data-dropdown-input]");
  if (!menu) return;
  menu.hidden = false;
  if (input) input.setAttribute("aria-expanded", "true");
}

function closeDropdown() {
  const menu = viewEl.querySelector(".dropdown-menu");
  const input = viewEl.querySelector("[data-dropdown-input]");
  if (!menu) return;
  menu.hidden = true;
  if (input) input.setAttribute("aria-expanded", "false");
}

function filterDropdown(q) {
  const term = q.trim().toLowerCase();
  let shown = 0;
  viewEl.querySelectorAll(".dropdown-option").forEach((btn) => {
    const match = (btn.dataset.search || "").includes(term);
    btn.hidden = !match;
    if (match) shown += 1;
  });
  const empty = viewEl.querySelector(".dropdown-empty");
  if (empty) empty.hidden = shown !== 0;
}

viewEl.addEventListener("input", (e) => {
  if (e.target.matches("[data-dropdown-input]")) {
    openDropdown();
    filterDropdown(e.target.value);
  }
});

viewEl.addEventListener("focusin", (e) => {
  if (e.target.matches("[data-dropdown-input]")) openDropdown();
});

// Text preferences (e.g. the guest display name) commit on change (blur/Enter).
viewEl.addEventListener("change", (e) => {
  const input = e.target.closest('input[data-pref]');
  if (!input) return;
  pendingFocus = `#${input.id}`;
  setPref(input.dataset.pref, input.value);
});

// --- Delegated actions ---------------------------------------------------

viewEl.addEventListener("click", (e) => {
  // Close an open dropdown when clicking outside of it.
  const dropdown = viewEl.querySelector("[data-dropdown]");
  if (dropdown && !dropdown.contains(e.target)) closeDropdown();

  const trigger = e.target.closest("[data-action]");
  if (!trigger) return;

  const action = trigger.dataset.action;
  const name = trigger.dataset.name;
  const slug = trigger.dataset.slug;
  const index = trigger.dataset.index != null ? Number(trigger.dataset.index) : null;

  switch (action) {
    case "open-drill":
      location.hash = `#/drill/${slug}`;
      break;

    case "add":
      addToCustom(name);
      closeDropdown();
      break;

    case "remove-custom":
      pendingFocus = ".undo-btn";
      removeFromCustom(name);
      break;

    case "remove-active":
      pendingFocus = ".undo-btn";
      removeFromActive(name);
      break;

    case "undo":
      undoRemoval();
      break;

    case "move-up":
      pendingFocus = `[data-action="move-up"][data-index="${index - 1}"]`;
      moveInActive(index, -1);
      break;

    case "move-down":
      pendingFocus = `[data-action="move-down"][data-index="${index + 1}"]`;
      moveInActive(index, 1);
      break;

    case "review-custom":
      reviewSource("custom");
      location.hash = "#/review";
      break;

    case "review-preset":
      reviewSource("preset");
      location.hash = "#/review";
      break;

    case "review-recommended":
      reviewSource("recommended");
      location.hash = "#/review";
      break;

    case "back-training":
      clearRemoved();
      resetSession();
      location.hash = "#/training";
      break;

    case "back-review":
      resetSession();
      location.hash = "#/review";
      break;

    case "choose-mode":
      // Begin the guided timer session from the chosen order (TRI-12).
      beginSession({ workout: getActive(), source: getSource(), mode: "timer" });
      location.hash = "#/session";
      break;

    // --- Guided session controls ---
    case "start-countdown":
      startCountdown();
      break;
    case "start-now":
      startNow();
      break;
    case "toggle-pause":
      togglePause();
      break;
    case "complete-drill":
      completeNow();
      break;
    case "skip-rest":
      skipRest();
      break;
    case "end-confirm":
      openEndConfirm();
      break;
    case "keep-going":
      keepGoing();
      break;
    case "confirm-end":
      confirmEnd();
      break;
    case "toggle-demo":
      toggleDemo();
      break;
    case "toggle-audio":
      toggleAudioPrompts();
      break;
    case "toggle-voice":
      toggleVoice();
      updateVoiceDisplay();
      break;

    case "close-dropdown":
      closeDropdown();
      break;

    // --- Preferences (Profile settings + optional setup) ---
    case "set-pref":
      pendingFocus = `.seg-btn[data-pref="${trigger.dataset.pref}"][data-value="${trigger.dataset.value}"]`;
      setPref(trigger.dataset.pref, trigger.dataset.value);
      break;

    case "toggle-pref": {
      const pref = trigger.dataset.pref;
      pendingFocus = `.switch[data-pref="${pref}"]`;
      setPref(pref, !getPrefs()[pref]);
      break;
    }

    case "toggle-audio-pref":
      // Audio lives in feedback.js (shared with the session), so toggle it there
      // and re-render in place — it doesn't flow through the prefs subscription.
      toggleAudio();
      pendingFocus = '.switch[data-action="toggle-audio-pref"]';
      rerenderInPlace();
      break;

    case "reset-prefs":
      pendingFocus = '[data-action="reset-prefs"]';
      resetPrefs();
      break;

    case "setup-continue":
      setPref("setupComplete", true);
      location.hash = "#/review";
      break;

    case "setup-done":
      // The <a> handles navigation to #/training; just record completion.
      setPref("setupComplete", true);
      break;

    case "toggle-animate": {
      const rink = trigger.closest(".demo")?.querySelector(".rink");
      if (!rink) break;
      const on = rink.classList.toggle("is-animating");
      trigger.setAttribute("aria-pressed", String(on));
      trigger.textContent = on ? "Ⅱ Pause diagram" : "▶ Animate movement path";
      break;
    }

    default:
      break;
  }
});

// --- Drag-and-drop reordering (review page) -------------------------------

let dragFrom = null;

viewEl.addEventListener("dragstart", (e) => {
  const row = e.target.closest(".reorder-row");
  if (!row) return;
  dragFrom = Number(row.dataset.index);
  row.classList.add("is-dragging");
  e.dataTransfer.effectAllowed = "move";
});

viewEl.addEventListener("dragover", (e) => {
  if (e.target.closest(".reorder-row")) e.preventDefault();
});

viewEl.addEventListener("drop", (e) => {
  const row = e.target.closest(".reorder-row");
  if (!row || dragFrom === null) return;
  e.preventDefault();
  const to = Number(row.dataset.index);
  reorderActive(dragFrom, to);
  dragFrom = null;
});

viewEl.addEventListener("dragend", () => {
  dragFrom = null;
  viewEl.querySelectorAll(".is-dragging").forEach((el) => el.classList.remove("is-dragging"));
});

// --- Mobile drawer (the sidebar) -----------------------------------------

const side = document.getElementById("side");
const menuBtn = document.getElementById("menu-btn");
const drawerClose = document.getElementById("drawer-close");
const backdrop = document.getElementById("drawer-backdrop");

function drawerOpen() {
  return side.classList.contains("drawer-open");
}

function focusablesIn(container) {
  return Array.from(
    container.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
  ).filter((el) => el.offsetParent !== null || el === container);
}

function openDrawer() {
  side.classList.add("drawer-open");
  backdrop.hidden = false;
  menuBtn.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", onDrawerKeydown);
  (drawerClose || focusablesIn(side)[0] || side).focus();
}

function closeDrawer({ restoreFocus = true } = {}) {
  if (!drawerOpen()) return;
  side.classList.remove("drawer-open");
  backdrop.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
  document.removeEventListener("keydown", onDrawerKeydown);
  if (restoreFocus) menuBtn.focus();
}

function onDrawerKeydown(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    closeDrawer();
    return;
  }
  if (e.key === "Tab") {
    const items = focusablesIn(side);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

menuBtn.addEventListener("click", () => (drawerOpen() ? closeDrawer() : openDrawer()));
drawerClose.addEventListener("click", () => closeDrawer());
backdrop.addEventListener("click", () => closeDrawer());

side.querySelectorAll("a[href]").forEach((link) => {
  link.addEventListener("click", () => closeDrawer({ restoreFocus: false }));
});

// --- Boot ----------------------------------------------------------------

window.addEventListener("hashchange", router);

if (!location.hash || location.hash === "#view") {
  location.replace("#/home");
} else {
  router();
}
