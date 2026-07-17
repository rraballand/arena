import type { Player } from '~/data/players'
import { useLocalStore } from './useLocalStore'

export type Outcome = 'A' | 'B' | 'D'

export interface MatchTeam {
  name: string
  playerIds: number[]
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
}

export interface FactoryMember {
  id: number
  username: string
  name: string
  avatar_url: string | null
  web_url: string | null
}

// ---------------- Stores ----------------

export function usePlayersStore() {
  return useLocalStore<Player[]>('players', [])
}
export function useMatchesStore() {
  return useLocalStore<Match[]>('matches', [])
}
export function useMembersStore() {
  return useState<FactoryMember[]>('factory-members', () => [])
}

export async function fetchMembers() {
  const state = useMembersStore()
  if (state.value.length) return state.value
  const url = `${useRuntimeConfig().app.baseURL}factory-members.json`.replace(/\/{2,}/g, '/')
  const members = await $fetch<FactoryMember[]>(url)
  state.value = members
  return members
}

// ---------------- Player ops ----------------

export function findPlayer(pid: number) {
  return usePlayersStore().value.find(p => p.id === pid)
}

export function nextPlayerId() {
  const list = usePlayersStore().value
  return list.length ? Math.max(...list.map(p => p.id)) + 1 : 1
}

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
    store.value = [...store.value]
    return existing
  }

  const player: Player = {
    id: nextPlayerId(),
    pseudo: input.pseudo,
    tagline: 'EUW',
    region: 'EUW',
    avatarSeed: input.factoryUsername,
    factoryUsername: input.factoryUsername,
    factoryName: input.factoryName,
    factoryAvatar: input.factoryAvatar,
    registeredAt: now,
    lol: input.game === 'lol' ? { playing: true } : { playing: false },
    valorant: input.game === 'val' ? { playing: true } : { playing: false },
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

  const hasHistory = matches.some(
    m => m.teamA.playerIds.includes(id) || m.teamB.playerIds.includes(id),
  )
  if (hasHistory) {
    p.archived = true
    store.value = [...store.value]
    return { player: p, deleted: false, archived: true }
  }

  store.value = store.value.filter(pl => pl.id !== id)
  return { deleted: true }
}

export function toggleArchivePlayer(id: number, archived: boolean) {
  const store = usePlayersStore()
  const p = store.value.find(pl => pl.id === id)
  if (!p) return null
  p.archived = archived
  store.value = [...store.value]
  return p
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

function randomTeamName(game: 'lol' | 'val', exclude: Set<string>) {
  const adjs = game === 'lol' ? LOL_ADJECTIVES : VAL_ADJECTIVES
  const nouns = game === 'lol' ? LOL_NOUNS : VAL_NOUNS
  for (let i = 0; i < 30; i++) {
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    const adj = adjs[Math.floor(Math.random() * adjs.length)]
    const name = `Les ${noun} ${adj}`
    if (!exclude.has(name)) return name
  }
  return `Équipe ${Math.floor(Math.random() * 9999)}`
}

function makeParallelMatches(
  pool: Player[],
  scores: Map<number, ScoreCard>,
  teamSize: number,
  existingKeys: Set<string>,
) {
  const active = pool.filter(p => !p.archived).map(p => p.id)
  const perMatch = teamSize * 2
  const matchCount = Math.floor(active.length / perMatch)
  if (matchCount === 0) return { matches: [] as Array<{ teamA: number[]; teamB: number[] }>, benched: active }
  const scoreOf = (id: number) => scores.get(id)?.points ?? 0

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
  return bestPlan ?? { matches: [], benched: active }
}

export function createBatch(game: 'lol' | 'val', teamSize: number) {
  const players = usePlayersStore().value
  const matchesStore = useMatchesStore()
  const matches = matchesStore.value

  const pool = players.filter(p =>
    !p.archived && (game === 'lol' ? p.lol.playing : p.valorant.playing),
  )
  if (pool.length < teamSize * 2) {
    throw new Error(`Roster insuffisant (${pool.length}/${teamSize * 2})`)
  }
  const scores = computeScores(matches, game)
  const existing = new Set(matches.filter(m => m.game === game).map(m => pairKey(m.teamA.playerIds, m.teamB.playerIds)))
  const plan = makeParallelMatches(pool, scores, teamSize, existing)
  if (!plan.matches.length) throw new Error('Aucune combinaison inédite trouvée')

  const usedNames = new Set(matches.filter(m => m.game === game).flatMap(m => [m.teamA.name, m.teamB.name]))
  const now = new Date().toISOString()
  const batchId = `${game}-${Date.now()}`
  let nextId = matches.length ? Math.max(...matches.map(m => m.id)) + 1 : 1
  const created: Match[] = plan.matches.map(({ teamA, teamB }) => {
    const nameA = randomTeamName(game, usedNames); usedNames.add(nameA)
    const nameB = randomTeamName(game, usedNames); usedNames.add(nameB)
    return {
      id: nextId++,
      game,
      createdAt: now,
      batchId,
      benched: plan.benched,
      teamA: { name: nameA, playerIds: teamA },
      teamB: { name: nameB, playerIds: teamB },
      outcome: null,
    }
  })
  matchesStore.value = [...matches, ...created]
  return created
}

export function setMatchOutcome(id: number, outcome: Outcome) {
  const store = useMatchesStore()
  const m = store.value.find(x => x.id === id)
  if (!m) return
  m.outcome = outcome
  store.value = [...store.value]
}

export function deleteMatch(id: number) {
  const store = useMatchesStore()
  store.value = store.value.filter(m => m.id !== id)
}

export function deleteBatch(batchId: string) {
  const store = useMatchesStore()
  store.value = store.value.filter(m => m.batchId !== batchId)
}

export function purgeMatches(game?: 'lol' | 'val') {
  const store = useMatchesStore()
  store.value = game ? store.value.filter(m => m.game !== game) : []
}
