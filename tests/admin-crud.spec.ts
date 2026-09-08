import { expect, test } from '@playwright/test'
import { goto, ROSTER, seed, storedPlayers } from './helpers'

test.beforeEach(async ({ page }) => {
  await seed(page, ROSTER)
})

test('the roster lists every seeded player', async ({ page }) => {
  await goto(page, '/admin')
  for (const p of ROSTER) {
    await expect(page.getByText(p.pseudo, { exact: true })).toBeVisible()
  }
  await expect(page.getByText('Joueurs').locator('..').getByText('4')).toBeVisible()
})

test('editing a player persists role, rank and main', async ({ page }) => {
  await goto(page, '/admin')
  const row = page.locator('.hex-frame').filter({ hasText: 'Bob Bravo' })
  await row.getByTitle('Éditer').click()

  await row.getByLabel('Rôle LoL').selectOption('JUNGLE')
  await row.getByLabel('Rang LoL').selectOption('PLATINUM')
  await row.getByLabel('Main LoL').fill('Lee Sin')
  await row.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(page.getByText('Bob Bravo mis à jour.')).toBeVisible()

  const stored = await storedPlayers(page)
  const bob = stored.find((p: { id: number }) => p.id === 2)
  expect(bob.lol).toMatchObject({ role: 'JUNGLE', rank: 'PLATINUM', main: 'Lee Sin' })
})

test('clearing a field removes it instead of storing an empty string', async ({ page }) => {
  // `useRemoteStore` diffs on the serialised fields, so a stray '' would look
  // like a change on every single refresh.
  await goto(page, '/admin')
  const row = page.locator('.hex-frame').filter({ hasText: 'Alice Alpha' })
  await row.getByTitle('Éditer').click()
  await row.getByLabel('Rang LoL').selectOption('—')
  await row.getByRole('button', { name: 'Enregistrer' }).click()

  const stored = await storedPlayers(page)
  const alice = stored.find((p: { id: number }) => p.id === 1)
  expect('rank' in alice.lol).toBe(false)
})

test('marking someone unavailable moves them to the bottom', async ({ page }) => {
  await goto(page, '/admin')
  const names = () => page.locator('.hex-frame .font-display.truncate').allInnerTexts()

  expect((await names())[0]).toBe('Alice Alpha')

  await page.locator('.hex-frame').filter({ hasText: 'Alice Alpha' })
    .getByTitle('Indisponible ce soir').click()

  await expect(page.getByText('Alice Alpha marqué indisponible ce soir.')).toBeVisible()
  const after = await names()
  expect(after[after.length - 1]).toBe('Alice Alpha')

  const stored = await storedPlayers(page)
  expect(stored.find((p: { id: number }) => p.id === 1).shadow).toBe(true)
})

test('leaving both games keeps the player but empties their games', async ({ page }) => {
  await goto(page, '/admin')
  const row = page.locator('.hex-frame').filter({ hasText: 'Dave Delta' })
  await row.getByTitle('Sortir de LoL').click()
  await expect(page.getByText(/Dave Delta (sorti de LoL|retiré)/)).toBeVisible()

  const stored = await storedPlayers(page)
  const dave = stored.find((p: { id: number }) => p.id === 4)
  // No match history, so the player is dropped outright.
  expect(dave).toBeUndefined()
})

test('the Inactifs filter surfaces players signed up to nothing', async ({ page }) => {
  await seed(page, [
    ...ROSTER,
    { id: 9, pseudo: 'Zoe Zulu', factoryUsername: 'zzulu' }, // playing neither
  ])
  await goto(page, '/admin')

  await page.getByRole('button', { name: 'Inactifs' }).click()
  await expect(page.getByText('Zoe Zulu', { exact: true })).toBeVisible()
  await expect(page.getByText('Alice Alpha', { exact: true })).toBeHidden()
})

test('search matches the GitLab username, not just the display name', async ({ page }) => {
  await goto(page, '/admin')
  await page.getByPlaceholder('Chercher un joueur...').fill('ccharlie')
  await expect(page.getByText('Carol Charlie', { exact: true })).toBeVisible()
  await expect(page.getByText('Alice Alpha', { exact: true })).toBeHidden()
})

test('the search clear button empties the field', async ({ page }) => {
  await goto(page, '/admin')
  const search = page.getByPlaceholder('Chercher un joueur...')
  await search.fill('ccharlie')
  await page.getByLabel('Effacer la recherche').click()
  await expect(search).toHaveValue('')
  await expect(page.getByText('Alice Alpha', { exact: true })).toBeVisible()
})
