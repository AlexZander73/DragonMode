import type { DragonState, RelicReveal } from "./data";

export type RelicItem = {
  id: string;
  setId: string;
  name: string;
  rarity: RelicReveal["rarity"];
  type: "dragon" | "lair" | "chronicle" | "sound" | "frame";
  description: string;
  craftCost: number;
};

export const RELIC_SETS = [
  { id: "festival-of-echoes", name: "Festival of Echoes", seasonId: "festival-of-echoes", archived: false, available: true },
  { id: "deep-vault-bloom", name: "Deep Vault Bloom", seasonId: "deep-vault-bloom", archived: true, available: true },
];

export const RELIC_ITEMS: RelicItem[] = [
  { id: "echo-lantern", setId: "festival-of-echoes", name: "Echo Lantern", rarity: "common", type: "lair", description: "A calm light for records awaiting review.", craftCost: 5 },
  { id: "mirror-ink-frame", setId: "festival-of-echoes", name: "Mirror-Ink Frame", rarity: "common", type: "frame", description: "A Chronicle border that keeps the original line visible.", craftCost: 5 },
  { id: "moonfair-ribbon", setId: "festival-of-echoes", name: "Moonfair Ribbon", rarity: "common", type: "dragon", description: "A ribbon celebrating two real tickets that looked alike.", craftCost: 5 },
  { id: "balanced-bell", setId: "festival-of-echoes", name: "Balanced Bell", rarity: "rare", type: "lair", description: "Rings only for confirmed reconciliation—not wealth.", craftCost: 12 },
  { id: "river-between-vaults", setId: "festival-of-echoes", name: "River Between Vaults", rarity: "rare", type: "chronicle", description: "An illustration for money moving between owned accounts.", craftCost: 12 },
  { id: "restored-archive", setId: "festival-of-echoes", name: "Restored Archive Aurora", rarity: "mythic", type: "lair", description: "An aurora made from provenance, patience, and human truth.", craftCost: 30 },
  { id: "vault-bloom", setId: "deep-vault-bloom", name: "Vault Bloom", rarity: "common", type: "lair", description: "A flower that opens beside a dated rate period.", craftCost: 5 },
  { id: "promo-comet", setId: "deep-vault-bloom", name: "Promotion Comet", rarity: "common", type: "frame", description: "Marks an introductory rate and its ending without alarm.", craftCost: 5 },
  { id: "maturity-key", setId: "deep-vault-bloom", name: "Maturity Key", rarity: "rare", type: "chronicle", description: "A keepsake for a term date and its visible conditions.", craftCost: 12 },
  { id: "compound-constellation", setId: "deep-vault-bloom", name: "Compound Constellation", rarity: "mythic", type: "dragon", description: "A cosmetic constellation whose light never alters a balance.", craftCost: 30 },
];

export const RELIC_ODDS = { common: 0.72, rare: 0.24, mythic: 0.04 } as const;

const hashNumber = (value: string) => {
  let hash = 2166136261;
  for (const char of value) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) / 0xffffffff;
};

const rarityFor = (state: DragonState, eventId: string): RelicReveal["rarity"] => {
  if (state.collection.pullsSinceMythic >= 29) return "mythic";
  const roll = hashNumber(`${eventId}|rarity|${state.collection.reveals.length}`);
  return roll < RELIC_ODDS.mythic ? "mythic" : roll < RELIC_ODDS.mythic + RELIC_ODDS.rare ? "rare" : "common";
};

const choose = <T,>(items: T[], seed: string) => items[Math.min(items.length - 1, Math.floor(hashNumber(seed) * items.length))];

export function collectionChoiceDue(state: DragonState) {
  return (state.collection.reveals.length + 1) % 12 === 0;
}

export function revealRelic(state: DragonState, mode: RelicReveal["mode"], options: { setId?: string; chosenItemId?: string; eventId?: string } = {}) {
  const eventId = options.eventId ?? `relic-${Date.now()}-${state.collection.reveals.length}`;
  if (state.collection.reveals.some((reveal) => reveal.eventId === eventId)) return state;
  const setId = options.setId ?? state.collection.targetedSetId;
  const targeted = RELIC_ITEMS.filter((item) => item.setId === setId);
  const available = RELIC_ITEMS.filter((item) => mode === "surprise" ? RELIC_SETS.some((set) => set.id === item.setId && set.available) : item.setId === setId);
  if (!available.length) throw new Error("No relics are available in that collection");
  const owned = new Set(state.collection.ownedItemIds);
  const targetedUnseen = targeted.filter((item) => !owned.has(item.id));
  const guaranteedNew = state.collection.pullsSinceNew >= 4;
  const choiceDue = collectionChoiceDue(state);
  let item: RelicItem | undefined;
  if (mode === "crafted" || mode === "choice") {
    item = available.find((candidate) => candidate.id === options.chosenItemId);
    if (!item) throw new Error("Choose an available relic first");
  } else if (choiceDue && targetedUnseen.length) {
    throw new Error("Your twelfth reveal is a choice. Select one of the unseen relics.");
  } else {
    const rarity = rarityFor(state, eventId);
    const protectedPool = guaranteedNew && targetedUnseen.length ? targetedUnseen : available;
    const pool = protectedPool.filter((candidate) => candidate.rarity === rarity);
    const fallback = protectedPool;
    item = choose(pool.length ? pool : fallback, `${eventId}|item`);
  }
  const duplicate = owned.has(item.id);
  if (mode === "crafted") {
    if (duplicate) throw new Error("That relic is already in your constellation");
    if (state.collection.stardust < item.craftCost) throw new Error(`${item.craftCost} Stardust is needed to craft this relic`);
  } else if (state.checkIns.loreKeys < 1) {
    throw new Error("One earned Lore Key is needed. Keys are never sold.");
  }
  const reveal: RelicReveal = { id: `reveal-${eventId}`, itemId: item.id, setId: item.setId, rarity: item.rarity, mode, revealedAt: new Date().toISOString(), duplicate, oddsShown: true, eventId };
  const stardustGain = duplicate ? item.rarity === "mythic" ? 12 : item.rarity === "rare" ? 5 : 2 : 0;
  return {
    ...state,
    checkIns: mode === "crafted" ? state.checkIns : { ...state.checkIns, loreKeys: state.checkIns.loreKeys - 1 },
    collection: {
      ...state.collection,
      stardust: mode === "crafted" ? state.collection.stardust - item.craftCost : state.collection.stardust + stardustGain,
      ownedItemIds: duplicate ? state.collection.ownedItemIds : [...state.collection.ownedItemIds, item.id],
      reveals: [reveal, ...state.collection.reveals].slice(0, 500),
      pullsSinceNew: duplicate ? state.collection.pullsSinceNew + 1 : 0,
      pullsSinceMythic: item.rarity === "mythic" ? 0 : state.collection.pullsSinceMythic + 1,
    },
    progression: duplicate ? state.progression : {
      ...state.progression,
      relics: state.progression.relics.includes(item.name) ? state.progression.relics : [...state.progression.relics, item.name],
      unlockedCosmetics: state.progression.unlockedCosmetics.includes(item.name) ? state.progression.unlockedCosmetics : [...state.progression.unlockedCosmetics, item.name],
    },
  };
}

export function archiveSeason(state: DragonState, seasonId: string) {
  return { ...state, collection: { ...state.collection, activeSeasonId: state.collection.activeSeasonId === seasonId ? undefined : state.collection.activeSeasonId, archivedSeasonIds: state.collection.archivedSeasonIds.includes(seasonId) ? state.collection.archivedSeasonIds : [...state.collection.archivedSeasonIds, seasonId] } };
}
