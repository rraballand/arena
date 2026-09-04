/**
 * Minimal Airtable REST client.
 *
 * The PAT ships in the client bundle by design (the app is a static SPA with no
 * backend), so it MUST be a data-only token scoped to this single base:
 * `data.records:read` + `data.records:write`, nothing else. Anyone with the app
 * URL can read and write the base — that trade-off is deliberate.
 */

const API_ROOT = 'https://api.airtable.com/v0'

/** Airtable allows 5 requests/second/base; stay just under it. */
const REQUEST_SPACING_MS = 220

/** Airtable caps batch create/update/delete at 10 records per request. */
export const BATCH_SIZE = 10

export interface AirtableRecord {
  id: string
  fields: Record<string, unknown>
}

export interface AirtableConfig {
  pat: string
  baseId: string
  playersTable: string
  matchesTable: string
}

export function useAirtableConfig(): AirtableConfig {
  return useRuntimeConfig().public.airtable as AirtableConfig
}

export function isAirtableConfigured() {
  const c = useAirtableConfig()
  return Boolean(c?.pat && c?.baseId)
}

/**
 * Serialise every call so concurrent stores can't blow the per-base rate limit.
 * Each request waits for the previous one, then for the spacing window.
 */
let chain: Promise<unknown> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task)
  chain = run.then(
    () => new Promise(r => setTimeout(r, REQUEST_SPACING_MS)),
    () => new Promise(r => setTimeout(r, REQUEST_SPACING_MS)),
  )
  return run
}

async function request<T>(
  table: string,
  init: { method: string, query?: Record<string, string | string[]>, body?: unknown },
): Promise<T> {
  const { pat, baseId } = useAirtableConfig()
  return enqueue(() =>
    $fetch<T>(`${API_ROOT}/${baseId}/${encodeURIComponent(table)}`, {
      method: init.method as 'GET',
      query: init.query,
      body: init.body as Record<string, unknown>,
      headers: { Authorization: `Bearer ${pat}` },
    }),
  )
}

function chunk<T>(items: T[], size = BATCH_SIZE): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Fetch every record of a table, following Airtable's offset pagination. */
export async function listRecords(table: string): Promise<AirtableRecord[]> {
  const all: AirtableRecord[] = []
  let offset: string | undefined
  do {
    const res = await request<{ records: AirtableRecord[], offset?: string }>(table, {
      method: 'GET',
      query: offset ? { pageSize: '100', offset } : { pageSize: '100' },
    })
    all.push(...res.records)
    offset = res.offset
  } while (offset)
  return all
}

export async function createRecords(
  table: string,
  fields: Array<Record<string, unknown>>,
): Promise<AirtableRecord[]> {
  const created: AirtableRecord[] = []
  for (const batch of chunk(fields)) {
    const res = await request<{ records: AirtableRecord[] }>(table, {
      method: 'POST',
      body: { records: batch.map(f => ({ fields: f })), typecast: true },
    })
    created.push(...res.records)
  }
  return created
}

export async function updateRecords(
  table: string,
  records: Array<{ id: string, fields: Record<string, unknown> }>,
): Promise<void> {
  for (const batch of chunk(records)) {
    await request(table, {
      method: 'PATCH',
      body: { records: batch, typecast: true },
    })
  }
}

export async function deleteRecords(table: string, ids: string[]): Promise<void> {
  for (const batch of chunk(ids)) {
    await request(table, { method: 'DELETE', query: { 'records[]': batch } })
  }
}
