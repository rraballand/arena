export type GameKey = 'lol' | 'val' | null

export function useCurrentGame() {
  return useState<GameKey>('currentGame', () => null)
}

export const GAME_VIDEO = {
  lol: {
    src: 'https://cmsassets.rgpub.io/sanity/files/dsfx7636/news/bbc27473157462adacf0de441a8796268eb2d0ac.mp4',
    overlay: 'bg-gradient-to-b from-lol-void/40 via-lol-void/15 to-lol-void/80',
  },
  val: {
    src: 'https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/74d9d9fd8664d1c431b4b82d007f968eacb3e8b4.mp4',
    overlay: 'bg-gradient-to-b from-val-dark/40 via-val-dark/15 to-lol-void/80',
  },
} as const
