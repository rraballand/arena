#!/usr/bin/env node
/**
 * Create the Players / Matches tables in an Airtable base, and optionally seed
 * them from the local .data/*.json snapshots.
 *
 *   node scripts/airtable-setup.mjs          # create missing tables
 *   node scripts/airtable-setup.mjs --seed   # ... and import .data/*.json
 *
 * Needs an ADMIN token (`schema.bases:read/write` + `data.records:read/write`
 * — the read scope is for the "is this table empty?" guard before seeding), used
 * here only — never shipped to the browser. The front-end uses a separate
 * data-only PAT. See AIRTABLE.md.
 */
import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'

const API_ROOT = 'https://api.airtable.com/v0'
const REPO_ROOT = resolve(new URL('../', import.meta.url).pathname)

const adminPat = process.env.AIRTABLE_ADMIN_PAT
const baseId = process.env.AIRTABLE_BASE_ID
const PLAYERS = process.env.AIRTABLE_PLAYERS_TABLE || 'Players'
const MATCHES = process.env.AIRTABLE_MATCHES_TABLE || 'Matches'

if (!adminPat || !baseId) {
  console.error('Missing AIRTABLE_ADMIN_PAT or AIRTABLE_BASE_ID in env')
  process.exit(1)
}

const seed = process.argv.includes('--seed')

const text = name => ({ name, type: 'singleLineText' })
const int = name => ({ name, type: 'number', options: { precision: 0 } })
const check = name => ({
  name,
  type: 'checkbox',
  options: { icon: 'check', color: 'greenBright' },
})

const SCHEMAS = {
  [PLAYERS]: [
    int('appId'),
    text('pseudo'),
    text('tagline'),
    text('region'),
    text('avatarSeed'),
    text('registeredAt'),
    text('factoryUsername'),
    text('factoryName'),
    text('factoryAvatar'),
    check('shadow'),
    check('lolPlaying'),
    text('lolRole'),
    text('lolRank'),
    text('lolMain'),
    check('valPlaying'),
    text('valRole'),
    text('valRank'),
    text('valMain'),
  ],
  [MATCHES]: [
    int('appId'),
    text('game'),
    text('createdAt'),
    text('batchId'),
    text('outcome'),
    text('benched'),
    text('teamAName'),
    text('teamAPlayerIds'),
    int('teamASlots'),
    text('teamBName'),
    text('teamBPlayerIds'),
    int('teamBSlots'),
    int('powerA'),
    int('powerB'),
  ],
}

async function api(path, init = {}) {
  const res = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${adminPat}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${path}: ${body}`)
  return body ? JSON.parse(body) : null
}

// ---------------- Schema ----------------

const { tables } = await api(`/meta/bases/${baseId}/tables`)
const existing = new Map(tables.map(t => [t.name, t]))

for (const [name, fields] of Object.entries(SCHEMAS)) {
  const table = existing.get(name)
  if (!table) {
    // The first field becomes the primary field, which Airtable won't let us
    // delete later — appId is the right one to pin there.
    await api(`/meta/bases/${baseId}/tables`, {
      method: 'POST',
      body: JSON.stringify({ name, fields }),
    })
    console.log(`Created table ${name} (${fields.length} fields)`)
    continue
  }
  const have = new Set(table.fields.map(f => f.name))
  const missing = fields.filter(f => !have.has(f.name))
  for (const field of missing) {
    await api(`/meta/bases/${baseId}/tables/${table.id}/fields`, {
      method: 'POST',
      body: JSON.stringify(field),
    })
  }
  console.log(
    missing.length
      ? `Table ${name} exists, added ${missing.length} field(s): ${missing.map(f => f.name).join(', ')}`
      : `Table ${name} already up to date`,
  )
}

if (!seed) {
  console.log('\nSchema ready. Re-run with --seed to import .data/*.json')
  process.exit(0)
}

// ---------------- Seed ----------------

/** Mirrors composables/airtableMappers.ts — keep the two in step. */
function playerToFields(p) {
  return {
    appId: p.id,
    pseudo: p.pseudo,
    tagline: p.tagline ?? '',
    region: p.region ?? 'EUW',
    avatarSeed: p.avatarSeed ?? String(p.id),
    registeredAt: p.registeredAt ?? new Date().toISOString().slice(0, 10),
    factoryUsername: p.factoryUsername ?? '',
    factoryName: p.factoryName ?? '',
    factoryAvatar: p.factoryAvatar ?? '',
    shadow: Boolean(p.shadow),
    lolPlaying: Boolean(p.lol?.playing),
    lolRole: p.lol?.role ?? '',
    lolRank: p.lol?.rank ?? '',
    lolMain: p.lol?.main ?? '',
    valPlaying: Boolean(p.valorant?.playing),
    valRole: p.valorant?.role ?? '',
    valRank: p.valorant?.rank ?? '',
    valMain: p.valorant?.main ?? '',
  }
}

function matchToFields(m) {
  return {
    appId: m.id,
    game: m.game,
    createdAt: m.createdAt,
    batchId: m.batchId ?? `${m.game}-${m.id}`,
    outcome: m.outcome ?? '',
    benched: (m.benched ?? []).join(','),
    teamAName: m.teamA?.name ?? 'Équipe A',
    teamAPlayerIds: (m.teamA?.playerIds ?? []).join(','),
    teamASlots: m.teamA?.slots ?? null,
    teamBName: m.teamB?.name ?? 'Équipe B',
    teamBPlayerIds: (m.teamB?.playerIds ?? []).join(','),
    teamBSlots: m.teamB?.slots ?? null,
    powerA: m.powerA ?? null,
    powerB: m.powerB ?? null,
  }
}

async function readJson(rel) {
  try {
    return JSON.parse(await fs.readFile(resolve(REPO_ROOT, rel), 'utf8'))
  } catch {
    console.warn(`Skipping ${rel} (unreadable or absent)`)
    return []
  }
}

async function push(table, rows) {
  if (!rows.length) return
  const current = await api(`/${baseId}/${encodeURIComponent(table)}?pageSize=100`)
  if (current.records.length) {
    console.warn(`${table} already holds ${current.records.length} record(s) — seed skipped`)
    return
  }
  for (let i = 0; i < rows.length; i += 10) {
    await api(`/${baseId}/${encodeURIComponent(table)}`, {
      method: 'POST',
      body: JSON.stringify({
        records: rows.slice(i, i + 10).map(fields => ({ fields })),
        typecast: true,
      }),
    })
  }
  console.log(`Seeded ${rows.length} row(s) into ${table}`)
}

const players = await readJson('.data/players.json')
const matches = await readJson('.data/matches.json')

await push(PLAYERS, players.map(playerToFields))
await push(MATCHES, matches.map(matchToFields))

console.log('\nDone.')
