// View templates for the app shell. Each render function returns an HTML
// string injected into <main id="view">. Interactivity is wired centrally in
// app.js via delegated data-action handlers. Copy is taken from the final
// Figma prototype (polish-cause-11757856.figma.site).
//
// TRI-6 built the shell (home/progress/profile/setup, nav, guest state).
// TRI-11 adds the drill library, the workout builder, drill details, and the
// workout review with add / remove / reorder.

import {
  DRILLS,
  PRESET_NAME,
  PRESET_DRILLS,
  RECOMMENDED_REASON,
  getDrill,
  formatDuration,
  computeTotals,
  targetLabel,
} from "./drills.js";
import { drillDiagram } from "./diagram.js";
import {
  getCustom,
  getActive,
  getSource,
  getRemoved,
  isInCustom,
} from "./workout.js";
import { renderSession } from "./sessionviews.js";

// Inline SVG icons (aria-hidden; always paired with visible text).
const icon = {
  check: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M7.6 13.3 4.3 10l-1.1 1.1 4.4 4.4 9-9-1.1-1.1z"/></svg>',
  clock: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 8V5H9v6h5v-2Z"/></svg>',
  info: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 12H9V9h2Zm0-7H9V5h2Z"/></svg>',
  sample: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 17V3h2v12h12v2Zm4-3V8h2v6Zm4 0V5h2v9Zm4 0v-3h-2v3Z"/></svg>',
  target: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3a5 5 0 1 0 0 10A5 5 0 0 0 10 5Zm0 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>',
};

// Status pill — meaning via icon + text, never colour alone.
function pill(kind, label) {
  return `<span class="pill pill--${kind}">${icon[kind] || icon.info}<span>${label}</span></span>`;
}

// Figma-style tag chip (blue by default, orange accent).
function tag(label, tone = "blue") {
  return `<span class="tag tag--${tone}">${label}</span>`;
}

// --- Home ----------------------------------------------------------------

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

// --- Workout builder (Training) ------------------------------------------

function undoBanner(source) {
  const removed = getRemoved();
  if (!removed || removed.source !== source) return "";
  return `
    <div class="undo-banner" role="status">
      <span><b>${removed.name}</b> removed.</span>
      <button type="button" class="undo-btn" data-action="undo">Undo</button>
    </div>`;
}

function builderDrillCard(drill, index) {
  const added = isInCustom(drill.name);
  const tone = index === 1 ? "orange" : "blue";
  const factTarget =
    drill.measurement === "repetitions"
      ? `Suggested target: ${targetLabel(drill)}`
      : "Suggested goal: complete the full interval";

  return `
    <article class="drill ${added ? "drill--selected" : ""}">
      <button type="button" class="drill-preview" data-action="open-drill" data-slug="${drill.slug}" aria-label="Open ${drill.name} details">
        ${drillDiagram(drill, { compact: true })}
        <span class="drill-preview__link">View drill diagram</span>
      </button>
      ${tag(drill.focus.toUpperCase(), tone)}
      <h3 class="drill__title">${drill.name}</h3>
      <p class="drill__goal">${drill.goal}</p>
      <div class="drill-facts">
        <span>${icon.clock} Default: ${drill.time}</span>
        <span>${icon.target} ${factTarget}</span>
      </div>
      <div class="drill-actions">
        <button type="button" class="details-link" data-action="open-drill" data-slug="${drill.slug}">View details</button>
        <button type="button" class="add-drill ${added ? "added" : ""}" data-action="add" data-name="${drill.name}" ${added ? "disabled" : ""}>
          ${added ? "✓ Already added" : "+ Add drill"}
        </button>
      </div>
    </article>`;
}

function yourWorkoutPanel() {
  const custom = getCustom();
  const totals = computeTotals(custom);

  const listMarkup =
    custom.length === 0
      ? `<div class="empty-workout">
           <b>Your workout is empty.</b>
           <p>Add at least one drill to review or begin training.</p>
         </div>`
      : `<ol class="builder-workout-list">
           ${custom
             .map((name, i) => {
               const d = getDrill(name);
               return `
             <li class="builder-workout-row">
               <span class="order-number">${i + 1}</span>
               <div class="builder-workout-row__info">
                 <b>${name}</b>
                 <small>Selected: ${formatDuration(d.activeSeconds)} · Goal: ${d.goal}</small>
               </div>
               <button type="button" class="row-remove" data-action="remove-custom" data-name="${name}" aria-label="Remove ${name}">Remove</button>
             </li>`;
             })
             .join("")}
         </ol>`;

  const options = DRILLS.map((d) => {
    const added = isInCustom(d.name);
    return `
      <button type="button" class="dropdown-option" data-action="add" data-name="${d.name}" data-search="${d.name.toLowerCase()} ${d.focus.toLowerCase()}" ${added ? "disabled" : ""}>
        <span><b>${d.name}</b><small>${d.focus} · Default: ${d.time}</small></span>
        <em>${added ? "Already added" : "Add"}</em>
      </button>`;
  }).join("");

  return `
    <section class="builder-section your-workout">
      <div class="builder-heading">
        ${tag("YOUR WORKOUT", "orange")}
        <h2>Your Workout</h2>
        <strong class="selected-count">${custom.length} ${custom.length === 1 ? "drill" : "drills"} selected</strong>
        <p>Your current session in training order.</p>
      </div>

      <div class="add-dropdown" data-dropdown>
        <label for="add-drill-search">Add a drill</label>
        <input id="add-drill-search" type="text" placeholder="Search drills" autocomplete="off" aria-expanded="false" aria-controls="drill-dropdown-menu" data-dropdown-input />
        <div class="dropdown-menu" id="drill-dropdown-menu" hidden>
          ${options}
          <p class="dropdown-empty" hidden>No drills match your search.</p>
          <button type="button" class="close-dropdown" data-action="close-dropdown">Close drill list</button>
        </div>
      </div>

      ${listMarkup}

      <div class="builder-total">
        <span><b>${formatDuration(totals.total)}</b> planned</span>
        <span>${formatDuration(totals.active)} active · ${formatDuration(totals.rest)} rest</span>
      </div>

      ${
        custom.length > 0
          ? `<button type="button" class="btn btn--primary builder-review-primary" data-action="review-custom">Review Workout <span aria-hidden="true">→</span></button>`
          : `<p class="empty-note">Add at least one drill to continue.</p>`
      }
    </section>`;
}

function training() {
  const presetTotals = computeTotals(PRESET_DRILLS);

  return `
    <section class="view view--builder" aria-labelledby="builder-title">
      <p class="eyebrow">Training <span aria-hidden="true">•</span> Workout Builder</p>
      <h1 id="builder-title">Build today’s <em>workout.</em></h1>
      <p class="lead">A drill is one exercise. A workout is the ordered sequence of drills you will complete in one session.</p>

      ${undoBanner("custom")}

      <div class="workout-builder">
        <section class="builder-section available-section">
          <div class="builder-heading">
            ${tag("AVAILABLE DRILLS")}
            <h2>Choose individual exercises</h2>
            <p>Browse details or add each drill once.</p>
          </div>
          <div class="drill-grid builder-drill-grid">
            ${DRILLS.map((d, i) => builderDrillCard(d, i)).join("")}
          </div>
        </section>

        ${yourWorkoutPanel()}
      </div>

      <section class="workout-strip preset-section">
        <div>
          ${tag("PRESET WORKOUTS")}
          <h2>${PRESET_NAME}</h2>
          <p>A ready-made sequence kept separate from your custom workout · ${PRESET_DRILLS.length} drills · ${formatDuration(presetTotals.total)} total</p>
        </div>
        <button type="button" class="btn btn--secondary" data-action="review-preset">Review Preset Workout <span aria-hidden="true">→</span></button>
      </section>

      <section class="workout-strip recommended-section">
        <div>
          ${tag("RECOMMENDED FOR YOU", "orange")}
          <h2>${PRESET_NAME}</h2>
          <p>${RECOMMENDED_REASON}</p>
          <div class="workout-meta">
            <span>${icon.clock} ${formatDuration(presetTotals.total)} total</span>
            <span>${icon.sample} ${PRESET_DRILLS.length} drills</span>
            <span>◈ Intermediate</span>
          </div>
        </div>
        <button type="button" class="btn btn--secondary" data-action="review-recommended">Review Recommended Workout <span aria-hidden="true">→</span></button>
      </section>

      <p class="note"><span>${pill("sample", "Sample data")} The recommended workout is a labeled demonstration until you have real saved progress.</span></p>
    </section>`;
}

// --- Drill detail --------------------------------------------------------

function drillDetail(slug) {
  const drill = getDrill(slug);
  if (!drill) return notFound();

  const added = isInCustom(drill.name);
  const custom = getCustom();

  const measurement =
    drill.measurement === "timed"
      ? "Complete the full interval with controlled technique"
      : drill.reps;

  const repBlock = drill.repDefinition
    ? `<div class="rep-definition">
         <b>What counts as one repetition?</b>
         <p>${drill.repDefinition}</p>
       </div>`
    : `<div class="rep-definition">
         <b>Timed drill</b>
         <p>No repetition count is used. Maintain the technique cue for the full ${drill.time} interval.</p>
       </div>`;

  return `
    <section class="view view--detail" aria-labelledby="detail-title">
      <button type="button" class="back-link" data-action="back-training"><span aria-hidden="true">←</span> Back to Workout Builder</button>

      <p class="eyebrow">Drill details <span aria-hidden="true">•</span> ${drill.focus.toUpperCase()}</p>

      <div class="heading-row">
        <div>
          <h1 id="detail-title">${drill.name}.</h1>
          <p class="lead">${drill.goal}</p>
        </div>
        <button type="button" class="add-drill large ${added ? "added" : ""}" data-action="add" data-name="${drill.name}" ${added ? "disabled" : ""}>
          ${added ? "✓ Already added" : "+ Add to workout"}
        </button>
      </div>

      <div class="drill-detail">
        <section class="demo">
          ${drillDiagram(drill)}
          <button type="button" class="demo-play" data-action="toggle-animate" aria-pressed="false">▶ Animate movement path</button>
          <div class="marker-guide">
            <b>Marker placement</b>
            <p>${drill.placement}</p>
          </div>
        </section>

        <section class="panel instruction-panel">
          <h3>How to perform it</h3>
          <ol class="how-to">
            ${drill.instructions.map((step) => `<li>${step}</li>`).join("")}
          </ol>
          <div class="detail-grid">
            <p><b>Default training goal</b>${drill.goal}</p>
            <p><b>Equipment</b>${drill.equipment}</p>
            <p><b>Environment</b>${drill.environment}</p>
            <p><b>Measurement</b>${measurement}</p>
            <p><b>Default work interval</b>${drill.time}</p>
            <p><b>Rest</b>${drill.restSeconds} seconds between drills</p>
          </div>
          ${repBlock}
          <div class="technique-cue">
            <b>Technique cue</b>
            <p>${drill.cue}</p>
          </div>
        </section>
      </div>

      <div class="page-actions">
        <button type="button" class="btn btn--secondary" data-action="back-training">Back to Workout Builder</button>
        ${
          custom.length > 0
            ? `<button type="button" class="btn btn--primary" data-action="review-custom">Review Workout · ${custom.length} <span aria-hidden="true">→</span></button>`
            : ""
        }
      </div>
    </section>`;
}

// --- Workout review (reorder) --------------------------------------------

function review() {
  const source = getSource();
  const list = getActive();
  const totals = computeTotals(list);
  const title = source === "custom" ? "Custom Workout" : PRESET_NAME;

  const orderList = list
    .map((name, i) => {
      const d = getDrill(name);
      const isLast = i === list.length - 1;
      const restText = isLast
        ? "no rest after"
        : `${d.restSeconds} sec rest after`;
      return `
      <li class="reorder-row" draggable="true" data-index="${i}">
        <span class="drag-handle" aria-hidden="true">⋮⋮</span>
        <span class="order-number">${i + 1}</span>
        <button type="button" class="reorder-info" data-action="open-drill" data-slug="${d.slug}">
          <b>${name}</b>
          <small>Selected: ${formatDuration(d.activeSeconds)} active · ${restText}</small>
        </button>
        <div class="move-controls">
          <button type="button" data-action="move-up" data-index="${i}" aria-label="Move ${name} up" ${i === 0 ? "disabled" : ""}>↑<small>Up</small></button>
          <button type="button" data-action="move-down" data-index="${i}" aria-label="Move ${name} down" ${isLast ? "disabled" : ""}>↓<small>Down</small></button>
          <button type="button" class="remove-ctrl" data-action="remove-active" data-name="${name}" aria-label="Remove ${name}">×<small>Remove</small></button>
        </div>
      </li>`;
    })
    .join("");

  const listMarkup =
    list.length === 0
      ? `<div class="empty-workout">
           <b>Your workout is empty.</b>
           <p>At least one drill is required. Return to the builder to continue.</p>
         </div>`
      : `<ol class="reorder-list-items">${orderList}</ol>`;

  return `
    <section class="view view--review" aria-labelledby="review-title">
      <button type="button" class="back-link" data-action="back-training"><span aria-hidden="true">←</span> Back to Workout Builder</button>

      <p class="eyebrow">${source.toUpperCase()} Workout <span aria-hidden="true">•</span> Review</p>

      <div class="heading-row">
        <div>
          <h1 id="review-title">${title}, <em>your plan.</em></h1>
          <p class="lead">Preview and edit the exact order used by every training screen.</p>
        </div>
        ${
          list.length > 0
            ? `<button type="button" class="btn btn--primary" data-action="choose-mode">Choose Training Mode <span aria-hidden="true">→</span></button>`
            : ""
        }
      </div>

      ${undoBanner(source)}

      <div class="review-layout">
        <section class="panel reorder-list">
          <div class="panel-top">
            <h3>${list.length} ${list.length === 1 ? "drill" : "drills"} selected</h3>
            <button type="button" class="text-link" data-action="back-training">Edit Workout</button>
          </div>
          <p class="reorder-hint"><span>${icon.info} Drag a row, or use the ↑ ↓ controls, to set the training order.</span></p>
          ${listMarkup}
        </section>

        <aside class="panel review-summary">
          <p class="section-label">PLANNED SESSION</p>
          <div class="summary-total">
            <b>${formatDuration(totals.total)}</b>
            <span>total</span>
          </div>
          <ul class="summary-breakdown">
            <li><span>Active work</span><b>${formatDuration(totals.active)}</b></li>
            <li><span>Rest between drills</span><b>${formatDuration(totals.rest)}</b></li>
            <li><span>Drills</span><b>${list.length}</b></li>
          </ul>
          <p class="note"><span>${icon.info} This order drives the session screens. Guided timers and training mode arrive in the next update.</span></p>
        </aside>
      </div>
    </section>`;
}

// --- Progress ------------------------------------------------------------

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

// --- Profile -------------------------------------------------------------

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

// --- Setup (training-mode handoff) ---------------------------------------

function setup() {
  const list = getActive();
  const source = getSource();
  const title = source === "custom" ? "your custom workout" : `the ${PRESET_NAME}`;

  const queued =
    list.length > 0
      ? `<div class="panel queued-panel">
           <p class="section-label">READY TO TRAIN</p>
           <h2>${list.length} ${list.length === 1 ? "drill" : "drills"} queued from ${title}</h2>
           <p class="muted">Your chosen order below is exactly what the guided session screens will run.</p>
           <ol class="queued-order">
             ${list
               .map((name) => `<li><span class="order-number">${getDrillIndex(list, name)}</span>${name}</li>`)
               .join("")}
           </ol>
           <p class="note"><span>${icon.info} Mode selection and the guided timer session are built in the next update.</span></p>
         </div>`
      : `<p class="note"><span>${icon.info} Build or pick a workout first, then choose a training mode here.</span></p>`;

  return `
    <section class="view view--setup" aria-labelledby="setup-title">
      <p class="eyebrow">Setup <span aria-hidden="true">•</span> Training Mode</p>
      <h1 id="setup-title">Set up your training</h1>
      <p class="lead">A quick setup tailors drills to you. You can move back without losing your choices.</p>

      ${queued}

      <ol class="steps">
        <li><strong>Environment</strong> — Indoor or Outdoor</li>
        <li><strong>Profile</strong> — Training level, available space, primary goal</li>
        <li><strong>Mode</strong> — Camera-supported option or Timer Only</li>
      </ol>
      <div class="cta-row">
        <a class="btn btn--secondary" href="#/training">Back to Workout Builder</a>
        <a class="btn btn--primary" href="#/home">Back to Home</a>
      </div>
    </section>`;
}

// 1-based position of a name within the list (defensive helper for setup).
function getDrillIndex(list, name) {
  return list.indexOf(name) + 1;
}

function notFound() {
  return `
    <section class="view" aria-labelledby="nf-title">
      <h1 id="nf-title">Page not found</h1>
      <p class="lead">That screen doesn't exist yet.</p>
      <div class="cta-row"><a class="btn btn--primary" href="#/home">Back to Home</a></div>
    </section>`;
}

const TITLES = {
  home: "Home",
  training: "Workout Builder",
  drill: "Drill Details",
  review: "Workout Review",
  session: "Guided Session",
  progress: "Progress",
  profile: "Profile",
  setup: "Set Up",
};

// Returns { html, title } for a route key. `param` carries the drill slug for
// the detail route.
export function renderView(route, param) {
  switch (route) {
    case "home":
      return { html: home(), title: TITLES.home };
    case "training":
      return { html: training(), title: TITLES.training };
    case "drill":
      return { html: drillDetail(param), title: TITLES.drill };
    case "review":
      return { html: review(), title: TITLES.review };
    case "session":
      return { html: renderSession(), title: TITLES.session };
    case "progress":
      return { html: progress(), title: TITLES.progress };
    case "profile":
      return { html: profile(), title: TITLES.profile };
    case "setup":
      return { html: setup(), title: TITLES.setup };
    default:
      return { html: notFound(), title: "Not found" };
  }
}
