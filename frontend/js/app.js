// App shell controller (TRI-6): hash router, active-nav state, and the
// mobile drawer (the navy sidebar slides in on phones) with keyboard/focus
// handling.

import { renderView } from "./views.js";

// Centralised app state. Guest by default — later tickets flip `user` to a
// real account once auth/persistence lands.
const state = {
  user: null, // null = Guest
};

const ROUTES = ["home", "training", "progress", "profile", "setup"];
const viewEl = document.getElementById("view");

let firstRender = true;

// --- Routing -------------------------------------------------------------

// Parse location.hash into { route, anchor }. Supports "#/profile#settings"
// (the browser keeps everything after the first "#" as the fragment, so we
// split again on "#").
function parseHash() {
  const raw = location.hash.replace(/^#/, "");
  const [path, anchor] = raw.split("#");
  const route = path.replace(/^\//, "") || "home";
  return { route, anchor };
}

function setActiveNav(route) {
  document.querySelectorAll(".nav, .docklink").forEach((el) => {
    if (el.dataset.route === route) {
      el.setAttribute("aria-current", "page");
    } else {
      el.removeAttribute("aria-current");
    }
  });
}

function router() {
  // The skip link points at "#view" to focus main — it's not a route.
  if (location.hash === "#view") {
    viewEl.focus();
    return;
  }

  const { route, anchor } = parseHash();
  const known = ROUTES.includes(route);
  const { html, title } = renderView(known ? route : "notfound");

  viewEl.innerHTML = html;
  document.title = `${title} — StickSmart`;
  setActiveNav(known ? route : "");
  closeDrawer({ restoreFocus: false });

  // Scroll to an in-view anchor (e.g. Settings within Profile) if requested.
  if (anchor && document.getElementById(anchor)) {
    document.getElementById(anchor).scrollIntoView({ behavior: "auto", block: "start" });
  } else {
    window.scrollTo(0, 0);
  }

  // Move focus to main on user navigation so keyboard/SR users land on the
  // new view. Skip on the very first load to leave focus at the top.
  if (!firstRender) viewEl.focus();
  firstRender = false;
}

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
  document.body.style.overflow = "hidden"; // lock background scroll on phones
  document.addEventListener("keydown", onDrawerKeydown);
  (drawerClose || focusablesIn(side)[0] || side).focus();
}

function closeDrawer({ restoreFocus = true } = {}) {
  if (!drawerOpen()) return;
  side.classList.remove("drawer-open");
  backdrop.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
  document.body.style.overflow = ""; // restore background scroll
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

// Close the drawer after choosing a destination (PDF requirement). On desktop
// the drawer is never open, so this is a harmless no-op there.
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
