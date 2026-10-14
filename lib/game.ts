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
};
export type Tile = "grass" | "wild" | "path" | "tree" | "water" | "house";
export const regionAt = (x: number, y: number) =>
  Math.floor(y / REGION_H) * 5 + Math.floor(x / REGION_W);
export function tileAt(x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return "tree";
  const a = x % 32,
    b = y % 24,
    r = regionAt(x, y);
  if ((a >= 14 && a <= 17) || (b >= 11 && b <= 13)) return "path";
  if (
    TOWNS.has(r) &&
    ((a >= 6 && a <= 10) || (a >= 22 && a <= 26)) &&
    b >= 5 &&
    b <= 8
  )
    return "house";
  if (a === 0 || a === 31 || b === 0 || b === 23) return "tree";
  if (a >= 23 && a <= 29 && b >= 16 && b <= 21) return "water";
  const n = (x * 19 + y * 31 + x * y * 7) % 101;
  if (n < 11) return "tree";
  if (
    (a >= 3 && a <= 12 && b >= 15 && b <= 21) ||
    (a >= 21 && a <= 28 && b >= 2 && b <= 4)
  )
    return "wild";
  return "grass";
}
export const walkable = (x: number, y: number) =>
  ["grass", "wild", "path"].includes(tileAt(x, y));
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
export function move(save: Save, dx: number, dy: number): Save {
  if (Math.abs(dx) + Math.abs(dy) !== 1 || !walkable(save.x + dx, save.y + dy))
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
    !walkable(s.x, s.y) ||
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
  return s;
}
