<script setup lang="ts">
import type { Match, Outcome } from '~/composables/useStores'
import {
  usePlayersStore,
  useMatchesStore,
  createBatch,
  setMatchOutcome as storeSetOutcome,
  deleteBatch as storeDeleteBatch,
  purgeMatches,
} from '~/composables/useStores'
import { useCurrentGame } from '~/composables/useCurrentGame'

const route = useRoute()
const game = computed(() => route.params.game as 'lol' | 'val')

if (!['lol', 'val'].includes(game.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Jeu inconnu' })
}

const currentGame = useCurrentGame()
watchEffect(() => { currentGame.value = game.value })

const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()

const players = computed(() => playersStore.value)
const matches = computed(() =>
  [...matchesStore.value]
    .filter(m => m.game === game.value)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
)

interface Batch {
  batchId: string
  createdAt: string
  matches: Match[]
  benched: number[]
}

const batches = computed<Batch[]>(() => {
  const map = new Map<string, Batch>()
  for (const m of matches.value) {
    const key = m.batchId || m.createdAt
    let batch = map.get(key)
    if (!batch) {
      batch = {
        batchId: key,
        createdAt: m.createdAt,
        matches: [],
        benched: m.benched ?? [],
      }
      map.set(key, batch)
    }
    batch.matches.push(m)
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
})

function playerById(id: number) {
  return players.value.find(p => p.id === id)
}

const teamSize = ref(5)
const generating = ref(false)
const genError = ref<string | null>(null)

function newMatch() {
  generating.value = true
  genError.value = null
  try {
    createBatch(game.value, teamSize.value)
  } catch (e: any) {
    genError.value = e?.message || 'Erreur'
  } finally {
    generating.value = false
  }
}

function deleteBatch(batchId: string) {
  if (!confirm('Supprimer cette session et ses matches ? Points recalculés.')) return
  storeDeleteBatch(batchId)
}

function purgeAll() {
  if (!confirm('Supprimer TOUTES les sessions et matchs de ce jeu ? Action irréversible.')) return
  purgeMatches(game.value)
}

function setOutcome(m: Match, outcome: Outcome) {
  storeSetOutcome(m.id, outcome)
}

const titles = {
  lol: { title: "Faille de l'Invocateur", subtitle: 'League of Legends' },
  val: { title: 'Protocole Radiant', subtitle: 'Valorant' },
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16">
    <div v-reveal>
      <GameHeader
        :game="game"
        :title="titles[game].title"
        :subtitle="titles[game].subtitle"
        :count="matches.length"
        :total="matches.length"
      />
    </div>

    <GameSubNav :game="game" />

    <div v-reveal="60" class="mt-8 hex-frame p-4 md:p-6 mb-6 md:mb-10 flex flex-col md:flex-row md:items-center gap-4 justify-between">
      <div class="flex items-center gap-3">
        <label class="text-[10px] uppercase tracking-widest text-lol-grey-1">Taille équipe</label>
        <input v-model.number="teamSize" type="number" min="1" max="6" class="w-16 bg-lol-void border border-lol-gold-6 rounded-lg focus:border-lol-gold-3 outline-none px-2 py-2 text-lol-gold-1 text-sm text-center" />
        <span class="text-xs uppercase tracking-widest text-lol-grey-2">v{{ teamSize }}</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="lol-btn !px-4 text-lg leading-none"
          :disabled="generating"
          title="Nouveau match"
          @click="newMatch"
        >
          <span v-if="generating">…</span>
          <span v-else>+</span>
        </button>
        <button
          v-if="matches.length"
          class="lol-btn !px-4"
          title="Purger toutes les sessions"
          @click="purgeAll"
        >
          <svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.8">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="genError" class="mb-6 p-3 border border-lol-red/60 bg-lol-red/10 text-lol-red text-sm">
      {{ genError }}
    </div>

    <div v-if="!batches.length" class="hex-frame p-8 md:p-12 text-center text-lol-grey-1">
      Aucun match. Clique <strong class="text-lol-gold-2">Nouveau match</strong> pour tirer 2 équipes équilibrées.
    </div>

    <div v-else class="space-y-12">
      <section
        v-for="batch in batches"
        :key="batch.batchId"
        class="hex-frame relative pt-8 md:pt-9 p-4 md:p-6"
      >
        <div class="absolute -top-3 left-4 flex items-center gap-2 bg-lol-void px-3 py-1 border border-lol-gold-4/60">
          <span class="text-[10px] uppercase tracking-[0.3em] text-lol-gold-2 font-display">
            {{ new Date(batch.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
          </span>
          <button
            class="text-lol-grey-2 hover:text-lol-red transition"
            title="Supprimer cette session"
            @click="deleteBatch(batch.batchId)"
          >
            <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      <div v-for="m in batch.matches" :key="m.id" class="border border-lol-gold-6/60 rounded-lg p-3 md:p-4 bg-lol-void/30">

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Team A -->
          <div
            class="p-4 border transition"
            :class="m.outcome === 'A'
              ? (game === 'val' ? 'border-val-red bg-val-red/10' : 'border-lol-gold-2 bg-lol-gold-6/20')
              : m.outcome === 'B'
                ? 'border-lol-gold-6 opacity-60'
                : 'border-lol-gold-6'"
          >
            <div class="mb-3">
              <div class="text-[10px] uppercase tracking-[0.3em] mb-1 h-4">
                <span v-if="m.outcome === 'A'" class="text-lol-gold-2">Vainqueur</span>
                <span v-else-if="m.outcome === 'B'" class="text-lol-grey-2">Défaite</span>
                <span v-else-if="m.outcome === 'D'" class="text-lol-blue-2">Match nul</span>
              </div>
              <div class="font-display text-lg md:text-xl font-bold" :class="game === 'val' ? 'text-val-cream' : 'text-lol-gold-1'">
                {{ m.teamA.name }}
              </div>
            </div>
            <ul class="space-y-1">
              <li v-for="pid in m.teamA.playerIds" :key="`a-${pid}`" class="flex items-center gap-2 text-sm text-lol-gold-1">
                <img v-if="playerById(pid)?.factoryAvatar" :src="playerById(pid)?.factoryAvatar" :alt="playerById(pid)?.pseudo" class="w-6 h-6 border border-lol-gold-6 rounded-lg" />
                <span class="truncate">{{ playerById(pid)?.pseudo || `#${pid}` }}</span>
              </li>
            </ul>
          </div>

          <!-- Team B -->
          <div
            class="p-4 border transition"
            :class="m.outcome === 'B'
              ? (game === 'val' ? 'border-val-red bg-val-red/10' : 'border-lol-gold-2 bg-lol-gold-6/20')
              : m.outcome === 'A'
                ? 'border-lol-gold-6 opacity-60'
                : 'border-lol-gold-6'"
          >
            <div class="mb-3">
              <div class="text-[10px] uppercase tracking-[0.3em] mb-1 h-4">
                <span v-if="m.outcome === 'B'" class="text-lol-gold-2">Vainqueur</span>
                <span v-else-if="m.outcome === 'A'" class="text-lol-grey-2">Défaite</span>
                <span v-else-if="m.outcome === 'D'" class="text-lol-blue-2">Match nul</span>
              </div>
              <div class="font-display text-lg md:text-xl font-bold" :class="game === 'val' ? 'text-val-cream' : 'text-lol-gold-1'">
                {{ m.teamB.name }}
              </div>
            </div>
            <ul class="space-y-1">
              <li v-for="pid in m.teamB.playerIds" :key="`b-${pid}`" class="flex items-center gap-2 text-sm text-lol-gold-1">
                <img v-if="playerById(pid)?.factoryAvatar" :src="playerById(pid)?.factoryAvatar" :alt="playerById(pid)?.pseudo" class="w-6 h-6 border border-lol-gold-6 rounded-lg" />
                <span class="truncate">{{ playerById(pid)?.pseudo || `#${pid}` }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-5 pt-4 border-t border-lol-gold-6/40">
          <div class="grid grid-cols-[1fr_auto_1fr] items-center border border-lol-gold-6 rounded-lg/60 divide-x divide-lol-gold-6/60">
            <button
              class="px-3 py-3 text-xs uppercase tracking-[0.2em] transition truncate text-center"
              :class="m.outcome === 'A'
                ? 'text-lol-gold-1 bg-lol-gold-6/30'
                : 'text-lol-grey-1 hover:text-lol-gold-1 hover:bg-lol-gold-6/10'"
              @click="setOutcome(m, 'A')"
            >{{ m.teamA.name }}</button>
            <button
              class="px-4 py-3 text-[10px] uppercase tracking-[0.3em] font-display transition"
              :class="m.outcome === 'D'
                ? 'text-lol-blue-2 bg-lol-blue-2/10'
                : 'text-lol-grey-2 hover:text-lol-blue-2'"
              @click="setOutcome(m, 'D')"
            >Nul</button>
            <button
              class="px-3 py-3 text-xs uppercase tracking-[0.2em] transition truncate text-center"
              :class="m.outcome === 'B'
                ? 'text-lol-gold-1 bg-lol-gold-6/30'
                : 'text-lol-grey-1 hover:text-lol-gold-1 hover:bg-lol-gold-6/10'"
              @click="setOutcome(m, 'B')"
            >{{ m.teamB.name }}</button>
          </div>
          <div class="text-center mt-2 text-[9px] uppercase tracking-[0.3em] text-lol-grey-2">
            Clique pour désigner le vainqueur
          </div>
        </div>
      </div>
        </div>

        <div v-if="batch.benched.length" class="mt-4 border border-dashed border-lol-gold-6/40 p-3">
          <div class="text-[10px] uppercase tracking-widest text-lol-grey-1 mb-2">
            Sur le banc ({{ batch.benched.length }})
          </div>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="pid in batch.benched"
              :key="`bench-${batch.batchId}-${pid}`"
              class="flex items-center gap-2 px-2 py-1 border border-lol-gold-6 rounded-lg text-xs text-lol-grey-1"
            >
              <img v-if="playerById(pid)?.factoryAvatar" :src="playerById(pid)?.factoryAvatar" :alt="playerById(pid)?.pseudo" class="w-5 h-5 border border-lol-gold-6 rounded-lg" />
              {{ playerById(pid)?.pseudo || `#${pid}` }}
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
