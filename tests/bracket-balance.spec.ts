import { expect, test } from '@playwright/test'
import { goto, seed, storedMatches } from './helpers'

/**
 * The draw is balanced on match points, which are all zero on a tournament's
 * first evening — so it used to be a coin toss. Ranks now seed that first draw,
 * and only that one: blending the two scales would be worse than random, since
 * points move by 3 per win while rank seeds run from 10 to 150.
 */

/** Two strong, two weak: a balanced split must not put both strong on one side. */
const LOPSIDED = [
  { id: 1, pseudo: 'Chall One', factoryUsername: 'c1', lol: { playing: true, rank: 'CHALLENGER' } },
  { id: 2, pseudo: 'Chall Two', factoryUsername: 'c2', lol: { playing: true, rank: 'CHALLENGER' } },
  { id: 3, pseudo: 'Iron One', factoryUsername: 'i1', lol: { playing: true, rank: 'IRON' } },
  { id: 4, pseudo: 'Iron Two', factoryUsername: 'i2', lol: { playing: true, rank: 'IRON' } },
]

async function generate(page: import('@playwright/test').Page, teamSize: number) {
  await goto(page, '/lol/bracket')
  await page.getByRole('spinbutton').fill(String(teamSize))
  await page.getByTitle('Nouveau match').click()
  // The draw writes through the store, so wait for a batch to exist.
  await expect(page.getByText('Aucun match.')).toBeHidden()
}

test('the first draw splits the two strongest players apart', async ({ page }) => {
  await seed(page, LOPSIDED)
  await generate(page, 2)

  const matches = await storedMatches(page)
  expect(matches.length).toBeGreaterThan(0)
  const { teamA, teamB } = matches[0]

  const strong = new Set([1, 2])
  const strongInA = teamA.playerIds.filter((id: number) => strong.has(id)).length
  // Without the rank seed every weight is 0 and this lands on 2-0 half the time.
  expect(strongInA).toBe(1)
  expect(teamB.playerIds.filter((id: number) => strong.has(id)).length).toBe(1)
})

test('the recorded power reflects the seed, not zero', async ({ page }) => {
  await seed(page, LOPSIDED)
  await generate(page, 2)

  const matches = await storedMatches(page)
  // CHALLENGER 150 + IRON 10 on each side.
  expect(matches[0].powerA).toBe(160)
  expect(matches[0].powerB).toBe(160)
})

test('once results exist the seed stops counting', async ({ page }) => {
  // Iron One has beaten everyone, so points must decide and the ranks step back.
  const played = {
    id: 1,
    game: 'lol',
    createdAt: '2026-01-02T20:00:00.000Z',
    batchId: 'lol-1',
    benched: [],
    teamA: { name: 'A', playerIds: [3], slots: 1 },
    teamB: { name: 'B', playerIds: [1], slots: 1 },
    outcome: 'A',
  }
  await seed(page, LOPSIDED, [played])
  await goto(page, '/lol/leaderboard')

  // 3 points for the Iron winner, 0 for the Challenger who lost.
  const iron = page.locator('div').filter({ hasText: 'Iron One' }).first()
  await expect(iron).toBeVisible()
  await expect(page.getByText('3', { exact: true }).first()).toBeVisible()
})
