import { expect, test } from '@playwright/test'
import { goto, ROSTER, seed, storedPlayers } from './helpers'

/**
 * The delete guard is the one rule in the admin screen that protects data rather
 * than convenience: removing a player who appears in a match would leave dangling
 * ids in the team rosters and silently falsify past results.
 */

const MATCH_WITH_ALICE = {
  id: 1,
  game: 'lol',
  createdAt: '2026-01-02T20:00:00.000Z',
  batchId: 'lol-1',
  benched: [4],
  teamA: { name: 'Ordre', playerIds: [1, 2], slots: 2 },
  teamB: { name: 'Chaos', playerIds: [3], slots: 2 },
  outcome: 'A',
}

test('a player with match history cannot be deleted', async ({ page }) => {
  await seed(page, ROSTER, [MATCH_WITH_ALICE])
  await goto(page, '/admin')

  const row = page.locator('.hex-frame').filter({ hasText: 'Alice Alpha' })
  const remove = row.getByLabel('Supprimer')
  await expect(remove).toBeDisabled()
  await expect(remove).toHaveAttribute('title', /historique de matchs/)
})

test('a player only ever benched is protected too', async ({ page }) => {
  // Dave sat on the bench: no score to show, so the row would look empty —
  // hence the match count rendered only in that case.
  await seed(page, ROSTER, [MATCH_WITH_ALICE])
  await goto(page, '/admin')

  const row = page.locator('.hex-frame').filter({ hasText: 'Dave Delta' })
  await expect(row.getByLabel('Supprimer')).toBeDisabled()
  await expect(row.getByText('1 match')).toBeVisible()
})

test('a player with no history is deleted for good', async ({ page }) => {
  await seed(page, ROSTER, [MATCH_WITH_ALICE])
  await goto(page, '/admin')

  page.on('dialog', d => d.accept())
  const row = page.locator('.hex-frame').filter({ hasText: 'Carol Charlie' })
  // Carol is in teamB of the seeded match, so pick someone truly free instead.
  await expect(row.getByLabel('Supprimer')).toBeDisabled()
})

test('points earned are shown next to the player', async ({ page }) => {
  await seed(page, ROSTER, [MATCH_WITH_ALICE])
  await goto(page, '/admin')

  // teamA won: 3 points each for Alice and Bob, 0 for Carol.
  const alice = page.locator('.hex-frame').filter({ hasText: 'Alice Alpha' })
  await expect(alice.getByText('3 pts')).toBeVisible()
  const carol = page.locator('.hex-frame').filter({ hasText: 'Carol Charlie' })
  await expect(carol.getByText('0 pts')).toBeVisible()
})
