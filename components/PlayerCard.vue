<script setup lang="ts">
import type { Player } from '~/data/players'
import { leavePlayerGame, toggleArchivePlayer } from '~/composables/useStores'

const props = defineProps<{ player: Player; game: 'lol' | 'val'; deletable?: boolean }>()
const emit = defineEmits<{
  (e: 'deleted', id: number): void
  (e: 'archived', id: number, archived: boolean): void
}>()

const avatarUrl = computed(
  () =>
    props.player.factoryAvatar ||
    `https://api.dicebear.com/9.x/adventurer/svg?seed=${props.player.avatarSeed}&backgroundType=gradientLinear&backgroundColor=091428,463714,0A323C`,
)

const isArchived = computed(() => props.player.archived === true)

function handleDelete() {
  const label = props.game === 'lol' ? 'LoL' : 'Valorant'
  if (!confirm(`Retirer ${props.player.pseudo} du roster ${label} ?`)) return
  leavePlayerGame(props.player.id, props.game)
  emit('deleted', props.player.id)
}

function toggleShadow() {
  const next = !isArchived.value
  toggleArchivePlayer(props.player.id, next)
  emit('archived', props.player.id, next)
}
</script>

<template>
  <div
    class="hex-frame relative p-3 group"
    :class="{ 'opacity-50 grayscale hover:opacity-80': isArchived }"
  >
    <div class="absolute top-1 right-1 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition">
      <button
        type="button"
        class="w-6 h-6 flex items-center justify-center text-xs border border-transparent transition"
        :class="isArchived
          ? 'text-lol-blue-2 hover:border-lol-blue-2/60'
          : 'text-lol-grey-2 hover:text-lol-blue-2 hover:border-lol-blue-2/60'"
        :title="isArchived ? 'Ré-activer' : 'Mettre en shadow (indisponible ce soir)'"
        @click.stop.prevent="toggleShadow"
      >
        {{ isArchived ? '☀' : '☾' }}
      </button>
      <button
        v-if="deletable"
        type="button"
        class="w-6 h-6 flex items-center justify-center text-lol-grey-2 hover:text-lol-red border border-transparent hover:border-lol-red/60 transition text-xs"
        title="Retirer du roster"
        @click.stop.prevent="handleDelete"
      >
        ✕
      </button>
    </div>

    <div
      class="absolute top-0 left-0 w-3 h-3 border-t border-l"
      :class="game === 'val' ? 'border-val-red' : 'border-lol-gold-3'"
    />
    <div
      class="absolute top-0 right-0 w-3 h-3 border-t border-r"
      :class="game === 'val' ? 'border-val-red' : 'border-lol-gold-3'"
    />
    <div
      class="absolute bottom-0 left-0 w-3 h-3 border-b border-l"
      :class="game === 'val' ? 'border-val-red' : 'border-lol-gold-3'"
    />
    <div
      class="absolute bottom-0 right-0 w-3 h-3 border-b border-r"
      :class="game === 'val' ? 'border-val-red' : 'border-lol-gold-3'"
    />

    <div class="flex items-center gap-3">
      <div
        class="w-10 h-10 shrink-0 overflow-hidden rounded-lg border"
        :class="game === 'val' ? 'border-val-red/60' : 'border-lol-gold-4'"
      >
        <img :src="avatarUrl" :alt="player.pseudo" class="w-full h-full" />
      </div>
      <div class="flex-1 min-w-0">
        <h3
          class="font-display text-sm md:text-base font-bold truncate"
          :class="game === 'val' ? 'text-val-cream' : 'text-lol-gold-1'"
        >
          {{ player.pseudo }}
        </h3>
        <div v-if="isArchived" class="text-[9px] uppercase tracking-widest text-lol-blue-2">
          ☾ Shadow · indispo ce soir
        </div>
      </div>
    </div>
  </div>
</template>
