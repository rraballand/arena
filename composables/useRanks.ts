import type { LolRank, ValRank } from '~/data/players'

export const LOL_ROLES = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT', 'FILL'] as const

export const LOL_RANKS: LolRank[] = [
  'UNRANKED', 'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
  'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER',
]
export const VAL_RANKS: ValRank[] = [
  'UNRANKED', 'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
  'DIAMOND', 'ASCENDANT', 'IMMORTAL', 'RADIANT',
]

/**
 * Rank weights, used only to seed the team draw for players with no match
 * history yet. Match points take over the moment someone has played, so these
 * numbers decide the first evening's teams and nothing after that.
 *
 * The scale is deliberately close to the points scale (3 per win): a CHALLENGER
 * seeded at 150 is worth ~50 wins, which is far more than any evening produces,
 * so the seed dominates until real results exist and then stops mattering.
 */
const LOL_SCORE: Record<LolRank, number> = {
  UNRANKED: 0, IRON: 10, BRONZE: 20, SILVER: 30, GOLD: 40,
  PLATINUM: 55, EMERALD: 65, DIAMOND: 80, MASTER: 100,
  GRANDMASTER: 120, CHALLENGER: 150,
}
const VAL_SCORE: Record<ValRank, number> = {
  UNRANKED: 0, IRON: 10, BRONZE: 20, SILVER: 30, GOLD: 40,
  PLATINUM: 55, DIAMOND: 75, ASCENDANT: 95, IMMORTAL: 120, RADIANT: 150,
}

/** Seed weight for a declared rank, 0 when unknown. */
export function rankSeed(rank: string | undefined, game: 'lol' | 'val'): number {
  if (!rank) return 0
  return game === 'lol'
    ? LOL_SCORE[rank as LolRank] ?? 0
    : VAL_SCORE[rank as ValRank] ?? 0
}

const LOL_ICON_KEY: Record<LolRank, string | null> = {
  UNRANKED: null,
  IRON: 'iron',
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
  EMERALD: 'emerald',
  DIAMOND: 'diamond',
  MASTER: 'master',
  GRANDMASTER: 'grandmaster',
  CHALLENGER: 'challenger',
}
const VAL_TIER_UUID = '03621f52-342b-cf4e-4f86-9350a49c6d04'
const VAL_TIER_ID: Record<ValRank, number | null> = {
  UNRANKED: 0,
  IRON: 3,
  BRONZE: 6,
  SILVER: 9,
  GOLD: 12,
  PLATINUM: 15,
  DIAMOND: 18,
  ASCENDANT: 21,
  IMMORTAL: 24,
  RADIANT: 27,
}

export function lolRankIcon(rank?: LolRank): string | null {
  if (!rank) return null
  const key = LOL_ICON_KEY[rank]
  if (!key) return null
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${key}.png`
}

export function valRankIcon(rank?: ValRank): string | null {
  if (!rank) return null
  const id = VAL_TIER_ID[rank]
  if (id === null || id === undefined) return null
  return `https://media.valorant-api.com/competitivetiers/${VAL_TIER_UUID}/${id}/largeicon.png`
}

export function rankIcon(rank: string | undefined, game: 'lol' | 'val'): string | null {
  return game === 'lol' ? lolRankIcon(rank as LolRank) : valRankIcon(rank as ValRank)
}
