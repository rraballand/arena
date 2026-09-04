export type LolRole = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT' | 'FILL'
export type ValRole = 'DUELIST' | 'INITIATOR' | 'CONTROLLER' | 'SENTINEL' | 'FLEX'
export type LolRank =
  | 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'EMERALD'
  | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'CHALLENGER' | 'UNRANKED'
export type ValRank =
  | 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  | 'DIAMOND' | 'ASCENDANT' | 'IMMORTAL' | 'RADIANT' | 'UNRANKED'

export interface PlayerGame {
  playing: boolean
  role?: LolRole | ValRole
  rank?: LolRank | ValRank
  main?: string
}

export interface Player {
  id: number
  pseudo: string
  tagline?: string
  region: 'EUW' | 'EUNE' | 'NA' | 'KR'
  avatarSeed: string
  registeredAt: string
  factoryUsername?: string
  factoryName?: string
  factoryAvatar?: string
  /**
   * Unavailable tonight: keeps their roster slot, history and points, but sits
   * out the draw. Leaving a game for good is `lol.playing` / `valorant.playing`,
   * which already excludes them — no separate "archived" flag needed.
   */
  shadow?: boolean
  lol: PlayerGame & { role?: LolRole; rank?: LolRank }
  valorant: PlayerGame & { role?: ValRole; rank?: ValRank }
}

export const rankColors: Record<string, string> = {
  IRON: '#5A5A5A',
  BRONZE: '#8C523A',
  SILVER: '#B4B4B4',
  GOLD: '#D4AF37',
  PLATINUM: '#4E9A9A',
  EMERALD: '#3FB68B',
  DIAMOND: '#5B9CF0',
  MASTER: '#B565D8',
  GRANDMASTER: '#E84C3D',
  CHALLENGER: '#F4C874',
  ASCENDANT: '#5EE6A8',
  IMMORTAL: '#B23B4E',
  RADIANT: '#FFF6B8',
  UNRANKED: '#5B5A56',
}
