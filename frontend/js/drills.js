// Drill catalog — copy taken from the final Figma prototype and the seed data
// in TT3database/drill_catalog.sql. Replace with a fetch() to Ethan's API
// (query 5 "return all drills") in a later ticket.

export const DRILLS = [
  {
    name: "Figure Eight Control",
    skill: "Puck Control",
    description: "Build control through wide, consistent puck paths.",
    target: "80 loops",
    seconds: 240,
  },
  {
    name: "Edgework Circuit",
    skill: "Coordination",
    description: "Coordinate lateral footwork with controlled puck movement.",
    target: "24 lateral cycles",
    seconds: 240,
  },
  {
    name: "Quick Hands Ladder",
    skill: "Speed",
    description: "Increase hand speed without losing control.",
    target: "120 touches",
    seconds: 240,
  },
  {
    name: "Head-Up Challenge",
    skill: "Awareness",
    description: "Keep your eyes forward while controlling the puck.",
    target: "Timed technique drill",
    seconds: 240,
  },
];

// mm:ss helper used by the Training cards.
export function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
