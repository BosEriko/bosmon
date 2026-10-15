export type Facing = "south" | "west" | "east" | "north";
export type PlayerMotion = {
  x: number;
  y: number;
  facing: Facing;
  startedAt: number;
  lastStepAt: number;
};
export const WALK_DURATION = 180;
export function initialMotion(x: number, y: number): PlayerMotion {
  return { x, y, facing: "south", startedAt: 0, lastStepAt: -Infinity };
}
export function updateMotion(
  previous: PlayerMotion,
  x: number,
  y: number,
  now: number,
): PlayerMotion {
  const dx = x - previous.x,
    dy = y - previous.y;
  if (!dx && !dy) return previous;
  if (Math.abs(dx) + Math.abs(dy) !== 1)
    return { ...previous, x, y, lastStepAt: -Infinity };
  const facing: Facing =
    dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : "north";
  const continuing =
    now - previous.lastStepAt < WALK_DURATION && previous.facing === facing;
  return {
    x,
    y,
    facing,
    startedAt: continuing ? previous.startedAt : now,
    lastStepAt: now,
  };
}
export function playerFrame(
  motion: PlayerMotion,
  now: number,
  reducedMotion = false,
  frameDuration = 90,
) {
  const walking = !reducedMotion && now - motion.lastStepAt < WALK_DURATION;
  const frames = [1, 0, 3, 2];
  return {
    row: { south: 0, west: 1, east: 2, north: 3 }[motion.facing],
    column: walking
      ? frames[
          Math.floor(Math.max(0, now - motion.startedAt) / frameDuration) %
            frames.length
        ]
      : 0,
    walking,
  };
}

export function playerSourceFrame(row: number, column: number) {
  return {
    x: [20, 326, 632, 938][column],
    y: [25, 315, 605, 895][row],
    width: 300,
    height: 300,
  };
}
