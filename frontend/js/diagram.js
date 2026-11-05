// Drill movement diagrams (TRI-11).
// Lightweight inline-SVG rink sketches, one motion path per drill, matching
// the navy diagram cards in the final Figma prototype. The dashed orange
// line is the puck/player path; blue dots are markers.

const PATHS = {
  "figure-eight-control": `
    <circle class="rink-marker" cx="118" cy="95" r="6" />
    <circle class="rink-marker" cx="202" cy="95" r="6" />
    <path class="rink-path" d="M160 95 C160 55 118 55 118 95 C118 135 160 135 160 95 C160 55 202 55 202 95 C202 135 160 135 160 95 Z" />
    <circle class="rink-player" cx="160" cy="95" r="7" />`,

  "edgework-circuit": `
    <circle class="rink-marker" cx="95" cy="95" r="6" />
    <circle class="rink-marker" cx="160" cy="95" r="6" />
    <circle class="rink-marker" cx="225" cy="95" r="6" />
    <path class="rink-path" d="M55 120 C95 120 95 62 128 62 C160 62 160 128 193 128 C225 128 225 70 265 70" />
    <circle class="rink-player" cx="55" cy="120" r="7" />`,

  "quick-hands-ladder": `
    <line class="rink-gate" x1="80" y1="70" x2="80" y2="120" />
    <line class="rink-gate" x1="125" y1="70" x2="125" y2="120" />
    <line class="rink-gate" x1="170" y1="70" x2="170" y2="120" />
    <line class="rink-gate" x1="215" y1="70" x2="215" y2="120" />
    <path class="rink-path" d="M70 118 L102 72 L147 118 L192 72 L237 118" />
    <circle class="rink-player" cx="70" cy="118" r="7" />`,

  "head-up-challenge": `
    <rect class="rink-box" x="104" y="60" width="112" height="78" rx="8" />
    <path class="rink-eye" d="M146 44 C156 34 164 34 174 44 C164 54 156 54 146 44 Z" />
    <circle class="rink-eye-dot" cx="160" cy="44" r="4" />
    <path class="rink-path" d="M128 122 C146 92 178 150 196 110 C206 92 150 96 140 126" />
    <circle class="rink-player" cx="160" cy="99" r="7" />`,
};

// Returns the diagram card markup for a drill. `compact` is used in the
// builder grid (smaller, no play control).
export function drillDiagram(drill, { compact = false } = {}) {
  const inner = PATHS[drill.slug] || "";
  return `
    <figure class="rink ${compact ? "rink--compact" : ""}">
      <figcaption class="rink__label">${drill.name.toUpperCase()}</figcaption>
      <svg viewBox="0 0 320 180" role="img" aria-label="${drill.name} movement diagram: ${drill.caption}" preserveAspectRatio="xMidYMid meet">
        <rect class="rink-surface" x="6" y="6" width="308" height="168" rx="12" />
        <line class="rink-line" x1="160" y1="12" x2="160" y2="168" />
        ${inner}
      </svg>
      <p class="rink__caption">${drill.caption}</p>
    </figure>`;
}
