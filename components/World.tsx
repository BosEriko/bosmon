"use client";
import { useEffect, useRef, useState } from "react";
import { regionAt, Save, tileAt, TOWNS } from "@/lib/game";
import type { Trainer } from "@/lib/firebase";
import { worldViewport } from "@/lib/controls";
const SIZE = 24;
export default function World({
  save,
  trainers,
  onMove,
}: {
  save: Save;
  trainers: Trainer[];
  onMove: (dx: number, dy: number) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
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
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const { cols, rows, width, height } = viewport;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.translate(
      Math.floor((width - cols * SIZE) / 2),
      Math.floor((height - rows * SIZE) / 2),
    );
    const cx = Math.floor(cols / 2),
      cy = Math.floor(rows / 2);
    const ox = save.x - cx,
      oy = save.y - cy;
    const rect = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y, w, h);
    };
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const wx = ox + col,
          wy = oy + row,
          x = col * SIZE,
          y = row * SIZE,
          t = tileAt(wx, wy),
          n = Math.abs((wx * 13 + wy * 7) % 9);
        rect(x, y, 24, 24, n % 3 === 0 ? "#9cc878" : "#a5ce7e");
        if (t === "grass" || t === "wild") {
          rect(x + 4 + n, y + 5, 2, 3, "#86b56a");
          rect(x + 15, y + 17 - n, 3, 2, "#b7d88c");
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
        }
        if (t === "tree") {
          rect(x + 9, y + 16, 7, 8, "#786c49");
          rect(x + 5, y + 6, 16, 15, "#386c46");
          rect(x + 2, y + 9, 21, 9, "#467f4c");
          rect(x + 5, y + 3, 16, 12, "#538c50");
          rect(x + 8, y + 1, 10, 9, "#639b56");
          rect(x + 7, y + 5, 4, 3, "#80ae65");
          rect(x + 5, y + 18, 15, 2, "#356644");
        }
        if (t === "house") {
          const a = wx % 32,
            b = wy % 24;
          rect(x, y, 24, 24, b <= 6 ? "#ad6953" : "#f1e0af");
          if (b <= 6) {
            rect(x, y + 2, 24, 2, "#c87c60");
            rect(x, y + 13, 24, 2, "#945640");
            rect(x + (b % 2) * 10, y + 3, 2, 10, "#955d48");
          } else {
            rect(x, y + 22, 24, 2, "#c8b78e");
            if (a === 8 || a === 24) {
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
    const person = (wx: number, wy: number, color: string, label?: string) => {
      const x = (wx - ox) * 24,
        y = (wy - oy) * 24;
      if (x < 0 || y < 0 || x > cols * SIZE || y > rows * SIZE) return;
      rect(x + 5, y + 21, 15, 3, "#789864");
      rect(x + 8, y + 15, 4, 7, "#3d4d51");
      rect(x + 15, y + 15, 4, 7, "#3d4d51");
      rect(x + 6, y + 10, 15, 8, color);
      rect(x + 8, y + 3, 11, 8, "#edc99c");
      rect(x + 6, y + 1, 15, 5, color);
      rect(x + 5, y + 5, 17, 2, color);
      rect(x + 16, y + 8, 2, 2, "#364b44");
      if (label) {
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff9e5";
        ctx.fillText(label, x + 12, y - 5);
      }
    };
    const r = regionAt(save.x, save.y),
      rx = (r % 5) * 32,
      ry = Math.floor(r / 5) * 24;
    person(rx + 19, ry + 12, TOWNS.has(r) ? "#8b739e" : "#c79b53");
    for (const t of trainers)
      if (t.updatedAt && Date.now() - t.updatedAt.toMillis() < 120000)
        person(t.x, t.y, "#6988b3", t.name);
    person(save.x, save.y, "#d97b4f");
    ctx.strokeStyle = "#fff1c4";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx * 24 + 2, cy * 24 - 2, 21, 29);
  }, [save, trainers, viewport]);
  return (
    <canvas
      ref={ref}
      width={viewport.width}
      height={viewport.height}
      className="world-canvas"
      aria-label="Explorable world. Move with arrow keys or W A S D. Press J near a guide to talk. Press K for the menu."
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect(),
          dx = (e.clientX - r.left) / r.width - 0.5,
          dy = (e.clientY - r.top) / r.height - 0.5;
        if (Math.abs(dx) > Math.abs(dy)) onMove(Math.sign(dx), 0);
        else onMove(0, Math.sign(dy));
      }}
    />
  );
}
