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
// The app's own mappers, imported rather than copied. Node strips the types on
// the fly, and the file has no runtime imports of its own, so it loads as-is.
// This used to be a second hand-maintained copy with a "keep the two in step"
// comment on top — which is exactly the kind of promise nobody keeps.
import { matchToFields, playerToFields } from '../composables/airtableMappers.ts'

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

/**
 * The schema above is hand-written because Airtable needs a column *type*, which
 * no amount of inspecting the mapper output can tell us reliably. So instead of
 * trusting the two to stay aligned, compare them: every key the app writes must
 * have a column declared here, or the seed would silently drop it — and every
 * declared column should be one the app actually writes.
 */
function assertSchemaCoversMappers() {
  const probePlayer = {
    id: 1, pseudo: 'x', avatarSeed: 'x', registeredAt: '2026-01-01',
    lol: { playing: true }, valorant: { playing: false },
  }
  const probeMatch = {
    id: 1, game: 'lol', createdAt: '', batchId: '', benched: [],
    teamA: { name: '', playerIds: [] }, teamB: { name: '', playerIds: [] }, outcome: null,
  }
  const pairs = [
    [PLAYERS, Object.keys(playerToFields(probePlayer))],
    [MATCHES, Object.keys(matchToFields(probeMatch))],
  ]
  const problems = []
  for (const [table, written] of pairs) {
    const declared = SCHEMAS[table].map(f => f.name)
    for (const k of written) {
      if (!declared.includes(k)) problems.push(`${table}: the app writes "${k}" but no column is declared`)
    }
    for (const k of declared) {
      if (!written.includes(k)) problems.push(`${table}: column "${k}" is declared but the app never writes it`)
    }
  }
  if (problems.length) {
    console.error('Schema drifted from composables/airtableMappers.ts:')
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
}

assertSchemaCoversMappers()

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
