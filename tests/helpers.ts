import type { Page } from '@playwright/test'

/**
 * The app has no fixtures of its own: with Airtable unconfigured the stores read
 * localStorage, so seeding that before the first script runs is how a test gets
 * a known roster. `addInitScript` lands before the app boots, which matters —
 * `plugins/stores.client.ts` reads the cache immediately.
 */

export interface SeedPlayer {
  id: number
  pseudo: string
  factoryUsername: string
  lol?: { playing: boolean, role?: string, rank?: string, main?: string }
  valorant?: { playing: boolean, rank?: string, main?: string }
  shadow?: boolean
}

export const PACT_KEY = 'factory-arena:pact-signed'

function fullPlayer(p: SeedPlayer) {
  return {
    avatarSeed: p.factoryUsername,
    registeredAt: '2026-01-01',
    factoryName: p.pseudo,
    factoryAvatar: `avatars/${p.factoryUsername}.svg`,
    lol: { playing: false },
    valorant: { playing: false },
    ...p,
  }
}

/**
 * Third-party assets the layout and cards pull in: Riot's background videos,
 * rank emblems, DiceBear fallbacks, Google Fonts.
 *
 * They are blocked in tests, and not as an optimisation — `page.goto` waits for
 * the `load` event, and a ~50 MB MP4 from a CDN makes that a coin toss. Blocking
 * them is also honest: none of these are the app under test.
 */
const EXTERNAL_ASSETS = [
  '**cmsassets.rgpub.io/**',
  '**api.dicebear.com/**',
  '**raw.communitydragon.org/**',
  '**media.valorant-api.com/**',
  '**fonts.googleapis.com/**',
  '**fonts.gstatic.com/**',
  '**youtube.com/**',
  '**ytimg.com/**',
]

async function blockExternalAssets(page: Page) {
  for (const pattern of EXTERNAL_ASSETS) {
    await page.route(pattern, route => route.abort())
  }
}

/** Sign the pact and preload a roster, before any app code runs. */
export async function seed(page: Page, players: SeedPlayer[] = [], matches: unknown[] = []) {
  await blockExternalAssets(page)
  await page.addInitScript(
    ([pactKey, playersJson, matchesJson]) => {
      localStorage.setItem(pactKey as string, 'true')
      localStorage.setItem('players', playersJson as string)
      localStorage.setItem('matches', matchesJson as string)
    },
    [PACT_KEY, JSON.stringify(players.map(fullPlayer)), JSON.stringify(matches)] as const,
  )
}

/**
 * Navigate and wait until Vue has actually taken over the markup.
 *
 * `page.goto` resolves on the `load` event, which fires before Nuxt hydrates.
 * Typing into a not-yet-hydrated input writes to the DOM without the `v-model`
 * ever seeing it, so the app behaves as if nothing was typed — a race that shows
 * up as a locator timing out on a control that is plainly there.
 */
export async function goto(page: Page, path: string) {
  await page.goto(path)
  await page.waitForFunction(
    () => Boolean((document.getElementById('__nuxt') as unknown as { __vue_app__?: unknown })?.__vue_app__),
  )
  // Hydration starting is not hydration finished, and the stores paint from the
  // cache plus fetch the member directory right after. Typing before that lands
  // in the DOM only, and the next render throws it away — a filled field that
  // reads back empty. Waiting for the network to go quiet covers both.
  await page.waitForLoadState('networkidle')
}

/** What the app persisted, read back from the page. */
export async function storedPlayers(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('players') || '[]'))
}

export async function storedMatches(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('matches') || '[]'))
}

export const ROSTER: SeedPlayer[] = [
  { id: 1, pseudo: 'Alice Alpha', factoryUsername: 'aalpha', lol: { playing: true, rank: 'GOLD' } },
  { id: 2, pseudo: 'Bob Bravo', factoryUsername: 'bbravo', lol: { playing: true, rank: 'IRON' } },
  { id: 3, pseudo: 'Carol Charlie', factoryUsername: 'ccharlie', lol: { playing: true, rank: 'DIAMOND' } },
  { id: 4, pseudo: 'Dave Delta', factoryUsername: 'ddelta', lol: { playing: true, rank: 'BRONZE' } },
]
