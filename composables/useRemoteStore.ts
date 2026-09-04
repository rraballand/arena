import { watch } from 'vue'
import { createRecords, deleteRecords, isAirtableConfigured, listRecords, updateRecords } from './useAirtable'

/**
 * Airtable-backed collection store with a localStorage cache.
 *
 * Airtable is the source of truth; localStorage keeps the last known copy so the
 * bracket still renders if the API is unreachable mid-tournament.
 *
 * Writes are diffed against the last synced snapshot and pushed as batched
 * create/update/delete, which keeps every existing mutation in `useStores.ts`
 * working unchanged: they replace the whole array, we work out what moved.
 */

type Fields = Record<string, unknown>

interface RemoteStoreOptions<T> {
  /** State + localStorage key. */
  key: string
  /** Airtable table name. */
  table: string
  toFields: (item: T) => Fields
  fromFields: (fields: Fields) => T | null
  /** Stable business key, matched against the `appId` column. */
  idOf: (item: T) => number
}

/** Debounce window: mutations arrive in bursts (a whole batch of matches at once). */
const FLUSH_DELAY_MS = 700

interface SyncContext {
  /** appId -> Airtable record id, rebuilt from the base on every load. */
  recordIds: Map<number, string>
  /** appId -> serialised fields, so unchanged rows don't get a pointless PATCH. */
  snapshot: Map<number, string>
  /** False until the initial fetch succeeds; blocks writes that would duplicate rows. */
  remoteReady: boolean
  timer: ReturnType<typeof setTimeout> | null
  flushing: Promise<void>
  started: boolean
}

const contexts = new Map<string, SyncContext>()

function contextFor(key: string): SyncContext {
  let ctx = contexts.get(key)
  if (!ctx) {
    ctx = {
      recordIds: new Map(),
      snapshot: new Map(),
      remoteReady: false,
      timer: null,
      flushing: Promise.resolve(),
      started: false,
    }
    contexts.set(key, ctx)
  }
  return ctx
}

function readCache<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : null
  } catch {
    return null
  }
}

function writeCache<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export function useRemoteStore<T>(opts: RemoteStoreOptions<T>) {
  const { key, table, toFields, fromFields, idOf } = opts
  const state = useState<T[]>(key, () => [])

  /** Pull the table and make it the local truth, rebuilding the record-id map. */
  async function refresh() {
    if (!isAirtableConfigured()) return
    const ctx = contextFor(key)
    try {
      const records = await listRecords(table)
      ctx.recordIds.clear()
      ctx.snapshot.clear()
      const items: T[] = []
      for (const rec of records) {
        const item = fromFields(rec.fields)
        if (!item) continue
        const id = idOf(item)
        ctx.recordIds.set(id, rec.id)
        ctx.snapshot.set(id, JSON.stringify(toFields(item)))
        items.push(item)
      }
      ctx.remoteReady = true
      state.value = items
      writeCache(key, items)
    } catch (e) {
      // Keep whatever the cache gave us and stay read-only: pushing now would
      // re-create rows we simply failed to read.
      ctx.remoteReady = false
      console.error(`[${key}] Airtable load failed`, e)
    }
  }

  async function flush() {
    const ctx = contextFor(key)
    if (!ctx.remoteReady) return

    const items = state.value
    const current = new Map<number, T>()
    for (const item of items) current.set(idOf(item), item)

    const toCreate: Array<{ id: number, fields: Fields }> = []
    const toUpdate: Array<{ id: string, fields: Fields }> = []
    const nextSnapshot = new Map<number, string>()

    for (const [id, item] of current) {
      const fields = toFields(item)
      const serialised = JSON.stringify(fields)
      nextSnapshot.set(id, serialised)
      const recordId = ctx.recordIds.get(id)
      if (!recordId) toCreate.push({ id, fields })
      else if (ctx.snapshot.get(id) !== serialised) toUpdate.push({ id: recordId, fields })
    }

    const toDelete: string[] = []
    for (const [id, recordId] of ctx.recordIds) {
      if (!current.has(id)) toDelete.push(recordId)
    }

    if (!toCreate.length && !toUpdate.length && !toDelete.length) return

    try {
      if (toCreate.length) {
        const created = await createRecords(table, toCreate.map(c => c.fields))
        // Airtable preserves request order, so zip the new ids back onto appIds.
        created.forEach((rec, i) => {
          const appId = toCreate[i]?.id
          if (appId !== undefined) ctx.recordIds.set(appId, rec.id)
        })
      }
      if (toUpdate.length) await updateRecords(table, toUpdate)
      if (toDelete.length) {
        await deleteRecords(table, toDelete)
        for (const [id, recordId] of [...ctx.recordIds]) {
          if (toDelete.includes(recordId)) ctx.recordIds.delete(id)
        }
      }
      ctx.snapshot = nextSnapshot
    } catch (e) {
      console.error(`[${key}] Airtable save failed`, e)
    }
  }

  function scheduleFlush() {
    const ctx = contextFor(key)
    if (ctx.timer) clearTimeout(ctx.timer)
    ctx.timer = setTimeout(() => {
      ctx.timer = null
      ctx.flushing = ctx.flushing.then(flush, flush)
    }, FLUSH_DELAY_MS)
  }

  /**
   * Paint from cache, pull the base, then start watching. Idempotent, and
   * deliberately not tied to a component lifecycle: the store getters are also
   * called from event handlers, where there is no active instance to hook onto.
   * Driven once at app boot by `plugins/stores.client.ts`.
   */
  function init() {
    const ctx = contextFor(key)
    if (ctx.started) return
    ctx.started = true

    const cached = readCache<T>(key)
    if (cached) state.value = cached

    void refresh()

    watch(
      state,
      (v) => {
        writeCache(key, v)
        scheduleFlush()
      },
      { deep: true },
    )
  }

  return { state, refresh, init }
}
