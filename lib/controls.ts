export type Direction = readonly [number, number];
export function keyDirection(key: string): Direction | null {
  const keys: Record<string, Direction> = {
    arrowup: [0, -1],
    w: [0, -1],
    arrowdown: [0, 1],
    s: [0, 1],
    arrowleft: [-1, 0],
    a: [-1, 0],
    arrowright: [1, 0],
    d: [1, 0],
  };
  return keys[key.toLowerCase()] ?? null;
}
export function keyAction(key: string): "confirm" | "back" | null {
  if (["j", "e"].includes(key.toLowerCase())) return "confirm";
  if (["k", "escape"].includes(key.toLowerCase())) return "back";
  return null;
}
export function nextControlIndex(
  current: number,
  count: number,
  direction: number,
): number {
  if (!count) return -1;
  if (current < 0) return direction < 0 ? count - 1 : 0;
  return (current + Math.sign(direction) + count) % count;
}
export function worldViewport(width: number, height: number) {
  const w = Math.max(24, Math.floor(width / 2)),
    h = Math.max(24, Math.floor(height / 2));
  const cols = Math.ceil(w / 24) | 1,
    rows = Math.ceil(h / 24) | 1;
  return { width: w, height: h, cols, rows };
}
