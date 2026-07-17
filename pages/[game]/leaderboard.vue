<script setup lang="ts">
import { useCurrentGame } from '~/composables/useCurrentGame'
import {
  usePlayersStore,
  useMatchesStore,
  computeScores,
  SCORING,
} from '~/composables/useStores'

const route = useRoute()
const game = computed(() => route.params.game as 'lol' | 'val')

if (!['lol', 'val'].includes(game.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Jeu inconnu' })
}

const currentGame = useCurrentGame()
watchEffect(() => { currentGame.value = game.value })

const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()

interface LeaderboardEntry {
  playerId: number
  pseudo: string
  factoryAvatar?: string
  archived: boolean
  points: number
  wins: number
  draws: number
  losses: number
  matches: number
}

const entries = computed<LeaderboardEntry[]>(() => {
  const scores = computeScores(matchesStore.value, game.value)
  const rows: LeaderboardEntry[] = []
  for (const p of playersStore.value) {
    const c = scores.get(p.id)
    const active = game.value === 'lol' ? p.lol.playing : p.valorant.playing
    if (!c && !active) continue
    rows.push({
      playerId: p.id,
      pseudo: p.pseudo,
      factoryAvatar: p.factoryAvatar,
      archived: p.archived ?? false,
      points: c?.points ?? 0,
      wins: c?.wins ?? 0,
      draws: c?.draws ?? 0,
      losses: c?.losses ?? 0,
      matches: c?.matches ?? 0,
    })
  }
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    return a.losses - b.losses
  })
  return rows
})
const scoring = computed(() => SCORING)

const titles = {
  lol: { title: "Faille de l'Invocateur", subtitle: 'League of Legends' },
  val: { title: 'Protocole Radiant', subtitle: 'Valorant' },
}

function medal(index: number) {
  if (index === 0) return { color: '#F4C874' }
  if (index === 1) return { color: '#B4B4B4' }
  if (index === 2) return { color: '#8C523A' }
  return null
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-16">
    <div v-reveal>
      <GameHeader
        :game="game"
        :title="titles[game].title"
        :subtitle="titles[game].subtitle"
        :count="entries.length"
        :total="entries.length"
      />
    </div>

    <GameSubNav :game="game" />

    <div class="mt-6" />

    <div v-if="entries.length >= 3" v-reveal="100" class="grid grid-cols-3 gap-2 md:gap-4 mb-8 md:mb-12 items-end">
      <div class="hex-frame p-3 md:p-4 text-center border" style="border-color: #B4B4B4">
        <div class="font-display text-3xl md:text-4xl font-black mb-1" style="color: #B4B4B4">02</div>
        <img v-if="entries[1]?.factoryAvatar" :src="entries[1].factoryAvatar" :alt="entries[1].pseudo" class="w-12 h-12 md:w-16 md:h-16 mx-auto border" style="border-color: #B4B4B4" />
        <div class="mt-2 font-display font-bold text-lol-gold-1 truncate text-sm md:text-base">{{ entries[1]?.pseudo }}</div>
        <div class="font-display text-xl md:text-2xl text-lol-gold-2 mt-1">{{ entries[1]?.points }} pts</div>
      </div>
      <div class="hex-frame p-4 md:p-6 text-center border-2 border-lol-gold-2 shadow-hex-strong md:-translate-y-4">
        <div class="font-display text-4xl md:text-6xl font-black mb-1 text-lol-gold-1">01</div>
        <img v-if="entries[0]?.factoryAvatar" :src="entries[0].factoryAvatar" :alt="entries[0].pseudo" class="w-16 h-16 md:w-24 md:h-24 mx-auto border-2 border-lol-gold-2 shadow-hex" />
        <div class="mt-3 font-display font-bold text-lol-gold-1 truncate md:text-lg">{{ entries[0]?.pseudo }}</div>
        <div class="font-display text-2xl md:text-3xl text-lol-gold-2 mt-1">{{ entries[0]?.points }} pts</div>
      </div>
      <div class="hex-frame p-3 md:p-4 text-center border" style="border-color: #8C523A">
        <div class="font-display text-3xl md:text-4xl font-black mb-1" style="color: #8C523A">03</div>
        <img v-if="entries[2]?.factoryAvatar" :src="entries[2].factoryAvatar" :alt="entries[2].pseudo" class="w-12 h-12 md:w-16 md:h-16 mx-auto border" style="border-color: #8C523A" />
        <div class="mt-2 font-display font-bold text-lol-gold-1 truncate text-sm md:text-base">{{ entries[2]?.pseudo }}</div>
        <div class="font-display text-xl md:text-2xl text-lol-gold-2 mt-1">{{ entries[2]?.points }} pts</div>
      </div>
    </div>

    <div v-if="entries.length" v-reveal="150" class="hex-frame p-4 md:p-6">
      <div class="grid grid-cols-[30px_1fr_auto_auto_auto_auto] md:grid-cols-[40px_1fr_auto_auto_auto_auto] gap-2 md:gap-4 text-[10px] uppercase tracking-widest text-lol-grey-1 pb-3 border-b border-lol-gold-6">
        <div>#</div>
        <div>Joueur</div>
        <div class="text-right">V</div>
        <div class="text-right">N</div>
        <div class="text-right">D</div>
        <div class="text-right">Pts</div>
      </div>

      <div
        v-for="(e, i) in entries"
        :key="e.playerId"
        class="grid grid-cols-[30px_1fr_auto_auto_auto_auto] md:grid-cols-[40px_1fr_auto_auto_auto_auto] gap-2 md:gap-4 items-center py-3 border-b border-lol-gold-6/40 last:border-0 group"
      >
        <div
          class="font-display text-base md:text-lg font-black"
          :style="{ color: medal(i)?.color || '#5B5A56' }"
        >
          {{ String(i + 1).padStart(2, '0') }}
        </div>
        <div class="flex items-center gap-2 md:gap-3 min-w-0">
          <img v-if="e.factoryAvatar" :src="e.factoryAvatar" :alt="e.pseudo" class="w-8 h-8 md:w-10 md:h-10 border border-lol-gold-6 transition" />
          <div class="min-w-0">
            <div class="font-display font-semibold text-lol-gold-1 truncate text-sm md:text-base">{{ e.pseudo }}</div>
          </div>
        </div>
        <div class="text-right font-display text-lol-gold-2 text-sm md:text-base">{{ e.wins }}</div>
        <div class="text-right font-display text-lol-blue-2 text-sm md:text-base">{{ e.draws }}</div>
        <div class="text-right font-display text-lol-grey-1 text-sm md:text-base">{{ e.losses }}</div>
        <div class="text-right font-display text-xl md:text-2xl font-black text-lol-gold-1">{{ e.points }}</div>
      </div>
    </div>

    <div v-else class="hex-frame p-8 md:p-12 text-center text-lol-grey-1">
      Aucun match joué. Génère un bracket et saisis des résultats.
    </div>
  </div>
</template>
