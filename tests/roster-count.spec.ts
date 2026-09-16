import { expect, test } from '@playwright/test'
import type { SeedPlayer } from './helpers'
import { goto, seed } from './helpers'

/**
 * The "Invocateurs" header reads present / signed up. Both halves used to come
 * from the same list, so it always showed N/N even with half the roster absent.
 */
const ROSTER_WITH_SHADOWS: SeedPlayer[] = [
  { id: 1, pseudo: 'Alice Alpha', factoryUsername: 'aalpha', lol: { playing: true, rank: 'GOLD' } },
  { id: 2, pseudo: 'Bob Bravo', factoryUsername: 'bbravo', lol: { playing: true, rank: 'IRON' } },
  { id: 3, pseudo: 'Carol Charlie', factoryUsername: 'ccharlie', lol: { playing: true, rank: 'DIAMOND' }, shadow: true },
  { id: 4, pseudo: 'Dave Delta', factoryUsername: 'ddelta', lol: { playing: true, rank: 'BRONZE' }, shadow: true },
  // Signed up for Valorant only: never counted on the LoL pages.
  { id: 5, pseudo: 'Erin Echo', factoryUsername: 'eecho', valorant: { playing: true, rank: 'SILVER' } },
]

const counter = (page: import('@playwright/test').Page) =>
  page.getByText('Invocateurs', { exact: true }).locator('..').locator('.font-display')

test.beforeEach(async ({ page }) => {
  await seed(page, ROSTER_WITH_SHADOWS)
})

for (const path of ['/lol', '/lol/bracket', '/lol/leaderboard']) {
  test(`${path} counts the absent out of the numerator only`, async ({ page }) => {
    await goto(page, path)
    await expect(counter(page)).toHaveText('2/4')
  })
}

test('an absent player is badged on their card', async ({ page }) => {
  await goto(page, '/lol')
  const card = page.locator('.hex-frame').filter({ hasText: 'Carol Charlie' })
  await expect(card.getByText('Indispo ce soir')).toBeVisible()

  const present = page.locator('.hex-frame').filter({ hasText: 'Alice Alpha' })
  await expect(present.getByText('Indispo ce soir')).toHaveCount(0)
})

test('the other game keeps its own roster', async ({ page }) => {
  await goto(page, '/val')
  await expect(counter(page)).toHaveText('1/1')
})
