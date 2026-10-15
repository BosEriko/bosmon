export const SPECIES = [
  {
    name: "Spriglet",
    type: "Leaf",
    color: "#71995b",
    description:
      "A curious little companion. Its leaf-shaped ears turn toward the morning sun.",
  },
  {
    name: "Cindertail",
    type: "Fire",
    color: "#d97c50",
    description:
      "Its tail glows brighter around friends. Loves warm stones and stolen berries.",
  },
  {
    name: "Bubblot",
    type: "Water",
    color: "#609ea7",
    description:
      "Collects river pebbles and keeps its favorite one tucked beneath its collar.",
  },
  {
    name: "Zippip",
    type: "Spark",
    color: "#c6a23e",
    description:
      "A tiny thunderstorm with feathers. Runs faster when rain is on the way.",
  },
  {
    name: "Shroomshade",
    type: "Spirit",
    color: "#9d7bad",
    description:
      "A shy forest spirit that lights the path for travelers who have lost their way.",
  },
  {
    name: "Pebblisk",
    type: "Stone",
    color: "#8a918c",
    description:
      "Crystals grow on its back with every adventure. Surprisingly fond of belly rubs.",
  },
  {
    name: "Frostflutter",
    type: "Ice",
    color: "#80accc",
    description:
      "Its wings leave delicate frost patterns on the windows of mountain cottages.",
  },
  {
    name: "Bloomfawn",
    type: "Bloom",
    color: "#ca8b9c",
    description:
      "Flowers bloom wherever it rests. Finding one is a sign of a new beginning.",
  },
];
export const REGIONS = [
  "Willowbrook",
  "Dewdrop Trail",
  "Fernwood",
  "Mossy Passage",
  "Maplehaven",
  "Sunlit Path",
  "Amberfield",
  "Ember Ridge",
  "Copper Crossing",
  "Cinder Town",
  "Riverbend",
  "Ripple Route",
  "Azure Bay",
  "Seashell Trail",
  "Coral Harbor",
  "Moonlit Way",
  "Duskmere",
  "Crystal Pass",
  "Starlight Road",
  "Frostwick",
  "Blossom Trail",
  "Petal Grove",
  "Highland Path",
  "Summit Road",
  "Solara City",
];
export const TOWNS = new Set([0, 2, 4, 6, 9, 12, 14, 16, 19, 24]);
export const WIDTH = 160,
  HEIGHT = 120,
  REGION_W = 32,
  REGION_H = 24;
export type Monster = {
  id: string;
  species: number;
  level: number;
  xp: number;
  hp: number;
};
export type Save = {
  version: 1;
  updatedAt: number;
  name: string;
  x: number;
  y: number;
  team: Monster[];
  orbs: number;
  potions: number;
  coins: number;
  caught: number[];
  visited: number[];
  wins: number;
  steps: number;
  questClaimed: boolean;
  room: { x: number; y: number } | null;
};
export type Tile = "grass" | "wild" | "path" | "tree" | "water" | "house";
export const regionAt = (x: number, y: number) =>
  Math.floor(y / REGION_H) * 5 + Math.floor(x / REGION_W);
export function houseAt(x: number, y: number) {
  const r = regionAt(x, y),
    a = x % REGION_W,
    b = y % REGION_H;
  if (!TOWNS.has(r)) return null;
  for (const door of [9, 25]) {
    const left = door - (door === 9 ? 3 : 2),
      right = door + (door === 9 ? 1 + (r % 2) : 2),
      top = 3 + ((r + door) % 3);
    if (a >= left && a <= right && b >= top && b <= 8)
      return { left, right, top, bottom: 8, door };
  }
  return null;
}
const roadY = (a: number, r: number) =>
  12 + Math.round(Math.sin((a / 31) * Math.PI * 2) * (2 + (r % 3)));
const roadX = (b: number, r: number) =>
  16 + Math.round(Math.sin((b / 23) * Math.PI * 2) * (2 + ((r * 3) % 4)));
export function tileAt(x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return "tree";
  const a = x % REGION_W,
    b = y % REGION_H,
    r = regionAt(x, y);
  if (houseAt(x, y)) return "house";
  if (
    TOWNS.has(r) &&
    [9, 25].some(
      (door) => a === door && b >= 9 && b <= Math.max(9, roadY(door, r) + 1),
    )
  )
    return "path";
  if (
    Math.abs(b - roadY(a, r)) <= 1 ||
    Math.abs(a - roadX(b, r)) <= (TOWNS.has(r) ? 1 : 0)
  )
    return "path";
  if (a >= 17 && a <= 21 && b >= 10 && b <= 14) return "grass";
  if (a === 0 || a === 31 || b === 0 || b === 23) return "tree";
  const pondX = r % 3 === 0 ? 25 : r % 3 === 1 ? 7 : 26,
    pondY = r % 3 === 1 ? 6 : 18,
    pond =
      ((a - pondX) / (3 + (r % 3))) ** 2 + ((b - pondY) / (2 + (r % 2))) ** 2;
  if (pond < 1 + Math.sin(a * 1.7 + b * 0.8) * 0.22) return "water";
  const grove =
    Math.sin((a + r * 7) * 0.37) +
    Math.cos((b - r * 3) * 0.52) +
    Math.sin((a + b) * 0.24);
  if (grove > 1.35 || (x * 19 + y * 31 + x * y * 7) % 101 < 4) return "tree";
  const meadow = Math.sin((a - r * 2) * 0.29) + Math.cos((b + r) * 0.41);
  if (meadow > (TOWNS.has(r) ? 0.8 : 0.1)) return "wild";
  return "grass";
}
export const walkable = (x: number, y: number) =>
  ["grass", "wild", "path"].includes(tileAt(x, y));
export const isDoor = (x: number, y: number) =>
  tileAt(x, y) === "house" && y % 24 === 8 && (x % 32 === 9 || x % 32 === 25);
export const ROOM_W = 11,
  ROOM_H = 8,
  ROOM_DOOR = { x: 5, y: 7 };
export type RoomTile =
  "wall" | "floor" | "rug" | "bed" | "table" | "shelf" | "door" | "void";
export function roomTileAt(x: number, y: number): RoomTile {
  if (x < 0 || y < 0 || x >= ROOM_W || y >= ROOM_H) return "void";
  if (x === ROOM_DOOR.x && y === ROOM_DOOR.y) return "door";
  if (x === 0 || y === 0 || x === ROOM_W - 1 || y === ROOM_H - 1) return "wall";
  if (y === 1 && x >= 1 && x <= 3) return "shelf";
  if (x >= 8 && y <= 2) return "bed";
  if (y === 3 && x >= 4 && x <= 6) return "table";
  if (y >= 5 && x >= 4 && x <= 6) return "rug";
  return "floor";
}
export const roomWalkable = (x: number, y: number) =>
  ["floor", "rug"].includes(roomTileAt(x, y));
export type Guide = { area: number; x: number; y: number };
export const guideHome = (area: number): Guide => ({
  area,
  x: (area % 5) * REGION_W + 19,
  y: Math.floor(area / 5) * REGION_H + 12,
});
export function wander(
  guide: Guide,
  dx: number,
  dy: number,
  player: { x: number; y: number },
): Guide {
  const home = guideHome(guide.area),
    x = guide.x + dx,
    y = guide.y + dy;
  if (
    Math.abs(dx) + Math.abs(dy) !== 1 ||
    Math.abs(x - home.x) > 2 ||
    Math.abs(y - home.y) > 2 ||
    !walkable(x, y) ||
    (x === player.x && y === player.y)
  )
    return guide;
  return { ...guide, x, y };
}
export const sceneOf = (save: Pick<Save, "x" | "y" | "room">) =>
  save.room ? `room:${save.x},${save.y}` : `area:${regionAt(save.x, save.y)}`;
export const maxHp = (m: Pick<Monster, "level">) => 22 + m.level * 6;
export const makeMonster = (species: number, level = 5): Monster => ({
  id: crypto.randomUUID(),
  species,
  level,
  xp: 0,
  hp: maxHp({ level }),
});
export const initialSave = (): Save => ({
  version: 1,
  updatedAt: Date.now(),
  name: "Explorer",
  x: 16,
  y: 12,
  team: [makeMonster(0)],
  orbs: 15,
  potions: 5,
  coins: 120,
  caught: [0],
  visited: [0],
  wins: 0,
  steps: 0,
  questClaimed: false,
  room: null,
});
export function awardXp(monster: Monster, amount: number): Monster {
  let { level, xp, hp } = monster;
  xp += amount;
  while (xp >= level * 20 && level < 100) {
    xp -= level * 20;
    level++;
    hp += 6;
  }
  return {
    ...monster,
    level,
    xp: level === 100 ? 0 : xp,
    hp: Math.min(hp, maxHp({ level })),
  };
}
export function move(
  save: Save,
  dx: number,
  dy: number,
  blocked?: { x: number; y: number },
): Save {
  if (Math.abs(dx) + Math.abs(dy) !== 1) return save;
  if (save.room) {
    const x = save.room.x + dx,
      y = save.room.y + dy;
    if (x === ROOM_DOOR.x && y === ROOM_DOOR.y)
      return { ...save, room: null, steps: save.steps + 1 };
    if (!roomWalkable(x, y)) return save;
    return { ...save, room: { x, y }, steps: save.steps + 1 };
  }
  if (dy === -1 && isDoor(save.x, save.y - 1))
    return {
      ...save,
      room: { x: ROOM_DOOR.x, y: ROOM_DOOR.y - 1 },
      steps: save.steps + 1,
    };
  if (
    !walkable(save.x + dx, save.y + dy) ||
    (blocked && blocked.x === save.x + dx && blocked.y === save.y + dy)
  )
    return save;
  const x = save.x + dx,
    y = save.y + dy,
    r = regionAt(x, y);
  return {
    ...save,
    x,
    y,
    steps: save.steps + 1,
    visited: Array.from(new Set([...save.visited, r])),
  };
}
export const catchChance = (hp: number, total: number) =>
  Math.min(0.92, 0.28 + (1 - hp / total) * 0.65);
export function parseSave(raw: unknown): Save | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Save;
  const int = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
  if (
    s.version !== 1 ||
    !int(s.updatedAt, 0, Number.MAX_SAFE_INTEGER) ||
    typeof s.name !== "string" ||
    s.name.length > 24 ||
    !int(s.x, 0, 159) ||
    !int(s.y, 0, 119) ||
    !Array.isArray(s.team) ||
    !s.team.length ||
    s.team.length > 100 ||
    !s.team.every(
      (m) =>
        m &&
        typeof m.id === "string" &&
        int(m.species, 0, 7) &&
        int(m.level, 1, 100) &&
        int(m.xp, 0, 2000) &&
        int(m.hp, 0, maxHp(m)),
    )
  )
    return null;
  if (
    !["orbs", "potions", "coins", "wins", "steps"].every((k) =>
      int(s[k as keyof Save], 0, 100000000),
    ) ||
    typeof s.questClaimed !== "boolean" ||
    !Array.isArray(s.caught) ||
    !s.caught.every((v) => int(v, 0, 7)) ||
    !Array.isArray(s.visited) ||
    !s.visited.every((v) => int(v, 0, 24))
  )
    return null;
  const room = s.room ?? null;
  if (
    room !== null &&
    (typeof room !== "object" ||
      !int(room.x, 0, ROOM_W - 1) ||
      !int(room.y, 0, ROOM_H - 1) ||
      !roomWalkable(room.x, room.y) ||
      !isDoor(s.x, s.y - 1))
  )
    return null;
  if (!room && !walkable(s.x, s.y)) {
    const area = regionAt(s.x, s.y),
      home = guideHome(area);
    return { ...s, room, x: home.x - 1, y: home.y };
  }
  return { ...s, room };
}
