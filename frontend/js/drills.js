// Drill catalog + workout math (TRI-11).
// Copy and data are taken verbatim from the final Figma prototype
// (polish-cause-11757856.figma.site) and mirror the seed in
// TT3database/drill_catalog.sql. Replace with a fetch() to Ethan's API
// (query 5 "return all drills") in a later ticket.

export const DRILLS = [
  {
    slug: "figure-eight-control",
    name: "Figure Eight Control",
    focus: "Puck control",
    goal: "Build control through wide, consistent puck paths.",
    time: "4:00",
    activeSeconds: 240,
    restSeconds: 45,
    rounds: 1,
    measurement: "repetitions",
    reps: "Target: 80 loops",
    equipment: "Stick, puck or training ball, 2 markers",
    environment: "Off-ice on a flat, non-slip surface",
    placement:
      "Set two markers side by side with one stick blade of space between them.",
    caption: "Loop around both markers",
    instructions: [
      "Place two markers about one stick blade apart.",
      "Move the puck in a complete figure-eight path around both markers.",
      "Keep the top hand away from your body and look forward after each loop.",
    ],
    repDefinition:
      "One full figure-eight around both markers, returning to the starting side, counts as one repetition.",
    cue: "Keep both loops smooth and equal in size.",
  },
  {
    slug: "edgework-circuit",
    name: "Edgework Circuit",
    focus: "Coordination",
    goal: "Coordinate lateral footwork with controlled puck movement.",
    time: "4:00",
    activeSeconds: 240,
    restSeconds: 45,
    rounds: 1,
    measurement: "repetitions",
    reps: "Target: 24 lateral cycles",
    equipment: "Stick, puck or training ball, 3 markers; skates optional",
    environment:
      "Off-ice in athletic shoes, or on-ice with skates and rink-safe markers",
    placement:
      "Place three markers in a straight line to create two short lateral lanes.",
    caption: "Move laterally through three stations",
    instructions: [
      "Set three markers in a straight line, one large step apart.",
      "Move sideways around the outside of each marker while carrying the puck.",
      "Stay low and keep your chest facing forward as your feet change direction.",
    ],
    repDefinition:
      "Travel from the first marker to the third and back to the first while controlling the puck; that full out-and-back cycle is one repetition.",
    cue: "Use short side steps off ice; use controlled inside and outside skate edges on ice.",
  },
  {
    slug: "quick-hands-ladder",
    name: "Quick Hands Ladder",
    focus: "Speed",
    goal: "Increase hand speed without losing control.",
    time: "4:00",
    activeSeconds: 240,
    restSeconds: 45,
    rounds: 1,
    measurement: "repetitions",
    reps: "Target: 120 touches",
    equipment: "Stick, puck or training ball, 4 flat markers",
    environment: "Off-ice on a flat surface; no skates required",
    placement: "Place four flat markers in a line, about one foot apart.",
    caption: "Use short touches through each opening",
    instructions: [
      "Lay four markers in a short straight ladder.",
      "Move the puck left and right through each opening using short touches.",
      "Keep the blade close to the puck and increase speed only while control stays clean.",
    ],
    repDefinition:
      "Each controlled touch that moves the puck across one ladder opening counts as one repetition.",
    cue: "Keep touches short and quiet instead of reaching.",
  },
  {
    slug: "head-up-challenge",
    name: "Head-Up Challenge",
    focus: "Awareness",
    goal: "Keep your eyes forward while controlling the puck.",
    time: "3:00",
    activeSeconds: 180,
    restSeconds: 45,
    rounds: 1,
    measurement: "timed",
    reps: "Timed technique drill",
    equipment: "Stick, puck or training ball, 4 markers, forward reference card",
    environment: "Off-ice on a flat, non-slip surface",
    placement:
      "Use four markers to outline a small control box and place a numbered reference card at eye level.",
    caption: "Control the puck while looking forward",
    instructions: [
      "Stand in a comfortable athletic stance with clear space around the puck.",
      "Stickhandle continuously inside the marked box for the full interval.",
      "Look at the puck only briefly; return your eyes to the forward reference card.",
    ],
    repDefinition: null,
    cue: "Use peripheral vision—the ability to notice the puck without looking directly at it.",
  },
];

// The ready-made preset / recommended sequence is the first three drills.
export const PRESET_NAME = "Quick Hands Builder";
export const PRESET_DRILLS = DRILLS.slice(0, 3).map((d) => d.name);
export const RECOMMENDED_REASON =
  "Practice speed while protecting the control you built last week.";

// --- Lookups -------------------------------------------------------------

export function getDrill(key) {
  return (
    DRILLS.find((d) => d.name === key) ||
    DRILLS.find((d) => d.slug === key) ||
    null
  );
}

// --- Time helpers --------------------------------------------------------

// mm:ss
export function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Planned totals for an ordered list of drill names. Rest is counted between
// drills only (no rest after the final drill), matching the Figma math.
export function computeTotals(names) {
  const active = names.reduce((sum, n) => {
    const d = getDrill(n);
    return sum + (d ? d.activeSeconds : 0);
  }, 0);
  const rest = names.slice(0, -1).reduce((sum, n) => {
    const d = getDrill(n);
    return sum + (d ? d.restSeconds : 0);
  }, 0);
  return { active, rest, total: active + rest };
}

// Suggested-target line used on cards and detail.
export function targetLabel(drill) {
  return drill.measurement === "repetitions"
    ? drill.reps.replace(/^Target:\s*/, "")
    : "complete the full interval";
}
