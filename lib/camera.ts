export const CAMERA_DURATION = 140;
export type Camera = {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  startedAt: number;
};
export function initialCamera(x: number, y: number): Camera {
  return { x, y, fromX: x, fromY: y, startedAt: -Infinity };
}
export function cameraPosition(camera: Camera, now: number) {
  const progress = Math.min(
    1,
    Math.max(0, (now - camera.startedAt) / CAMERA_DURATION),
  );
  return {
    x: camera.fromX + (camera.x - camera.fromX) * progress,
    y: camera.fromY + (camera.y - camera.fromY) * progress,
    moving: progress < 1,
  };
}
export function updateCamera(
  camera: Camera,
  x: number,
  y: number,
  now: number,
  reducedMotion = false,
): Camera {
  if (reducedMotion) return initialCamera(x, y);
  if (x === camera.x && y === camera.y) return camera;
  if (Math.abs(x - camera.x) + Math.abs(y - camera.y) !== 1)
    return initialCamera(x, y);
  const position = cameraPosition(camera, now);
  return { x, y, fromX: position.x, fromY: position.y, startedAt: now };
}
