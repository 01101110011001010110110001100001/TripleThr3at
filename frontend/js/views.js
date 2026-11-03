// View templates for the app shell. Each function returns an HTML string
// rendered into <main id="view">. Copy is taken from the final Figma
// prototype (polish-cause-11757856.figma.site). These are shell-level
// placeholders: the full setup wizard, drill details/builder, runtime timers
// and results belong to later tickets. The nav, guest state, theme and layout
// are the TRI-6 deliverable.

import { DRILLS, formatDuration } from "./drills.js";

// Inline SVG icons (aria-hidden; always paired with visible text).
const icon = {
  check: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7.6 13.3 4.3 10l-1.1 1.1 4.4 4.4 9-9-1.1-1.1z"/></svg>',
  clock: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 8V5H9v6h5v-2Z"/></svg>',
  info: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 12H9V9h2Zm0-7H9V5h2Z"/></svg>',
  sample: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 17V3h2v12h12v2Zm4-3V8h2v6Zm4 0V5h2v9Zm4 0v-3h-2v3Z"/></svg>',
};

// Status pill — conveys meaning with an icon + text, never colour alone.
function pill(kind, label) {
  return `<span class="pill pill--${kind}">${icon[kind] || icon.info}<span>${label}</span></span>`;
}

function home() {
  const paths = [
    ["01", "Browse first", "Review drills and workouts before signing up."],
    ["02", "Preview guided training", "Try a guided workout with touch controls. Preview how future hands-free training will work."],
    ["03", "See what is next", "Progress and AI recommendations are clearly labeled sample previews until you have real saved workout data."],
  ]
    .map(
      ([n, t, d]) => `
      <li class="path-card">
        <span class="num">${n}</span>
        <h3>${t}</h3>
        <p>${d}</p>
      </li>`
    )
    .join("");

  return `
    <section class="view view--home" aria-labelledby="home-title">
      <p class="eyebrow">Hockey training, made clear</p>
      <h1 id="home-title">Smarter hockey training</h1>
      <p class="lead">
        Guided hockey workouts that help you practice puck control, hand speed,
        and keeping your eyes up.
      </p>

      <div class="cta-row">
        <a class="btn btn--primary" href="#/training">Explore Training</a>
        <a class="btn btn--secondary" href="#/setup">Set Up Now</a>
        <a class="btn btn--quiet" href="#/profile">Sign In</a>
      </div>

      <p class="account-note">
        <b>No account needed to explore.</b>
        <span>Create one when you are ready to save workouts, preferences, and progress.</span>
      </p>

      <ul class="path-grid" aria-label="Ways to get started">${paths}</ul>

      <p class="note">
        <b>Workout timers and navigation work in this demo.</b>
        <span>Camera tracking, voice and movement controls, AI advice, and account saving are simulated.</span>
      </p>
    </section>`;
}

function training() {
  const cards = DRILLS.map(
    (d) => `
      <li class="card">
        <p class="card__skill">${d.skill}</p>
        <h3 class="card__title">${d.name}</h3>
        <p class="card__desc">${d.description}</p>
        <p class="card__meta">
          <span>${icon.check} Target: ${d.target}</span>
          <span>${icon.clock} Interval: ${formatDuration(d.seconds)}</span>
        </p>
      </li>`
  ).join("");

  return `
    <section class="view" aria-labelledby="training-title">
      <p class="eyebrow">Training</p>
      <h1 id="training-title">Browse the drill library</h1>
      <p class="lead">Open a drill to read instructions and technique cues. No account needed.</p>
      <p class="note"><span>${icon.info} Drill details and the custom workout builder arrive in a later update — this is the browse list.</span></p>
      <ul class="card-grid" aria-label="Drill library">${cards}</ul>
    </section>`;
}

function progress() {
  return `
    <section class="view" aria-labelledby="progress-title">
      <p class="eyebrow">Progress</p>
      <h1 id="progress-title">See what is next</h1>
      <p class="lead">Personal history and saved workouts need an account.</p>

      <div class="panel">
        <p class="section-label">GUEST PREVIEW</p>
        <p>${pill("info", "Browsing as Guest")}</p>
        <p class="muted">This guest preview uses demonstration data, not your activity. Create an account and complete workouts to receive suggestions based on your own progress.</p>
        <div class="cta-row">
          <a class="btn btn--primary" href="#/profile">Create Account</a>
          <a class="btn btn--secondary" href="#/progress">View Sample Progress</a>
        </div>
      </div>

      <div class="stat-row">
        <div class="stat"><small>SAMPLE MINUTES</small><b>49:30</b></div>
        <div class="stat"><small>SAMPLE REPS</small><b>224</b></div>
        <div class="stat"><small>SAMPLE TREND</small><b>+12%</b></div>
      </div>
      <p class="note"><span>${pill("sample", "Sample data")} Charts, history and the AI advisor are example previews until real saved data is available.</span></p>
    </section>`;
}

function profile() {
  return `
    <section class="view" aria-labelledby="profile-title">
      <p class="eyebrow">Profile</p>
      <h1 id="profile-title">Guest &amp; Settings</h1>
      <p>${pill("info", "Guest")} Browse drills, build workouts, and adjust settings without an account.</p>
      <div class="cta-row">
        <a class="btn btn--primary" href="#/profile">Sign In</a>
        <a class="btn btn--secondary" href="#/profile">Create Account</a>
      </div>

      <section class="panel" id="settings" aria-labelledby="settings-title">
        <p class="section-label">SETTINGS</p>
        <h2 id="settings-title">Preferences</h2>
        <p class="note"><span>${icon.info} Settings live inside Profile. The controls below are placeholders for a later update.</span></p>
        <ul class="setting-list">
          <li><span>Training environment</span><span class="muted">Indoor or Outdoor</span></li>
          <li><span>Skill level &amp; primary goal</span><span class="muted">Beginner / Intermediate / Advanced</span></li>
          <li><span>Large workout text</span><span class="muted">Accessibility</span></li>
          <li><span>Reduced motion</span><span class="muted">Accessibility</span></li>
          <li><span>Audio &amp; visual cues</span><span class="muted">Workout</span></li>
          <li><span>Camera-supported option</span><span class="muted">Simulated</span></li>
        </ul>
      </section>
    </section>`;
}

function setup() {
  return `
    <section class="view" aria-labelledby="setup-title">
      <p class="eyebrow">Setup</p>
      <h1 id="setup-title">Set up your training</h1>
      <p class="lead">A quick setup tailors drills to you. You can move back without losing your choices.</p>
      <ol class="steps">
        <li><strong>Environment</strong> — Indoor or Outdoor</li>
        <li><strong>Profile</strong> — Training level, available space, primary goal</li>
        <li><strong>Mode</strong> — Camera-supported option or Timer Only</li>
      </ol>
      <p class="note"><span>${icon.info} The guided setup steps are built in a later update. This page confirms the flow is reachable.</span></p>
      <div class="cta-row">
        <a class="btn btn--secondary" href="#/home">Back to Home</a>
        <a class="btn btn--primary" href="#/training">Skip to Training</a>
      </div>
    </section>`;
}

function notFound() {
  return `
    <section class="view" aria-labelledby="nf-title">
      <h1 id="nf-title">Page not found</h1>
      <p class="lead">That screen doesn't exist yet.</p>
      <div class="cta-row"><a class="btn btn--primary" href="#/home">Back to Home</a></div>
    </section>`;
}

const VIEWS = { home, training, progress, profile, setup };
const TITLES = { home: "Home", training: "Training", progress: "Progress", profile: "Profile", setup: "Set Up" };

// Returns { html, title } for a route key.
export function renderView(route) {
  const fn = VIEWS[route];
  if (!fn) return { html: notFound(), title: "Not found" };
  return { html: fn(), title: TITLES[route] };
}
