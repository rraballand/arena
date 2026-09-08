/**
 * Domain <-> Airtable field mapping.
 *
 * Fields are kept flat and human-readable on purpose: the whole point of using
 * Airtable over a real database is being able to fix a roster or a score by hand
 * in the grid view. Nested objects (`lol`, `teamA`) are therefore spread into
 * scalar columns rather than dumped as JSON blobs.
 */
import type { Player, LolRole, LolRank, ValRank } from '~/data/players'
import type { Match, MatchTeam, Outcome } from './useStores'

type Fields = Record<string, unknown>

function str(v: unknown): string | undefined {
  const s = typeof v === 'string' ? v.trim() : v == null ? '' : String(v)
  return s === '' ? undefined : s
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/** Player id lists live as `"3,8,2"` so they stay legible in the Airtable grid. */
function idsToField(ids: number[]): string {
  return ids.join(',')
}

function fieldToIds(v: unknown): number[] {
  if (Array.isArray(v)) return v.map(Number).filter(Number.isFinite)
  return String(v ?? '')
    .split(',')
    .map(s => s.trim())
    // Blank segments must go before Number() sees them: `Number('')` is 0, so an
    // empty bench used to read back as `[0]` — a phantom player, and a round trip
    // that was no longer a fixed point, which made the sync rewrite the row on
    // every single load.
    .filter(Boolean)
    .map(Number)
    .filter(Number.isFinite)
}

// ---------------- Players ----------------

export function playerToFields(p: Player): Fields {
  return {
    appId: p.id,
    pseudo: p.pseudo,
    avatarSeed: p.avatarSeed,
    registeredAt: p.registeredAt,
    factoryUsername: p.factoryUsername ?? '',
    factoryName: p.factoryName ?? '',
    factoryAvatar: p.factoryAvatar ?? '',
    shadow: Boolean(p.shadow),
    lolPlaying: Boolean(p.lol?.playing),
    lolRole: p.lol?.role ?? '',
    lolRank: p.lol?.rank ?? '',
    lolMain: p.lol?.main ?? '',
    valPlaying: Boolean(p.valorant?.playing),
    valRank: p.valorant?.rank ?? '',
    valMain: p.valorant?.main ?? '',
  }
}

export function fieldsToPlayer(f: Fields): Player | null {
  const id = num(f.appId)
  if (id === undefined) return null
  return {
    id,
    pseudo: str(f.pseudo) ?? `Joueur ${id}`,
    avatarSeed: str(f.avatarSeed) ?? String(id),
    registeredAt: str(f.registeredAt) ?? new Date().toISOString().slice(0, 10),
    factoryUsername: str(f.factoryUsername),
    factoryName: str(f.factoryName),
    factoryAvatar: str(f.factoryAvatar),
    shadow: Boolean(f.shadow),
    lol: {
      playing: Boolean(f.lolPlaying),
      role: str(f.lolRole) as LolRole | undefined,
      rank: str(f.lolRank) as LolRank | undefined,
      main: str(f.lolMain),
    },
    valorant: {
      playing: Boolean(f.valPlaying),
      rank: str(f.valRank) as ValRank | undefined,
      main: str(f.valMain),
    },
  }
}

// ---------------- Matches ----------------

export function matchToFields(m: Match): Fields {
  return {
    appId: m.id,
    game: m.game,
    createdAt: m.createdAt,
    batchId: m.batchId,
    outcome: m.outcome ?? '',
    benched: idsToField(m.benched ?? []),
    teamAName: m.teamA.name,
    teamAPlayerIds: idsToField(m.teamA.playerIds),
    teamASlots: m.teamA.slots ?? null,
    teamBName: m.teamB.name,
    teamBPlayerIds: idsToField(m.teamB.playerIds),
    teamBSlots: m.teamB.slots ?? null,
    powerA: m.powerA ?? null,
    powerB: m.powerB ?? null,
  }
}

export function fieldsToMatch(f: Fields): Match | null {
  const id = num(f.appId)
  if (id === undefined) return null
  const game = str(f.game) === 'val' ? 'val' : 'lol'
  const outcomeRaw = str(f.outcome)
  const outcome = outcomeRaw === 'A' || outcomeRaw === 'B' || outcomeRaw === 'D'
    ? (outcomeRaw as Outcome)
    : null

  const team = (name: unknown, ids: unknown, slots: unknown): MatchTeam => ({
    name: str(name) ?? 'Équipe',
    playerIds: fieldToIds(ids),
    slots: num(slots),
  })

  return {
    id,
    game,
    createdAt: str(f.createdAt) ?? new Date().toISOString(),
    batchId: str(f.batchId) ?? `${game}-${id}`,
    benched: fieldToIds(f.benched),
    teamA: team(f.teamAName, f.teamAPlayerIds, f.teamASlots),
    teamB: team(f.teamBName, f.teamBPlayerIds, f.teamBSlots),
    outcome,
    powerA: num(f.powerA),
    powerB: num(f.powerB),
  }
}
