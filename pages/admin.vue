<script setup lang="ts">
import type { Player } from '~/data/players'
import {
  usePlayersStore,
  useMatchesStore,
  useMembersStore,
  fetchMembers,
  registerPlayer,
  computeScores,
  avatarSrc,
  type FactoryMember,
} from '~/composables/useStores'
import { useCurrentGame } from '~/composables/useCurrentGame'

const currentGame = useCurrentGame()
currentGame.value = 'lol'

const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()
const membersStore = useMembersStore()

onMounted(fetchMembers)

const message = ref<string | null>(null)
const messageTone = ref<'ok' | 'error'>('ok')

function notify(text: string, tone: 'ok' | 'error' = 'ok') {
  message.value = text
  messageTone.value = tone
}

// ---------------- Liste ----------------

const search = ref('')
const gameFilter = ref<'all' | 'lol' | 'val' | 'none'>('all')
const editingId = ref<number | null>(null)

function toggleEdit(id: number) {
  editingId.value = editingId.value === id ? null : id
}

function matchesSearch(p: Player) {
  const q = search.value.trim().toLowerCase()
  return !q
    || p.pseudo.toLowerCase().includes(q)
    || (p.factoryUsername || '').toLowerCase().includes(q)
}

const byPseudo = (a: Player, b: Player) => a.pseudo.localeCompare(b.pseudo, 'fr')

/**
 * Players unavailable tonight are sorted last rather than hidden: they still
 * hold a roster slot. Someone who left the tournament for good simply has both
 * `playing` flags false, which the "Inactifs" filter surfaces.
 */
const visiblePlayers = computed(() =>
  playersStore.value
    .filter((p) => {
      if (gameFilter.value === 'lol') return p.lol.playing
      if (gameFilter.value === 'val') return p.valorant.playing
      if (gameFilter.value === 'none') return !p.lol.playing && !p.valorant.playing
      return true
    })
    .filter(matchesSearch)
    .sort((a, b) => Number(Boolean(a.shadow)) - Number(Boolean(b.shadow)) || byPseudo(a, b)),
)

// Computed once for the whole list rather than per row: `computeScores` walks
// every match, so calling it inside the v-for would be quadratic.
const lolScores = computed(() => computeScores(matchesStore.value, 'lol'))
const valScores = computed(() => computeScores(matchesStore.value, 'val'))

/** Matches referencing a player. Non-zero blocks the hard delete. */
function matchCount(id: number) {
  return matchesStore.value.filter(
    m => m.teamA.playerIds.includes(id) || m.teamB.playerIds.includes(id) || (m.benched ?? []).includes(id),
  ).length
}

// ---------------- Ajout manuel ----------------

const adding = ref(false)
const addSearch = ref('')
const addGame = ref<'lol' | 'val'>('lol')

const alreadyIn = computed(() => new Set(playersStore.value.map(p => p.factoryUsername).filter(Boolean)))

const addCandidates = computed(() => {
  const q = addSearch.value.trim().toLowerCase()
  if (q.length < 2) return []
  return membersStore.value
    .filter(m => !alreadyIn.value.has(m.username))
    .filter(m => m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q))
    .slice(0, 8)
})

function add(m: FactoryMember) {
  try {
    registerPlayer({
      factoryUsername: m.username,
      pseudo: m.name,
      factoryName: m.name,
      factoryAvatar: m.avatar_url ?? undefined,
      game: addGame.value,
    })
    notify(`${m.name} ajouté à ${addGame.value === 'lol' ? 'LoL' : 'Valorant'}.`)
    addSearch.value = ''
    adding.value = false
  } catch (e: any) {
    notify(e?.message || 'Erreur inconnue', 'error')
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16">
    <div v-reveal class="text-center mb-8">
      <div class="text-[10px] uppercase tracking-[0.5em] text-lol-blue-2 mb-3">Administration</div>
      <h1 class="lol-title text-4xl md:text-6xl font-black">Roster</h1>
    </div>

    <!-- Stats -->
    <div v-reveal="60" class="hex-frame p-5 mb-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div class="font-display text-3xl text-lol-gold-2">{{ playersStore.length }}</div>
          <div class="text-[10px] uppercase tracking-widest text-lol-grey-1">Joueurs</div>
        </div>
        <div>
          <div class="font-display text-3xl text-lol-gold-2">
            {{ playersStore.filter(p => p.lol.playing).length }}
          </div>
          <div class="text-[10px] uppercase tracking-widest text-lol-grey-1">LoL</div>
        </div>
        <div>
          <div class="font-display text-3xl text-val-red">
            {{ playersStore.filter(p => p.valorant.playing).length }}
          </div>
          <div class="text-[10px] uppercase tracking-widest text-lol-grey-1">Valorant</div>
        </div>
        <div>
          <div class="font-display text-3xl text-lol-gold-2">{{ matchesStore.length }}</div>
          <div class="text-[10px] uppercase tracking-widest text-lol-grey-1">Matches</div>
        </div>
      </div>
    </div>

    <div
      v-if="message"
      class="mb-6 p-3 border text-sm"
      :class="messageTone === 'error'
        ? 'border-val-red/60 bg-val-red/10 text-val-red'
        : 'border-lol-blue-2/60 bg-lol-blue-2/10 text-lol-blue-2'"
    >
      {{ message }}
    </div>

    <!-- Filtres + ajout -->
    <div v-reveal="80" class="hex-frame p-4 md:p-5 mb-6">
      <div class="flex flex-col md:flex-row md:items-center gap-3">
        <div class="relative flex-1">
          <input
            v-model="search"
            type="text"
            placeholder="Chercher un joueur..."
            class="w-full bg-lol-void border border-lol-gold-6 rounded-lg focus:border-lol-gold-3 outline-none pl-3 pr-9 py-2 text-lol-gold-1 text-sm"
            @keydown.esc="search = ''"
          />
          <button
            v-if="search"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded text-lol-grey-1 hover:text-lol-gold-2 transition"
            title="Effacer"
            aria-label="Effacer la recherche"
            @click="search = ''"
          >✕</button>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button
            v-for="f in (['all', 'lol', 'val', 'none'] as const)"
            :key="f"
            type="button"
            class="px-2.5 py-1 border rounded-lg text-[10px] uppercase tracking-widest transition"
            :class="gameFilter === f
              ? 'border-lol-gold-2 text-lol-gold-1 bg-lol-gold-6/30'
              : 'border-lol-gold-6/60 text-lol-grey-1 hover:border-lol-gold-3'"
            @click="gameFilter = f"
          >
            {{ f === 'all' ? 'Tous' : f === 'lol' ? 'LoL' : f === 'val' ? 'Valo' : 'Inactifs' }}
          </button>
        </div>
        <button type="button" class="lol-btn justify-center shrink-0" @click="adding = !adding">
          {{ adding ? 'Annuler' : '+ Ajouter' }}
        </button>
      </div>

      <div v-if="adding" class="mt-4 pt-4 border-t border-lol-gold-6/40">
        <div class="flex items-center gap-2 mb-3">
          <button
            v-for="g in (['lol', 'val'] as const)"
            :key="g"
            type="button"
            class="px-3 py-1 border rounded-lg text-[10px] uppercase tracking-widest transition"
            :class="addGame === g
              ? (g === 'val' ? 'border-val-red text-val-red bg-val-red/10' : 'border-lol-gold-2 text-lol-gold-1 bg-lol-gold-6/30')
              : 'border-lol-gold-6/60 text-lol-grey-1 hover:border-lol-gold-3'"
            @click="addGame = g"
          >
            {{ g === 'lol' ? 'League of Legends' : 'Valorant' }}
          </button>
        </div>
        <input
          v-model="addSearch"
          type="text"
          placeholder="Nom du joueur (2 caractères min)..."
          class="w-full bg-lol-void border border-lol-gold-6 rounded-lg focus:border-lol-gold-3 outline-none px-3 py-2 text-lol-gold-1 text-sm"
        />
        <div v-if="addCandidates.length" class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          <button
            v-for="m in addCandidates"
            :key="m.id"
            type="button"
            class="flex items-center gap-3 p-2 border border-lol-gold-6 rounded-lg hover:border-lol-gold-3 hover:bg-lol-gold-6/20 transition text-left"
            @click="add(m)"
          >
            <img
              v-if="m.avatar_url"
              :src="avatarSrc(m.avatar_url)"
              :alt="m.name"
              class="w-8 h-8 rounded-lg border border-lol-gold-6 shrink-0"
            />
            <span class="text-sm text-lol-gold-1 truncate">{{ m.name }}</span>
          </button>
        </div>
        <p
          v-else-if="addSearch.trim().length >= 2"
          class="mt-3 text-center text-lol-grey-1 text-xs py-2"
        >
          Aucun membre disponible (déjà dans le roster ?)
        </p>
      </div>
    </div>

    <!-- Roster actif -->
    <div v-reveal="100" class="space-y-2">
      <p v-if="!visiblePlayers.length" class="hex-frame p-8 text-center text-lol-grey-1 text-sm">
        Aucun joueur ne correspond.
      </p>
      <AdminPlayerRow
        v-for="p in visiblePlayers"
        :key="p.id"
        :player="p"
        :match-count="matchCount(p.id)"
        :lol-score="lolScores.get(p.id)"
        :val-score="valScores.get(p.id)"
        :editing="editingId === p.id"
        @toggle-edit="toggleEdit(p.id)"
        @notify="notify"
      />
    </div>

  </div>
</template>
