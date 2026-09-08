import type { Player } from '~/data/players'
import { fieldsToMatch, fieldsToPlayer, matchToFields, playerToFields } from './airtableMappers'
import { useAirtableConfig } from './useAirtable'
import { useRemoteStore } from './useRemoteStore'
import { rankSeed } from './useRanks'

export type Outcome = 'A' | 'B' | 'D'

export interface MatchTeam {
  name: string
  playerIds: number[]
  slots?: number
}
export interface Match {
  id: number
  game: 'lol' | 'val'
  createdAt: string
  batchId: string
  benched: number[]
  teamA: MatchTeam
  teamB: MatchTeam
  outcome: Outcome | null
  /** Cumulative points of teamA players snapshotted at match creation. */
  powerA?: number
  /** Cumulative points of teamB players snapshotted at match creation. */
  powerB?: number
}

export interface FactoryMember {
  id: number
  username: string
  name: string
  /** Repo-relative path under public/ (e.g. `avatars/jdoe.png`), never a full URL. */
  avatar_url: string | null
}

// ---------------- Stores ----------------

/** Airtable-backed, localStorage-cached. Returns the raw ref so every mutation below is unchanged. */
export function usePlayersRemote() {
  return useRemoteStore<Player>({
    key: 'players',
    table: useAirtableConfig().playersTable,
    toFields: playerToFields,
    fromFields: fieldsToPlayer,
    idOf: p => p.id,
  })
}

export function useMatchesRemote() {
  return useRemoteStore<Match>({
    key: 'matches',
    table: useAirtableConfig().matchesTable,
    toFields: matchToFields,
    fromFields: fieldsToMatch,
    idOf: m => m.id,
  })
}

export function usePlayersStore() {
  return usePlayersRemote().state
}
export function useMatchesStore() {
  return useMatchesRemote().state
}


export function useMembersStore() {
  return useState<FactoryMember[]>('factory-members', () => [])
}

/** Prefix a public/ asset path with the app baseURL (GitHub Pages ships under a subpath). */
export function publicAsset(path: string) {
  const base = useRuntimeConfig().app.baseURL.replace(/\/+$/, '')
  return `${base}/${path.replace(/^\/+/, '')}`
}

/**
 * Resolve a stored avatar path for an `<img src>`.
 *
 * Avatar paths are *persisted* repo-relative (`avatars/x.svg`) and resolved only
 * here, at render time. Persisting the resolved form would bake in the current
 * `baseURL` — `/` in dev, `/arena/` on GitHub Pages — so a row written by one
 * environment would 404 in the other. Both now share one Airtable base, which
 * makes that a real breakage rather than a theoretical one.
 *
 * Legacy absolute URLs (GitLab, Gravatar) pass through untouched; a legacy
 * leading slash is absorbed by `publicAsset`, so old rows self-heal.
 */
export function avatarSrc(path?: string | null): string | undefined {
  if (!path) return undefined
  if (/^https?:\/\//i.test(path)) return path
  return publicAsset(path)
}

export async function fetchMembers() {
  const state = useMembersStore()
  if (state.value.length) return state.value
  // Kept verbatim — `avatar_url` stays repo-relative, see `avatarSrc`.
  state.value = await $fetch<FactoryMember[]>(publicAsset('factory-members.json'))
  return state.value
}

// ---------------- Player ops ----------------

export function nextPlayerId() {
  const list = usePlayersStore().value
  return list.length ? Math.max(...list.map(p => p.id)) + 1 : 1
}

/**
 * Sign-up captures identity only. Role, rank and main are filled in later from
 * /admin — asking for them at the door slowed everyone down for nothing.
 */
export interface RegisterInput {
  factoryUsername: string
  pseudo: string
  factoryName?: string
  factoryAvatar?: string
  game: 'lol' | 'val'
}

export function registerPlayer(input: RegisterInput): Player {
  const store = usePlayersStore()
  const existing = store.value.find(p => p.factoryUsername === input.factoryUsername)
  const now = new Date().toISOString().slice(0, 10)

  if (existing) {
    if (input.game === 'lol') {
      if (existing.lol.playing) throw new Error('Déjà inscrit à LoL')
      existing.lol = { playing: true }
    } else {
      if (existing.valorant.playing) throw new Error('Déjà inscrit à Valorant')
      existing.valorant = { playing: true }
    }
    // Signing up again means they are here and available.
    delete existing.shadow
    store.value = [...store.value]
    return existing
  }

  const player: Player = {
    id: nextPlayerId(),
    pseudo: input.pseudo,
    avatarSeed: input.factoryUsername,
    factoryUsername: input.factoryUsername,
    factoryName: input.factoryName,
    factoryAvatar: input.factoryAvatar,
    registeredAt: now,
    lol: { playing: input.game === 'lol' },
    valorant: { playing: input.game === 'val' },
  }
  store.value = [...store.value, player]
  return player
}

export function leavePlayerGame(id: number, game: 'lol' | 'val') {
  const store = usePlayersStore()
  const matches = useMatchesStore().value
  const p = store.value.find(pl => pl.id === id)
  if (!p) return { deleted: false }
  if (game === 'lol') p.lol = { playing: false }
  else p.valorant = { playing: false }

  const stillActive = p.lol.playing || p.valorant.playing
  if (stillActive) {
    store.value = [...store.value]
    return { player: p, deleted: false }
  }

  // Kept, not deleted: matches reference them, and `playing: false` already
  // keeps them out of every draw.
  const hasHistory = matches.some(
    m => m.teamA.playerIds.includes(id) || m.teamB.playerIds.includes(id),
  )
  if (hasHistory) {
    store.value = [...store.value]
    return { player: p, deleted: false, kept: true }
  }

  store.value = store.value.filter(pl => pl.id !== id)
  return { deleted: true }
}

/**
 * Unavailable tonight. Temporary and reversible: the player keeps their roster
 * slot, their history and their points, but is skipped by the draw.
 */
export function toggleShadowPlayer(id: number, shadow: boolean) {
  const store = usePlayersStore()
  const p = store.value.find(pl => pl.id === id)
  if (!p) return null
  if (shadow) p.shadow = true
  else delete p.shadow
  store.value = [...store.value]
  return p
}

export interface PlayerPatch {
  pseudo?: string
  shadow?: boolean
  lol?: Partial<Player['lol']>
  valorant?: Partial<Player['valorant']>
}

/**
 * Admin edit. Merges the patch field by field so a form can send only what it
 * touched; an empty string clears an optional field rather than storing `''`,
 * which keeps the Airtable round-trip stable (see `airtableMappers`).
 */
export function updatePlayer(id: number, patch: PlayerPatch): Player | null {
  const store = usePlayersStore()
  const p = store.value.find(pl => pl.id === id)
  if (!p) return null

  if (patch.pseudo !== undefined) p.pseudo = patch.pseudo.trim() || p.pseudo
  if (patch.shadow !== undefined) {
    if (patch.shadow) p.shadow = true
    else delete p.shadow
  }

  // Handled one game at a time on purpose: `lol` and `valorant` have different
  // role/rank unions, so a shared loop would only typecheck behind a cast.
  if (patch.lol) p.lol = pruned({ ...p.lol, ...patch.lol })
  if (patch.valorant) p.valorant = pruned({ ...p.valorant, ...patch.valorant })

  store.value = [...store.value]
  return p
}

/** Drop blank optionals rather than persisting `''`, which would churn the Airtable diff. */
function pruned<T extends { role?: unknown; rank?: unknown; main?: string }>(profile: T): T {
  const next = { ...profile }
  if (!next.role) delete next.role
  if (!next.rank) delete next.rank
  if (!next.main?.trim()) delete next.main
  else next.main = next.main.trim()
  return next
}

/**
 * Hard delete. Refuses when the player appears in a match: removing them would
 * leave dangling ids in team rosters and falsify past results. Take them out of
 * both games instead — `leavePlayerGame` keeps the record and stops the draw
 * from picking them.
 */
export function deletePlayer(id: number): { deleted: boolean; reason?: 'history' | 'unknown' } {
  const store = usePlayersStore()
  if (!store.value.some(p => p.id === id)) return { deleted: false, reason: 'unknown' }

  const hasHistory = useMatchesStore().value.some(
    m => m.teamA.playerIds.includes(id) || m.teamB.playerIds.includes(id) || (m.benched ?? []).includes(id),
  )
  if (hasHistory) return { deleted: false, reason: 'history' }

  store.value = store.value.filter(p => p.id !== id)
  return { deleted: true }
}

export function crossRegisterPlayer(id: number, game: 'lol' | 'val') {
  const store = usePlayersStore()
  const p = store.value.find(pl => pl.id === id)
  if (!p) return null
  if (game === 'lol') p.lol = { playing: true }
  else p.valorant = { playing: true }
  store.value = [...store.value]
  return p
}

// ---------------- Match ops ----------------

const POINTS = { WIN: 3, DRAW: 1, LOSS: 0 }
export const SCORING = POINTS

export interface ScoreCard {
  points: number
  wins: number
  draws: number
  losses: number
  matches: number
}

/**
 * The weight teams are balanced on.
 *
 * Normally the points earned in matches. But on the very first draw of a
 * tournament everybody sits at zero, so "balanced" was a coin toss — while the
 * declared ranks were right there, collected from /admin and used by nothing.
 *
 * The seed applies only while *no one* in the pool has played. Blending the two
 * scales would be worse than random: points move by 3 per win, rank seeds run
 * from 10 to 150, so a never-played CHALLENGER would outweigh someone with three
 * wins by a factor of sixteen. Either everyone is seeded, or nobody is.
 */
export function teamWeigher(
  ids: number[],
  scores: Map<number, ScoreCard>,
  game: 'lol' | 'val',
): (id: number) => number {
  const played = ids.some(id => (scores.get(id)?.matches ?? 0) > 0)
  if (played) return id => scores.get(id)?.points ?? 0

  const byId = new Map(usePlayersStore().value.map(p => [p.id, p]))
  return (id) => {
    const p = byId.get(id)
    return rankSeed(game === 'lol' ? p?.lol.rank : p?.valorant.rank, game)
  }
}

export function computeScores(matches: Match[], game: 'lol' | 'val') {
  const table = new Map<number, ScoreCard>()
  function ensure(pid: number) {
    let c = table.get(pid)
    if (!c) {
      c = { points: 0, wins: 0, draws: 0, losses: 0, matches: 0 }
      table.set(pid, c)
    }
    return c
  }
  for (const m of matches) {
    if (m.game !== game) continue
    for (const pid of [...m.teamA.playerIds, ...m.teamB.playerIds]) ensure(pid).matches++
    if (!m.outcome) continue
    if (m.outcome === 'A') {
      for (const pid of m.teamA.playerIds) { const c = ensure(pid); c.wins++; c.points += POINTS.WIN }
      for (const pid of m.teamB.playerIds) { const c = ensure(pid); c.losses++ }
    } else if (m.outcome === 'B') {
      for (const pid of m.teamB.playerIds) { const c = ensure(pid); c.wins++; c.points += POINTS.WIN }
      for (const pid of m.teamA.playerIds) { const c = ensure(pid); c.losses++ }
    } else {
      for (const pid of [...m.teamA.playerIds, ...m.teamB.playerIds]) {
        const c = ensure(pid); c.draws++; c.points += POINTS.DRAW
      }
    }
  }
  return table
}

function pairKey(a: number[], b: number[]) {
  const sa = [...a].sort((x, y) => x - y).join(',')
  const sb = [...b].sort((x, y) => x - y).join(',')
  return [sa, sb].sort().join('|')
}

const LOL_ADJECTIVES = [
  'Écarlates', 'Célestes', 'Radieux', 'Fantomatiques', 'Obsidiens', 'Dorés', 'Voraces',
  'Sanguinaires', 'Furtifs', 'Sauvages', 'Impériaux', 'Runiques', 'Astraux', 'Immortels',
  'Fulgurants', 'Éternels',
]
const LOL_NOUNS = [
  'Griffons', 'Faucheurs', 'Sentinelles', 'Lions', 'Corbeaux', 'Loups', 'Dragons',
  'Serpents', 'Chevaliers', 'Vagabonds', 'Sorciers', 'Chasseurs', 'Ombres', 'Anciens',
  'Titans', 'Rôdeurs',
]
const VAL_ADJECTIVES = [
  'Écarlates', 'Fantômes', 'Obscurs', 'Silencieux', 'Radiants', 'Furieux',
  'Foudroyants', 'Cinglants', 'Impitoyables', 'Rebelles', 'Traqueurs', 'Nocturnes',
  'Sanguinaires', 'Voraces', 'Furtifs', 'Éclatants',
]
const VAL_NOUNS = [
  'Loups', 'Vipères', 'Corbeaux', 'Chasseurs', 'Éclaireurs', 'Faucons',
  'Rois', 'Rebelles', 'Assassins', 'Vengeurs', 'Chacals', 'Rôdeurs',
  'Prédateurs', 'Snipers', 'Gardiens', 'Sabres',
]

function randomTeamName(
  game: 'lol' | 'val',
  exclude: Set<string>,
  excludeAdjs: Set<string> = new Set(),
  excludeNouns: Set<string> = new Set(),
): { name: string; noun: string; adj: string } {
  const adjs = (game === 'lol' ? LOL_ADJECTIVES : VAL_ADJECTIVES)
    .filter(a => !excludeAdjs.has(a))
  const nouns = (game === 'lol' ? LOL_NOUNS : VAL_NOUNS)
    .filter(n => !excludeNouns.has(n))
  const adjPool = adjs.length ? adjs : (game === 'lol' ? LOL_ADJECTIVES : VAL_ADJECTIVES)
  const nounPool = nouns.length ? nouns : (game === 'lol' ? LOL_NOUNS : VAL_NOUNS)

  for (let i = 0; i < 30; i++) {
    const noun = nounPool[Math.floor(Math.random() * nounPool.length)]
    const adj = adjPool[Math.floor(Math.random() * adjPool.length)]
    const name = `Les ${noun} ${adj}`
    if (!exclude.has(name)) return { name, noun, adj }
  }
  const fallback = `Équipe ${Math.floor(Math.random() * 9999)}`
  return { name: fallback, noun: fallback, adj: fallback }
}

/**
 * Split a pool of player IDs into two teams balanced by cumulative points.
 * Uses a greedy fill: iterate players sorted by score desc, drop each into the
 * currently weakest team (respecting `sizeA`/`sizeB` caps).
 */
function balancedSplit(
  ids: number[],
  scoreOf: (id: number) => number,
  sizeA: number,
  sizeB: number,
): { teamA: number[]; teamB: number[] } {
  const sorted = [...ids].sort((a, b) => scoreOf(b) - scoreOf(a))
  const teamA: number[] = []
  const teamB: number[] = []
  let sumA = 0
  let sumB = 0
  for (const id of sorted) {
    const canA = teamA.length < sizeA
    const canB = teamB.length < sizeB
    if (canA && (!canB || sumA <= sumB)) {
      teamA.push(id); sumA += scoreOf(id)
    } else if (canB) {
      teamB.push(id); sumB += scoreOf(id)
    }
  }
  return { teamA, teamB }
}

function makeParallelMatches(
  pool: Player[],
  /** Built by the caller, which knows the game — see `teamWeigher`. */
  scoreOf: (id: number) => number,
  teamSize: number,
  existingKeys: Set<string>,
) {
  // `pool` is already filtered by the only caller (`createBatch`).
  const active = pool.map(p => p.id)
  const perMatch = teamSize * 2
  const matchCount = Math.floor(active.length / perMatch)
  if (matchCount === 0) {
    // Not enough for a full match. Create one partial match if we have >= 2 players.
    if (active.length < 2) return { matches: [] as Array<{ teamA: number[]; teamB: number[] }>, benched: active }
    const half = Math.floor(active.length / 2)
    const { teamA, teamB } = balancedSplit(active.slice(0, half * 2), scoreOf, half, half)
    return {
      matches: [{ teamA, teamB }],
      benched: active.slice(half * 2),
    }
  }

  let bestPlan: {
    matches: Array<{ teamA: number[]; teamB: number[] }>
    benched: number[]
    totalDiff: number
  } | null = null

  for (let attempt = 0; attempt < 80; attempt++) {
    const shuffled = [...active].sort(() => Math.random() - 0.5)
    const usedKeys = new Set(existingKeys)
    const matches: Array<{ teamA: number[]; teamB: number[] }> = []
    let cursor = 0
    let totalDiff = 0
    let failed = false

    for (let i = 0; i < matchCount; i++) {
      const chunk = shuffled.slice(cursor, cursor + perMatch)
      cursor += perMatch
      const sorted = [...chunk].sort((a, b) => scoreOf(b) - scoreOf(a))
      let chosen: { teamA: number[]; teamB: number[]; diff: number } | null = null
      for (let local = 0; local < 20; local++) {
        const list = local === 0 ? sorted : [...chunk].sort(() => Math.random() - 0.5)
        const a: number[] = []
        const b: number[] = []
        let sumA = 0
        let sumB = 0
        for (const id of list) {
          if (a.length < teamSize && (sumA <= sumB || b.length >= teamSize)) {
            a.push(id); sumA += scoreOf(id)
          } else {
            b.push(id); sumB += scoreOf(id)
          }
        }
        if (a.length !== teamSize || b.length !== teamSize) continue
        const key = pairKey(a, b)
        if (usedKeys.has(key)) continue
        const diff = Math.abs(sumA - sumB)
        if (!chosen || diff < chosen.diff) chosen = { teamA: a, teamB: b, diff }
        if (diff === 0) break
      }
      if (!chosen) { failed = true; break }
      usedKeys.add(pairKey(chosen.teamA, chosen.teamB))
      matches.push({ teamA: chosen.teamA, teamB: chosen.teamB })
      totalDiff += chosen.diff
    }
    if (failed) continue
    const benched = shuffled.slice(cursor)
    if (!bestPlan || totalDiff < bestPlan.totalDiff) {
      bestPlan = { matches, benched, totalDiff }
    }
    if (totalDiff === 0) break
  }
  const finalPlan = bestPlan ?? { matches: [], benched: active }
  // Fill an extra match with the remaining bench, balanced by power.
  // teamA gets up to `teamSize` players; the remaining bench spills into teamB before anyone sits out.
  if (finalPlan.benched.length >= 1) {
    const benchCount = Math.min(finalPlan.benched.length, teamSize * 2)
    const sizeA = Math.min(teamSize, Math.ceil(benchCount / 2))
    const sizeB = benchCount - sizeA
    const { teamA, teamB } = balancedSplit(finalPlan.benched.slice(0, benchCount), scoreOf, sizeA, sizeB)
    finalPlan.matches = [...finalPlan.matches, { teamA, teamB }]
    finalPlan.benched = finalPlan.benched.slice(benchCount)
  }
  return finalPlan
}

export function createBatch(game: 'lol' | 'val', teamSize: number) {
  const players = usePlayersStore().value
  const matchesStore = useMatchesStore()
  const matches = matchesStore.value

  // `playing` covers who is in the tournament, `shadow` who showed up tonight.
  const pool = players.filter(p =>
    !p.shadow && (game === 'lol' ? p.lol.playing : p.valorant.playing),
  )
  if (pool.length < 2) {
    throw new Error(`Roster insuffisant (${pool.length}/2)`)
  }
  const scores = computeScores(matches, game)
  const scoreOf = teamWeigher(pool.map(p => p.id), scores, game)
  const existing = new Set(matches.filter(m => m.game === game).map(m => pairKey(m.teamA.playerIds, m.teamB.playerIds)))
  const plan = makeParallelMatches(pool, scoreOf, teamSize, existing)
  if (!plan.matches.length) throw new Error('Aucune combinaison inédite trouvée')

  const usedNames = new Set(matches.filter(m => m.game === game).flatMap(m => [m.teamA.name, m.teamB.name]))
  const now = new Date().toISOString()
  const batchId = `${game}-${Date.now()}`
  let nextId = matches.length ? Math.max(...matches.map(m => m.id)) + 1 : 1
  const sumPower = (ids: number[]) => ids.reduce((s, id) => s + scoreOf(id), 0)
  const created: Match[] = plan.matches.map(({ teamA, teamB }) => {
    const a = randomTeamName(game, usedNames); usedNames.add(a.name)
    const b = randomTeamName(game, usedNames, new Set([a.adj]), new Set([a.noun]))
    usedNames.add(b.name)
    const nameA = teamA.length === 0 ? 'Extérieur' : a.name
    const nameB = teamB.length === 0 ? 'Extérieur' : b.name
    return {
      id: nextId++,
      game,
      createdAt: now,
      batchId,
      benched: plan.benched,
      teamA: { name: nameA, playerIds: teamA, slots: teamSize },
      teamB: { name: nameB, playerIds: teamB, slots: teamSize },
      outcome: null,
      powerA: sumPower(teamA),
      powerB: sumPower(teamB),
    }
  })
  matchesStore.value = [...matches, ...created]
  return created
}

/**
 * Reshuffle the players of a single match into two freshly balanced teams.
 * Only allowed while the match has no outcome. Generates new team names,
 * refreshes power snapshots from scores excluding this match.
 */
export function reshuffleMatch(id: number) {
  const store = useMatchesStore()
  const m = store.value.find(x => x.id === id)
  if (!m) throw new Error('Match introuvable')
  if (m.outcome) throw new Error('Match déjà joué')

  const pool = [...m.teamA.playerIds, ...m.teamB.playerIds]
  if (pool.length < 2) throw new Error('Pas assez de joueurs')

  const otherMatches = store.value.filter(x => x.game === m.game && x.id !== id)
  const scores = computeScores(otherMatches, m.game)
  const scoreOf = teamWeigher(pool, scores, m.game)
  const sumPower = (ids: number[]) => ids.reduce((s, pid) => s + scoreOf(pid), 0)

  const sizeA = m.teamA.slots ?? Math.ceil(pool.length / 2)
  const sizeB = m.teamB.slots ?? (pool.length - sizeA)
  const { teamA, teamB } = balancedSplit(pool, scoreOf, sizeA, sizeB)

  const usedNames = new Set(
    store.value
      .filter(x => x.game === m.game && x.id !== id)
      .flatMap(x => [x.teamA.name, x.teamB.name]),
  )
  const a = randomTeamName(m.game, usedNames); usedNames.add(a.name)
  const b = randomTeamName(m.game, usedNames, new Set([a.adj]), new Set([a.noun]))

  store.value = store.value.map(x =>
    x.id === id
      ? {
          ...x,
          teamA: { ...x.teamA, name: a.name, playerIds: teamA },
          teamB: { ...x.teamB, name: b.name, playerIds: teamB },
          powerA: sumPower(teamA),
          powerB: sumPower(teamB),
        }
      : x,
  )
}

export function setMatchOutcome(id: number, outcome: Outcome) {
  const store = useMatchesStore()
  const m = store.value.find(x => x.id === id)
  if (!m) return
  m.outcome = outcome
  store.value = [...store.value]
}

export function deleteBatch(batchId: string) {
  const store = useMatchesStore()
  store.value = store.value.filter(m => m.batchId !== batchId)
}

/**
 * Randomize an opponent from the roster (excluding bench) and create a match against the bench.
 * If the bench has fewer players than the default team size, both teams shrink accordingly
 * (or use `size` to force a specific N vs N).
 */
export function challengeBenchWithRandom(batchId: string, size?: number) {
  const store = useMatchesStore()
  const batchMatches = store.value.filter(m => m.batchId === batchId)
  if (!batchMatches.length) throw new Error('Session introuvable')

  const bench = batchMatches[0].benched ?? []
  const game = batchMatches[0].game
  const defaultSize = batchMatches[0].teamA.slots ?? batchMatches[0].teamA.playerIds.length
  if (bench.length < 2) throw new Error(`Banc trop petit pour un match (${bench.length}/2)`)

  const half = Math.floor(bench.length / 2)
  const benchTeamCount = Math.min(half, defaultSize)
  const teamSize = size ?? defaultSize

  const preScores = computeScores(store.value, game)
  const scoreOf = teamWeigher(bench, preScores, game)
  const { teamA: benchTeam, teamB: opponentTeam } = balancedSplit(
    bench.slice(0, benchTeamCount * 2),
    scoreOf,
    benchTeamCount,
    benchTeamCount,
  )
  const usedIds = new Set([...benchTeam, ...opponentTeam])
  const remainingBench = bench.filter(id => !usedIds.has(id))
  const sumPower = (ids: number[]) => ids.reduce((s, id) => s + scoreOf(id), 0)

  const usedNames = new Set(store.value.filter(m => m.game === game).flatMap(m => [m.teamA.name, m.teamB.name]))
  const a = randomTeamName(game, usedNames)
  usedNames.add(a.name)
  const b = randomTeamName(game, usedNames, new Set([a.adj]), new Set([a.noun]))

  const nextId = store.value.length ? Math.max(...store.value.map(m => m.id)) + 1 : 1
  const newMatch: Match = {
    id: nextId,
    game,
    createdAt: new Date().toISOString(),
    batchId,
    benched: remainingBench,
    teamA: { name: a.name, playerIds: benchTeam, slots: teamSize },
    teamB: { name: b.name, playerIds: opponentTeam, slots: teamSize },
    outcome: null,
    powerA: sumPower(benchTeam),
    powerB: sumPower(opponentTeam),
  }

  store.value = store.value.map(m =>
    m.batchId === batchId ? { ...m, benched: remainingBench } : m,
  ).concat(newMatch)
}

/**
 * Create an additional match inside an existing batch, pitting the bench against an
 * existing team of that batch. Removes the used bench players from all matches of the batch.
 */
export function purgeMatches(game?: 'lol' | 'val') {
  const store = useMatchesStore()
  store.value = game ? store.value.filter(m => m.game !== game) : []
}
