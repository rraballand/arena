import { useMatchesRemote, usePlayersRemote } from '~/composables/useStores'

/**
 * Boot the Airtable-backed stores once, client-side.
 *
 * Doing it here rather than in a component's `onMounted` keeps the store getters
 * callable from event handlers (where there is no active component instance) and
 * guarantees a single fetch + a single watcher per table.
 */
export default defineNuxtPlugin(() => {
  usePlayersRemote().init()
  useMatchesRemote().init()
})
