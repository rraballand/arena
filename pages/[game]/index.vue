<script setup lang="ts">
import { useCurrentGame } from '~/composables/useCurrentGame'
import { usePlayersStore, crossRegisterPlayer } from '~/composables/useStores'

const route = useRoute()
const game = computed(() => route.params.game as 'lol' | 'val')

if (!['lol', 'val'].includes(game.value)) {
  throw createError({ statusCode: 404, statusMessage: 'Jeu inconnu' })
}

const currentGame = useCurrentGame()
watchEffect(() => { currentGame.value = game.value })

const playersStore = usePlayersStore()
const allPlayers = computed(() => playersStore.value)
const players = computed(() =>
  allPlayers.value
    .filter(p => (game.value === 'lol' ? p.lol.playing : p.valorant.playing))
    .sort((a, b) => a.pseudo.localeCompare(b.pseudo, 'fr', { sensitivity: 'base' })),
)
const otherGamePlayers = computed(() =>
  allPlayers.value.filter(p => {
    const inCurrent = game.value === 'lol' ? p.lol.playing : p.valorant.playing
    const inOther = game.value === 'lol' ? p.valorant.playing : p.lol.playing
    return inOther && !inCurrent
  }),
)
const count = computed(() => players.value.length)

function crossRegister(playerId: number) {
  crossRegisterPlayer(playerId, game.value)
}
function refresh() { /* local store reactive, no-op */ }

const titles = {
  lol: { title: "Faille de l'Invocateur", subtitle: 'League of Legends' },
  val: { title: 'Protocole Radiant', subtitle: 'Valorant' },
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-16">
    <div v-reveal>
      <GameHeader
        :game="game"
        :title="titles[game].title"
        :subtitle="titles[game].subtitle"
        :count="count"
        :total="players.length"
      />
    </div>

    <GameSubNav :game="game" />

    <QuickAdd :game="game" />

    <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div
        v-for="(player, i) in players"
        :key="`${game}-${player.id}`"
        v-reveal="i * 60"
      >
        <PlayerCard
          :player="player"
          :game="game"
          deletable
          @deleted="refresh"
          @archived="refresh"
        />
      </div>
    </div>

    <div v-if="otherGamePlayers.length" class="mt-12">
      <HexDivider :label="`Déjà inscrits ${game === 'lol' ? 'sur Valorant' : 'sur LoL'}`" />
      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          v-for="p in otherGamePlayers"
          :key="`cross-${p.id}`"
          type="button"
          class="hex-frame p-3 flex items-center gap-3 text-left hover:border-lol-gold-3 transition group"
          @click="crossRegister(p.id)"
        >
          <div
            class="w-10 h-10 shrink-0 overflow-hidden border opacity-60 group-hover:opacity-100"
            :class="game === 'val' ? 'border-val-red/60' : 'border-lol-gold-4'"
          >
            <img
              :src="p.factoryAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${p.avatarSeed}`"
              :alt="p.pseudo"
              class="w-full h-full"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-display font-semibold text-sm md:text-base truncate text-lol-grey-1 group-hover:text-lol-gold-1">
              {{ p.pseudo }}
            </div>
            <div class="text-[10px] uppercase tracking-widest text-lol-grey-2">
              + Inscrire à {{ game === 'lol' ? 'LoL' : 'Valorant' }}
            </div>
          </div>
          <div
            class="text-xl font-bold"
            :class="game === 'val' ? 'text-val-red' : 'text-lol-gold-2'"
          >+</div>
        </button>
      </div>
    </div>
  </div>
</template>
