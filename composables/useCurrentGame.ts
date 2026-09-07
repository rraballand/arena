export type GameKey = 'lol' | 'val' | null

const GAMES = new Set(['lol', 'val'])

/**
 * Which game's chrome the current route wears, for the layout background.
 *
 * Derived from the path on purpose. This used to be a `useState` that every page
 * wrote in its own setup while the layout read it — and the layout renders
 * *before* the page on the server, so SSR picked the background with the value
 * still `null` while the client restored the final value from the payload. The
 * two renders then disagreed on which component to mount, and hydration failed.
 * A pure function of the route cannot drift.
 */
export function useCurrentGame() {
  const route = useRoute()
  return computed<GameKey>(() => {
    const [first, second] = route.path.split('/').filter(Boolean)
    if (GAMES.has(first)) return first as GameKey
    if (first === 'register' && GAMES.has(second)) return second as GameKey
    // Admin belongs to no game; keep the LoL chrome it has always shipped with.
    if (first === 'admin') return 'lol'
    return null
  })
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
