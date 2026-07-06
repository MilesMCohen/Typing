// Deterministic pseudo-random so the terrain looks the same on every load
// instead of jittering around on each mount.
export function hash(i) {
  return (Math.sin(i * 12.9898) * 43758.5453) % 1;
}

export function jitter(i, amount) {
  return (hash(i) - Math.floor(hash(i))) * amount - amount / 2;
}

// Crags the leopard (or its prey, see `seed`) jumps between: ground at the
// start, bumpy mid-heights, a tall snow-capped peak at the end. `seed` lets a
// second call generate a differently-bumpy middle section (so the prey looks
// like it's leaping across its own terrain) while keeping the start and end
// crags identical to the seed-0 track — that's what lets the two animals
// visibly converge on the same peak at the end of a lesson.
export function buildCrags(numCrags, seed = 0) {
  return Array.from({ length: numCrags }, (_, i) => {
    const isEndpoint = i === 0 || i === numCrags - 1;
    const jitterIndex = isEndpoint ? i : i + seed;
    const worldX = 60 + i * 150 + jitter(jitterIndex, 30);
    let y;
    if (i === 0) y = 150;
    else if (i === numCrags - 1) y = 34;
    else y = 105 + jitter(jitterIndex + 50, 44);
    return { worldX, y };
  });
}

const JUMP_ARC = 26;

// Interpolates the leopard's world position between crags for a given
// typing progress (0-1), arcing upward mid-jump between each pair.
export function leopardPosition(crags, progress) {
  const segments = crags.length - 1;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const scaled = clamped * segments;
  const segIndex = Math.min(Math.floor(scaled), segments - 1);
  const t = clamped >= 1 ? 1 : scaled - segIndex;
  const from = crags[segIndex];
  const to = crags[segIndex + 1];
  const worldX = from.worldX + (to.worldX - from.worldX) * t;
  const y = from.y + (to.y - from.y) * t - JUMP_ARC * Math.sin(Math.PI * t);
  return { worldX, y };
}
