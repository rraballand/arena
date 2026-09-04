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
