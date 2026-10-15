"use client";
import { useEffect, useRef, useState } from "react";
import {
  HEIGHT,
  houseAt,
  regionAt,
  REGION_H,
  REGION_W,
  ROOM_H,
  ROOM_W,
  roomTileAt,
  Save,
  sceneOf,
  tileAt,
  TOWNS,
  walkable,
  WIDTH,
} from "@/lib/game";
import type { Trainer } from "@/lib/firebase";
import { worldViewport } from "@/lib/controls";
import {
  initialMotion,
  updateMotion,
  playerFrame,
  playerSourceFrame,
} from "@/lib/player-sprite";
import {
  initialCamera,
  updateCamera,
  cameraPosition,
  clampCamera,
} from "@/lib/camera";
import { npcAnimationFrame, npcSourceFrame } from "@/lib/npc-sprite";
const SIZE = 24;
const PADDING = SIZE * 2;
export default function World({
  save,
  trainers,
  guide,
  running,
  onMove,
}: {
  save: Save;
  trainers: Trainer[];
  guide: { x: number; y: number } | null;
  running: boolean;
  onMove: (dx: number, dy: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const px = save.room ? save.room.x : save.x,
    py = save.room ? save.room.y : save.y;
  const motion = useRef(initialMotion(px, py));
  const camera = useRef(initialCamera(px, py));
  const walker = useRef(initialCamera(px, py));
  const playerAt = useRef({ x: 0.5, y: 0.5 });
  const gx = guide?.x ?? 0,
    gy = guide?.y ?? 0,
    hasGuide = guide !== null;
  const guideWalk = useRef(initialCamera(gx, gy));
  const guideMotion = useRef(initialMotion(gx, gy));
  const scene = useRef(sceneOf(save));
  const [spriteSheet, setSpriteSheet] = useState<HTMLImageElement | null>(null);
  const [npcSheet, setNpcSheet] = useState<HTMLImageElement | null>(null);
  const [npcWalkSheets, setNpcWalkSheets] = useState<
    (HTMLImageElement | null)[]
  >([null, null, null]);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const image = new Image();
    image.onload = () => setSpriteSheet(image);
    image.src = "/art/player-chibi.png";
    const npcs = new Image();
    npcs.onload = () => setNpcSheet(npcs);
    npcs.src = "/art/npcs-chibi.png";
    const walking = [0, 1, 2].map((index) => {
      const sheet = new Image();
      sheet.onload = () =>
        setNpcWalkSheets((previous) =>
          previous.map((value, i) => (i === index ? sheet : value)),
        );
      sheet.src = `/art/npc-walk-${index}.png`;
      return sheet;
    });
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => {
      image.onload = null;
      npcs.onload = null;
      walking.forEach((sheet) => {
        sheet.onload = null;
      });
      preference.removeEventListener("change", updatePreference);
    };
  }, []);
  const [viewport, setViewport] = useState(() => worldViewport(744, 504));
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setViewport(worldViewport(width, height));
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const canvas = ref.current;
    const output = canvas?.getContext("2d");
    if (!canvas || !output) return;
    const layer = document.createElement("canvas");
    layer.width = viewport.width + PADDING * 2;
    layer.height = viewport.height + PADDING * 2;
    const ctx = layer.getContext("2d");
    if (!ctx) return;
    const { cols, rows, width, height } = viewport;
    const cx = Math.floor(cols / 2),
      cy = Math.floor(rows / 2);
    const area = regionAt(save.x, save.y);
    const biome = Math.floor(area / 5);
    const ground = ["#a5ce7e", "#c6c18a", "#9fc9a1", "#a4b7ba", "#b5ce93"][
      biome
    ];
    const canopy = ["#538c50", "#a17e45", "#4b8e7a", "#657d91", "#a37f99"][
      biome
    ];
    const left = save.room ? 0 : (area % 5) * REGION_W,
      top = save.room ? 0 : Math.floor(area / 5) * REGION_H;
    const camX = clampCamera(
        px,
        left,
        left + (save.room ? ROOM_W : REGION_W) - 1,
        cx,
      ),
      camY = clampCamera(
        py,
        top,
        top + (save.room ? ROOM_H : REGION_H) - 1,
        cy,
      );
    if (scene.current !== sceneOf(save)) {
      scene.current = sceneOf(save);
      motion.current = {
        ...motion.current,
        x: px,
        y: py,
        lastStepAt: -Infinity,
      };
      camera.current = initialCamera(camX, camY);
      walker.current = initialCamera(px, py);
      guideWalk.current = initialCamera(gx, gy);
      guideMotion.current = initialMotion(gx, gy);
    }
    const tween = running ? 75 : undefined;
    motion.current = updateMotion(motion.current, px, py, performance.now());
    camera.current = updateCamera(
      camera.current,
      camX,
      camY,
      performance.now(),
      reducedMotion,
      tween,
    );
    walker.current = updateCamera(
      walker.current,
      px,
      py,
      performance.now(),
      reducedMotion,
      tween,
    );
    guideMotion.current = updateMotion(
      guideMotion.current,
      gx,
      gy,
      performance.now(),
    );
    guideWalk.current = updateCamera(
      guideWalk.current,
      gx,
      gy,
      performance.now(),
      reducedMotion,
      320,
    );
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.translate(
      PADDING + Math.floor((width - cols * SIZE) / 2),
      PADDING + Math.floor((height - rows * SIZE) / 2),
    );
    const ox = Math.floor(camX) - cx,
      oy = Math.floor(camY) - cy;
    const outside = (x: number, y: number) =>
      x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT && regionAt(x, y) !== area;
    const rect = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    for (let row = -2; row < rows + 2; row++)
      for (let col = -2; col < cols + 2; col++) {
        const wx = ox + col,
          wy = oy + row,
          x = col * SIZE,
          y = row * SIZE,
          n = Math.abs((wx * 13 + wy * 7) % 9);
        if (save.room) {
          const r = roomTileAt(wx, wy);
          if (r === "void") {
            rect(x, y, 24, 24, "#1f2b24");
            continue;
          }
          if (r === "wall") {
            rect(x, y, 24, 24, "#8a6a4f");
            rect(x, y + 20, 24, 4, "#6e5240");
            if (wy === 0) rect(x, y + 8, 24, 2, "#a7856a");
            continue;
          }
          rect(x, y, 24, 24, "#e2c792");
          rect(x, y + 7, 24, 1, "#cfb07c");
          rect(x, y + 15, 24, 1, "#cfb07c");
          rect(x + ((wy % 2) * 12 + 4), y, 1, 7, "#cfb07c");
          if (r === "rug") rect(x + 1, y + 1, 22, 22, "#b65f55");
          if (r === "rug") rect(x + 4, y + 4, 16, 16, "#d4836d");
          if (r === "door") {
            rect(x + 2, y + 4, 20, 20, "#5b4636");
            rect(x + 4, y + 6, 16, 16, "#9c7a52");
            rect(x + 6, y + 10, 12, 2, "#c8a874");
          }
          if (r === "shelf") {
            rect(x + 1, y, 22, 22, "#7a5638");
            rect(x + 3, y + 3, 18, 7, "#5a3e2a");
            rect(x + 3, y + 12, 18, 7, "#5a3e2a");
            rect(x + 5, y + 4, 3, 6, "#6d9bc3");
            rect(x + 10, y + 5, 3, 5, "#d4836d");
            rect(x + 14, y + 13, 4, 6, "#8bb36b");
          }
          if (r === "bed") {
            rect(x, y, 24, 24, "#f1e6cf");
            if (wy === 1) {
              rect(x + 3, y + 2, 18, 6, "#fffaf0");
              rect(x, y + 11, 24, 13, "#6f8fbf");
            } else {
              rect(x, y, 24, 20, "#6f8fbf");
              rect(x, y + 20, 24, 4, "#7a5638");
            }
          }
          if (r === "table") {
            rect(x, y + 4, 24, 14, "#9a6c45");
            rect(x, y + 4, 24, 3, "#b88559");
            rect(x + 3, y + 18, 3, 6, "#6e4a30");
            rect(x + 18, y + 18, 3, 6, "#6e4a30");
          }
          continue;
        }
        const t = tileAt(wx, wy);
        if (outside(wx, wy)) {
          rect(x, y, 24, 24, "#1f2b24");
          const entrance =
            t === "path" &&
            [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ].some(
              ([dx, dy]) =>
                regionAt(wx + dx, wy + dy) === area &&
                !outside(wx + dx, wy + dy) &&
                walkable(wx + dx, wy + dy),
            );
          if (entrance) {
            rect(x, y, 24, 24, "#e1cd98");
            rect(x, y, 24, 24, "#1f2b24a6");
          }
          continue;
        }
        rect(x, y, 24, 24, n % 3 === 0 ? "#9cc878" : ground);
        if (t === "grass" || t === "wild") {
          rect(x + 4 + n, y + 5, 2, 3, "#86b56a");
          rect(x + 15, y + 17 - n, 3, 2, "#b7d88c");
          if (t === "grass" && n === 5) {
            rect(x + 6, y + 16, 7, 3, "#85917c");
            rect(x + 7, y + 14, 5, 2, "#bac3a4");
          }
          if (t === "grass" && n === 7) {
            rect(x + 16, y + 8, 1, 5, "#5d8c55");
            rect(x + 14, y + 7, 5, 3, biome === 4 ? "#e5a7bd" : "#eee3b1");
          }
          if (n === 2) {
            rect(x + 8, y + 12, 3, 3, "#f2e9a2");
            rect(x + 9, y + 11, 1, 5, "#fff5c3");
          }
        }
        if (t === "path") {
          rect(x, y, 24, 24, "#e1cd98");
          rect(x + 3 + n, y + 8, 2, 1, "#ceb782");
          rect(x + 16, y + 19 - n, 3, 1, "#eedbac");
          if (tileAt(wx - 1, wy) !== "path") rect(x, y, 2, 24, "#c1b67c");
          if (tileAt(wx, wy - 1) !== "path") rect(x, y, 24, 2, "#c1b67c");
        }
        if (t === "wild") {
          for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++) {
              rect(x + 2 + i * 8, y + 4 + j * 7, 5, 4, "#589453");
              rect(x + 3 + i * 8, y + 2 + j * 7, 1, 5, "#3f7c49");
              rect(x + 6 + i * 8, y + 3 + j * 7, 1, 4, "#c2da7b");
            }
        }
        if (t === "water") {
          rect(x, y, 24, 24, "#71b4ba");
          rect(x + 3, y + 5 + n, 9, 2, "#a2d3ce");
          rect(x + 14, y + 17, 6, 1, "#a2d3ce");
          if (tileAt(wx, wy - 1) !== "water") rect(x, y, 24, 3, "#d2d4a3");
          if (tileAt(wx - 1, wy) !== "water") rect(x, y, 3, 24, "#d2d4a3");
          if (tileAt(wx + 1, wy) !== "water") rect(x + 21, y, 3, 24, "#d2d4a3");
          if (tileAt(wx, wy + 1) !== "water") rect(x, y + 21, 24, 3, "#d2d4a3");
          if (n === 3) {
            rect(x + 7, y + 9, 6, 3, "#65996f");
            rect(x + 10, y + 8, 2, 2, "#ead6c1");
          }
        }
        if (t === "tree") {
          rect(x + 9, y + 16, 7, 8, "#786c49");
          rect(x + 5, y + 6, 16, 15, "#386c46");
          rect(x + 2, y + 9, 21, 9, "#467f4c");
          rect(x + 5, y + 3, 16, 12, canopy);
          rect(x + 8, y + 1, 10, 9, "#639b56");
          rect(x + 7, y + 5, 4, 3, "#80ae65");
          rect(x + 5, y + 18, 15, 2, "#356644");
        }
        if (t === "house") {
          const a = wx % 32,
            b = wy % 24,
            house = houseAt(wx, wy)!;
          const roof = b < house.bottom - 1;
          rect(
            x,
            y,
            24,
            24,
            roof
              ? ["#ad6953", "#6d8397", "#8c7792"][(area + house.left) % 3]
              : "#f1e0af",
          );
          if (roof) {
            rect(x, y + 2, 24, 2, "#c87c60");
            rect(x, y + 13, 24, 2, "#945640");
            rect(x + (b % 2) * 10, y + 3, 2, 10, "#955d48");
          } else {
            rect(x, y + 22, 24, 2, "#c8b78e");
            if (a === house.left + 1 || a === house.right) {
              rect(x + 6, y + 4, 12, 17, "#668e8c");
              rect(x + 11, y + 4, 2, 17, "#d3d5b0");
              rect(x + 6, y + 11, 12, 2, "#d3d5b0");
            }
            if (b === 8 && (a === 9 || a === 25)) {
              rect(x + 6, y + 2, 13, 22, "#796d56");
              rect(x + 8, y + 4, 9, 20, "#49544b");
            }
          }
        }
      }
    const person = (
      wx: number,
      wy: number,
      color: string,
      label?: string,
      painter = ctx,
      npcFrame?: number,
      walkingFrame?: { row: number; column: number },
    ) => {
      const rect = (
        x: number,
        y: number,
        w: number,
        h: number,
        color: string,
      ) => {
        painter.fillStyle = color;
        painter.fillRect(x, y, w, h);
      };
      const x = (wx - ox) * 24,
        y = (wy - oy) * 24;
      if (
        x < -PADDING ||
        y < -PADDING ||
        x > cols * SIZE + PADDING ||
        y > rows * SIZE + PADDING
      )
        return;
      const walkingSheet =
        npcFrame !== undefined ? npcWalkSheets[npcFrame] : null;
      if ((npcSheet || walkingSheet) && npcFrame !== undefined) {
        painter.fillStyle = "#354c3b40";
        painter.beginPath();
        painter.ellipse(x + 12, y + 21, 7, 3, 0, 0, Math.PI * 2);
        painter.fill();
        if (walkingSheet && walkingFrame) {
          const source = npcSourceFrame(
            npcFrame,
            walkingFrame.row,
            walkingFrame.column,
          );
          painter.drawImage(
            walkingSheet,
            source.x,
            source.y,
            source.width,
            source.height,
            x - 4,
            y - 9,
            32,
            32,
          );
        } else if (npcSheet)
          painter.drawImage(
            npcSheet,
            npcFrame % 2 === 0 ? 82 : 579,
            npcFrame < 2 ? 45 : 605,
            600,
            600,
            x - 4,
            y - 9,
            32,
            32,
          );
      } else {
        rect(x + 5, y + 21, 15, 3, "#789864");
        rect(x + 8, y + 15, 4, 7, "#3d4d51");
        rect(x + 15, y + 15, 4, 7, "#3d4d51");
        rect(x + 6, y + 10, 15, 8, color);
        rect(x + 8, y + 3, 11, 8, "#edc99c");
        rect(x + 6, y + 1, 15, 5, color);
        rect(x + 5, y + 5, 17, 2, color);
        rect(x + 16, y + 8, 2, 2, "#364b44");
      }
      if (label) {
        painter.font = "bold 9px monospace";
        painter.textAlign = "center";
        painter.fillStyle = "#fff9e5";
        painter.fillText(label, x + 12, y - 5);
      }
    };
    if (!save.room) {
      for (const t of trainers)
        if (
          t.updatedAt &&
          Date.now() - t.updatedAt.toMillis() < 120000 &&
          regionAt(t.x, t.y) === area
        )
          person(t.x, t.y, "#6988b3", t.name, ctx, 3);
    }

    const offsetX = Math.floor((width - cols * SIZE) / 2),
      offsetY = Math.floor((height - rows * SIZE) / 2);
    let animation = 0;
    const paint = (now: number) => {
      output.setTransform(1, 0, 0, 1, 0, 0);
      output.imageSmoothingEnabled = false;
      output.clearRect(0, 0, width, height);
      const position = cameraPosition(camera.current, now);
      const step = cameraPosition(walker.current, now);
      output.drawImage(
        layer,
        Math.round((Math.floor(camX) - position.x) * SIZE) - PADDING,
        Math.round((Math.floor(camY) - position.y) * SIZE) - PADDING,
      );
      const playerX = offsetX + Math.round((step.x - position.x + cx) * SIZE),
        playerY = offsetY + Math.round((step.y - position.y + cy) * SIZE);
      playerAt.current = {
        x: (playerX + SIZE / 2) / width,
        y: (playerY + SIZE / 2) / height,
      };
      const frame = playerFrame(
        motion.current,
        now,
        reducedMotion,
        running ? 55 : undefined,
      );
      const guideAt = cameraPosition(guideWalk.current, now);
      const drawGuide = () => {
        if (!hasGuide) return;
        const screenX =
            offsetX + Math.round((guideAt.x - position.x + cx) * SIZE),
          screenY = offsetY + Math.round((guideAt.y - position.y + cy) * SIZE);
        output.save();
        output.translate(
          screenX - (gx - ox) * SIZE,
          screenY - (gy - oy) * SIZE,
        );
        person(
          gx,
          gy,
          TOWNS.has(area) ? "#8b739e" : "#c79b53",
          undefined,
          output,
          TOWNS.has(area) ? area % 2 : 2,
          npcAnimationFrame(
            guideMotion.current,
            now,
            guideAt.moving,
            reducedMotion,
          ),
        );
        output.restore();
      };
      if (guideAt.y <= step.y) drawGuide();
      if (!spriteSheet) {
        output.save();
        output.translate(
          playerX - (px - ox) * SIZE,
          playerY - (py - oy) * SIZE,
        );
        person(px, py, "#d97b4f", undefined, output);
        output.restore();
      }
      if (spriteSheet) {
        output.fillStyle = "#354c3b40";
        output.beginPath();
        output.ellipse(playerX + 12, playerY + 21, 7, 3, 0, 0, Math.PI * 2);
        output.fill();
        const source = playerSourceFrame(frame.row, frame.column);
        output.drawImage(
          spriteSheet,
          source.x,
          source.y,
          source.width,
          source.height,
          playerX - 4,
          playerY - 9,
          32,
          32,
        );
      }
      if (guideAt.y > step.y) drawGuide();
      if (frame.walking || position.moving || step.moving || guideAt.moving)
        animation = requestAnimationFrame(paint);
    };
    paint(performance.now());
    return () => cancelAnimationFrame(animation);
  }, [
    save,
    trainers,
    viewport,
    spriteSheet,
    npcSheet,
    npcWalkSheets,
    reducedMotion,
    gx,
    gy,
    hasGuide,
    running,
  ]);
  return (
    <canvas
      ref={ref}
      width={viewport.width}
      height={viewport.height}
      className="world-canvas"
      aria-label="Explorable world. Move with arrow keys or W A S D. Press J near a guide to talk. Press K for the menu."
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect(),
          dx = (e.clientX - r.left) / r.width - playerAt.current.x,
          dy = (e.clientY - r.top) / r.height - playerAt.current.y;
        if (Math.abs(dx) > Math.abs(dy)) onMove(Math.sign(dx), 0);
        else onMove(0, Math.sign(dy));
      }}
    />
  );
}
