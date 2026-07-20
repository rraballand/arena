<script setup lang="ts">
import type { Match, Outcome } from '~/composables/useStores'
import {
  usePlayersStore,
  useMatchesStore,
  createBatch,
  setMatchOutcome as storeSetOutcome,
  deleteBatch as storeDeleteBatch,
  challengeBenchWithRandom,
  purgeMatches,
  computeScores,
  reshuffleMatch as storeReshuffleMatch,
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
const activePlayers = computed(() =>
  players.value.filter(p => (game.value === 'lol' ? p.lol.playing : p.valorant.playing)),
)
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

function priorPower(m: Match, side: 'A' | 'B'): number {
  // Snapshot at creation is authoritative. Fallback for legacy matches: recompute
  // from all matches strictly created before this one.
  const stored = side === 'A' ? m.powerA : m.powerB
  if (typeof stored === 'number') return stored
  const priorMatches = matchesStore.value.filter(
    x => x.game === m.game && new Date(x.createdAt).getTime() < new Date(m.createdAt).getTime(),
  )
  const scores = computeScores(priorMatches, m.game)
  const ids = side === 'A' ? m.teamA.playerIds : m.teamB.playerIds
  return ids.reduce((sum, pid) => sum + (scores.get(pid)?.points ?? 0), 0)
}

function teamPower(m: Match, side: 'A' | 'B'): number {
  return priorPower(m, side)
}

function powerDelta(m: Match): number {
  return teamPower(m, 'A') - teamPower(m, 'B')
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

function reshuffle(m: Match) {
  try {
    storeReshuffleMatch(m.id)
  } catch (e: any) {
    alert(e?.message || 'Erreur')
  }
}

function benchChallenge(batch: Batch) {
  try {
    challengeBenchWithRandom(batch.batchId)
  } catch (e: any) {
    alert(e?.message || 'Erreur')
  }
}

const titles = {
  lol: { title: 'League of Legends', subtitle: '' },
  val: { title: 'Valorant', subtitle: '' },
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16">
    <div v-reveal>
      <GameHeader
        :game="game"
        :title="titles[game].title"
        :subtitle="titles[game].subtitle"
        :count="activePlayers.length"
        :total="players.length"
      />
    </div>

    <GameSubNav :game="game">
      <template #actions>
        <div class="flex items-center gap-1.5">
          <label class="text-[10px] uppercase tracking-widest text-lol-grey-1">Taille</label>
          <input v-model.number="teamSize" type="number" min="1" max="6" class="w-12 bg-lol-void border border-lol-gold-6 rounded-lg focus:border-lol-gold-3 outline-none px-2 py-1.5 text-lol-gold-1 text-sm text-center" />
          <span class="text-[10px] uppercase tracking-widest text-lol-grey-2">v{{ teamSize }}</span>
        </div>
        <button
          class="lol-btn !px-3 !py-1.5 text-base leading-none"
          :disabled="generating"
          title="Nouveau match"
          @click="newMatch"
        >
          <span v-if="generating">…</span>
          <span v-else>+</span>
        </button>
        <button
          v-if="matches.length"
          class="lol-btn !px-3 !py-1.5"
          title="Purger toutes les sessions"
          @click="purgeAll"
        >
          <svg viewBox="0 0 24 24" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </template>
    </GameSubNav>

    <div v-if="genError" class="mt-6 mb-6 p-3 border border-lol-red/60 bg-lol-red/10 text-lol-red text-sm">
      {{ genError }}
    </div>

    <div v-if="!batches.length" class="mt-8 hex-frame p-8 md:p-12 text-center text-lol-grey-1">
      Aucun match. Clique <strong class="text-lol-gold-2">+</strong> pour créer des équipes équilibrées.
    </div>

    <div v-else class="mt-8 space-y-12">
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

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
      <div v-for="m in batch.matches" :key="m.id" class="border border-lol-gold-6/60 rounded-lg p-3 md:p-4 bg-lol-void/30">

        <div class="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-2 items-stretch">
          <!-- Team A -->
          <TeamCard
            :team="m.teamA"
            :game="game"
            :power="teamPower(m, 'A')"
            :outcome="m.outcome"
            side="A"
            :player-by-id="playerById"
          />

          <!-- VS separator -->
          <div class="flex md:flex-col items-center justify-center gap-2 py-2 md:py-0">
            <div class="hidden md:block flex-1 w-px bg-gradient-to-b from-transparent via-lol-gold-6 to-transparent" />
            <div class="font-display text-lg md:text-xl text-lol-gold-2 tracking-widest select-none">VS</div>
            <div
              v-if="powerDelta(m) !== 0"
              class="text-[9px] uppercase tracking-[0.2em] font-mono"
              :class="powerDelta(m) > 0 ? 'text-lol-gold-2' : 'text-lol-red'"
            >
              {{ powerDelta(m) > 0 ? '+' : '' }}{{ powerDelta(m) }}
            </div>
            <div class="hidden md:block flex-1 w-px bg-gradient-to-b from-transparent via-lol-gold-6 to-transparent" />
          </div>

          <!-- Team B -->
          <TeamCard
            :team="m.teamB"
            :game="game"
            :power="teamPower(m, 'B')"
            :outcome="m.outcome"
            side="B"
            :player-by-id="playerById"
          />
        </div>

        <div class="mt-4 flex items-center justify-center gap-2">
          <button
            class="px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] font-display border rounded-md transition"
            :class="m.outcome === 'A'
              ? 'text-lol-gold-1 bg-lol-gold-6/30 border-lol-gold-2 shadow-[0_0_12px_-4px_rgba(200,155,60,0.6)]'
              : 'text-lol-grey-1 border-lol-gold-6/60 hover:text-lol-gold-1 hover:border-lol-gold-3'"
            :title="`Vainqueur : ${m.teamA.name}`"
            @click="setOutcome(m, 'A')"
          >◄ A gagne</button>
          <button
            class="px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] font-display border rounded-md transition"
            :class="m.outcome === 'D'
              ? 'text-lol-blue-2 bg-lol-blue-2/10 border-lol-blue-2'
              : 'text-lol-grey-2 border-lol-gold-6/60 hover:text-lol-blue-2'"
            @click="setOutcome(m, 'D')"
          >Nul</button>
          <button
            class="px-4 py-1.5 text-[10px] uppercase tracking-[0.25em] font-display border rounded-md transition"
            :class="m.outcome === 'B'
              ? 'text-lol-gold-1 bg-lol-gold-6/30 border-lol-gold-2 shadow-[0_0_12px_-4px_rgba(200,155,60,0.6)]'
              : 'text-lol-grey-1 border-lol-gold-6/60 hover:text-lol-gold-1 hover:border-lol-gold-3'"
            :title="`Vainqueur : ${m.teamB.name}`"
            @click="setOutcome(m, 'B')"
          >B gagne ►</button>
          <button
            v-if="!m.outcome && (m.teamA.playerIds.length + m.teamB.playerIds.length) >= 2"
            class="ml-2 p-1.5 text-lol-grey-1 border border-lol-gold-6/60 hover:text-lol-gold-2 hover:border-lol-gold-3 rounded-md transition"
            title="Rebrasser les équipes (équilibrage repris)"
            @click="reshuffle(m)"
          >
            <svg viewBox="0 0 24 24" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>
      </div>
        </div>

        <div v-if="batch.benched.length" class="mt-4 border border-dashed border-lol-gold-6/40 p-3">
          <div class="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <div class="text-[10px] uppercase tracking-widest text-lol-grey-1">
              Sur le banc ({{ batch.benched.length }})
            </div>
            <button
              v-if="batch.matches.length && batch.benched.length >= 2"
              class="px-3 py-1.5 text-[10px] uppercase tracking-widest border border-lol-gold-6 hover:border-lol-gold-3 text-lol-gold-2 transition"
              title="Split le banc en 2 teams et lance un match"
              @click="benchChallenge(batch)"
            >⚔ Faire jouer le banc</button>
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
