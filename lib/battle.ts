import { awardXp, catchChance, maxHp, Monster, Save, SPECIES } from "./game";
export type Battle = { monster: Monster; message: string; done: boolean };
export type BattleAction = "attack" | "catch" | "run" | "heal";
export function resolveBattle(
  save: Save,
  battle: Battle,
  kind: BattleAction,
  random = Math.random,
): { save: Save; battle: Battle | null } {
  if (battle.done) return { save, battle };
  if (kind === "run") return { save, battle: null };
  const next = { ...save, team: save.team.map((m) => ({ ...m })) };
  const wild = { ...battle.monster },
    lead = next.team[0];
  let message = "";
  const unchanged = (message: string) => ({
    save,
    battle: { ...battle, message },
  });
  if (kind === "heal") {
    if (!next.potions)
      return unchanged("No potions left. Visit the supply bag to buy more.");
    next.potions--;
    const recovered = Math.min(35, maxHp(lead) - lead.hp);
    lead.hp += recovered;
    message = `Your companion recovered ${recovered} HP.`;
  }
  if (kind === "catch") {
    if (!next.orbs)
      return unchanged(
        "You need a capture orb. Open the supply bag after this encounter.",
      );
    if (next.team.length >= 100)
      return unchanged("Your sanctuary is full. You can still battle or flee.");
    next.orbs--;
    if (random() < catchChance(wild.hp, maxHp(wild))) {
      next.team.push({ ...wild, hp: maxHp(wild) });
      next.caught = Array.from(new Set([...next.caught, wild.species]));
      const xp = 25 + wild.level * 4;
      next.team[0] = awardXp(lead, xp);
      return {
        save: next,
        battle: {
          ...battle,
          done: true,
          message: `Gotcha! ${SPECIES[wild.species].name} joined your companions. +${xp} XP${next.team[0].level > lead.level ? " · Level up!" : ""}`,
        },
      };
    }
    message = "The orb shook… but it broke free!";
  }
  if (kind === "attack") {
    const damage = 8 + lead.level * 2 + Math.floor(random() * 5);
    wild.hp = Math.max(0, wild.hp - damage);
    message = `${SPECIES[lead.species].name} dealt ${damage} damage!`;
    if (!wild.hp) {
      const xp = 35 + wild.level * 8;
      next.team[0] = awardXp(lead, xp);
      next.coins += 20;
      next.wins++;
      return {
        save: next,
        battle: {
          monster: wild,
          done: true,
          message: `Victory! +${xp} XP · +20 coins${next.team[0].level > lead.level ? " · Level up!" : ""}`,
        },
      };
    }
  }
  const damage = 4 + wild.level;
  lead.hp = Math.max(0, lead.hp - damage);
  message += ` ${SPECIES[wild.species].name} struck back for ${damage}.`;
  if (!lead.hp) {
    next.x = 16;
    next.y = 12;
    next.team = next.team.map((m) => ({ ...m, hp: maxHp(m) }));
    return {
      save: next,
      battle: {
        monster: wild,
        done: true,
        message:
          "Your companion needs a rest. Mira brought you back to Willowbrook and healed your team.",
      },
    };
  }
  return { save: next, battle: { monster: wild, message, done: false } };
}
