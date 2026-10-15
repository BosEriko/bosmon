import { playerFrame, type PlayerMotion } from "./player-sprite";

export function npcAnimationFrame(
  motion: PlayerMotion,
  now: number,
  moving: boolean,
  reducedMotion = false,
) {
  return playerFrame(
    { ...motion, lastStepAt: moving ? now : -Infinity },
    now,
    reducedMotion,
    80,
  );
}

export function npcSourceFrame(character: number, row: number, column: number) {
  const origins = [
    { x: [5, 322, 637, 955], y: [20, 317, 615, 908] },
    { x: [23, 323, 626, 925], y: [20, 317, 617, 917] },
    { x: [49, 337, 629, 919], y: [16, 310, 608, 904] },
  ][character];
  return { x: origins.x[column], y: origins.y[row], width: 300, height: 300 };
}
