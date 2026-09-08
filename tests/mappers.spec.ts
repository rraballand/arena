import { expect, test } from '@playwright/test'
import {
  fieldsToMatch,
  fieldsToPlayer,
  matchToFields,
  playerToFields,
} from '../composables/airtableMappers'

/**
 * Pure round-trip specs — no browser, no network.
 *
 * Stability is the property that matters, not prettiness: `useRemoteStore`
 * decides what to PATCH by comparing `JSON.stringify(toFields(item))` against
 * the last synced snapshot. If a round trip is not a fixed point, every refresh
 * marks every row as changed and the app rewrites the whole base on each load.
 */

const PLAYER = {
  id: 7,
  pseudo: 'Faker',
  avatarSeed: 'faker',
  registeredAt: '2026-09-03',
  factoryUsername: 'faker',
  factoryName: 'Lee Sang-hyeok',
  factoryAvatar: 'avatars/faker.jpg',
  lol: { playing: true, role: 'MID' as const, rank: 'CHALLENGER' as const, main: 'Azir' },
  valorant: { playing: false },
}

const MATCH = {
  id: 3,
  game: 'lol' as const,
  createdAt: '2026-09-03T10:00:00.000Z',
  batchId: 'lol-3',
  benched: [4, 9],
  teamA: { name: 'Ordre', playerIds: [1, 2, 3], slots: 5 },
  teamB: { name: 'Chaos', playerIds: [4, 5], slots: 5 },
  outcome: 'A' as const,
  powerA: 120,
  powerB: 98,
}

test('a player survives a round trip unchanged', () => {
  const once = playerToFields(PLAYER)
  const twice = playerToFields(fieldsToPlayer(once)!)
  expect(twice).toEqual(once)
})

test('a match survives a round trip unchanged', () => {
  const once = matchToFields(MATCH)
  const twice = matchToFields(fieldsToMatch(once)!)
  expect(twice).toEqual(once)
})

test('a player with no optionals is still a fixed point', () => {
  const bare = { ...PLAYER, factoryName: undefined, factoryAvatar: undefined, lol: { playing: false } }
  const once = playerToFields(bare)
  const twice = playerToFields(fieldsToPlayer(once)!)
  expect(twice).toEqual(once)
})

test('rows without appId are rejected rather than half-read', () => {
  expect(fieldsToPlayer({})).toBeNull()
  expect(fieldsToMatch({})).toBeNull()
})

test('player id lists stay human-readable in the grid', () => {
  // The whole point of Airtable here is hand-editing, so ids are "3,8,2" and
  // not a JSON blob. Losing that silently would make the base unusable by hand.
  const f = matchToFields(MATCH)
  expect(f.teamAPlayerIds).toBe('1,2,3')
  expect(f.benched).toBe('4,9')
})

test('an empty id list round-trips to an empty array, not [NaN]', () => {
  const f = matchToFields({ ...MATCH, benched: [], teamB: { name: 'Chaos', playerIds: [] } })
  const back = fieldsToMatch(f)!
  expect(back.benched).toEqual([])
  expect(back.teamB.playerIds).toEqual([])
})

test('a decided outcome survives, an unknown one becomes null', () => {
  expect(fieldsToMatch(matchToFields(MATCH))!.outcome).toBe('A')
  expect(fieldsToMatch({ ...matchToFields(MATCH), outcome: 'garbage' })!.outcome).toBeNull()
})
