import { expect, test } from '@playwright/test'
import { goto, seed, storedPlayers } from './helpers'

/**
 * Self-registration is the path everyone but the organiser takes, and it is the
 * only writer of `factoryAvatar` — the field whose stored shape used to break
 * between dev and GitHub Pages.
 */

test('a member can sign themselves up and lands in the roster', async ({ page }) => {
  await seed(page)
  await goto(page, '/register/lol')

  await page.getByPlaceholder('Tape ton nom...').fill('rraballand')
  await page.getByRole('button', { name: /Raballand/i }).first().click()
  await page.getByRole('button', { name: 'Sceller le pacte' }).click()

  await expect(page).toHaveURL(/\/lol\/?$/)

  const stored = await storedPlayers(page)
  expect(stored).toHaveLength(1)
  expect(stored[0]).toMatchObject({
    factoryUsername: 'rraballand',
    lol: { playing: true },
    valorant: { playing: false },
  })
})

test('the stored avatar path stays relative, so both base URLs resolve', async ({ page }) => {
  // Persisting the baseURL-resolved form is what used to 404 on Pages after a
  // local sign-up, and vice versa. The path must carry no leading slash.
  await seed(page)
  await goto(page, '/register/lol')
  await page.getByPlaceholder('Tape ton nom...').fill('rraballand')
  await page.getByRole('button', { name: /Raballand/i }).first().click()
  await page.getByRole('button', { name: 'Sceller le pacte' }).click()
  await expect(page).toHaveURL(/\/lol\/?$/)

  const stored = await storedPlayers(page)
  expect(stored[0].factoryAvatar).toMatch(/^avatars\//)
})

test('signing up asks for the name and nothing else', async ({ page }) => {
  await seed(page)
  await goto(page, '/register/lol')
  await page.getByPlaceholder('Tape ton nom...').fill('rraballand')
  await page.getByRole('button', { name: /Raballand/i }).first().click()

  // Role, rank and main belong to /admin: at the door they only slowed people down.
  await expect(page.getByText('Rang', { exact: true })).toBeHidden()
  await expect(page.getByLabel('Champion main')).toBeHidden()
})

test('someone already signed up is not offered again', async ({ page }) => {
  await seed(page, [
    { id: 1, pseudo: 'Romain Raballand', factoryUsername: 'rraballand', lol: { playing: true } },
  ])
  await goto(page, '/register/lol')
  await page.getByPlaceholder('Tape ton nom...').fill('rraballand')
  await expect(page.getByText('Aucun membre trouvé')).toBeVisible()
})

test('registering for Valorant leaves the LoL roster alone', async ({ page }) => {
  await seed(page)
  await goto(page, '/register/val')
  await page.getByPlaceholder('Tape ton nom...').fill('rraballand')
  await page.getByRole('button', { name: /Raballand/i }).first().click()
  await page.getByRole('button', { name: 'Sceller le pacte' }).click()
  await expect(page).toHaveURL(/\/val\/?$/)

  const stored = await storedPlayers(page)
  expect(stored[0]).toMatchObject({ lol: { playing: false }, valorant: { playing: true } })
})
