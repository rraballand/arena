<script setup lang="ts">
import type { MatchTeam, Outcome } from '~/composables/useStores'
import type { Player } from '~/data/players'

const props = defineProps<{
  team: MatchTeam
  game: 'lol' | 'val'
  power: number
  outcome: Outcome | null
  side: 'A' | 'B'
  playerById: (id: number) => Player | undefined
}>()

const isWinner = computed(() => props.outcome === props.side)
const isLoser = computed(() => props.outcome !== null && props.outcome !== 'D' && props.outcome !== props.side)
const isDraw = computed(() => props.outcome === 'D')
const emptySlots = computed(() =>
  Math.max(0, (props.team.slots ?? props.team.playerIds.length) - props.team.playerIds.length),
)
const isPlaceholder = computed(() => props.team.playerIds.length === 0)

const accent = computed(() => (props.game === 'val' ? 'val-red' : 'lol-gold-2'))

/**
 * Split team name so it renders on 2 or 3 lines.
 * Pattern generally "Les {NOUN} {ADJ}" → 3 words → 3 lines.
 * 2 words → 2 lines. 4+ words → group last two on the last line.
 */
const nameLines = computed<string[]>(() => {
  const words = props.team.name.trim().split(/\s+/)
  if (words.length <= 1) return words
  if (words.length === 2) return words
  if (words.length === 3) return words
  return [words[0], words.slice(1, -1).join(' '), words[words.length - 1]]
})

const revealed = ref<Set<number>>(new Set())
function toggleReveal(pid: number) {
  const next = new Set(revealed.value)
  if (next.has(pid)) next.delete(pid)
  else next.add(pid)
  revealed.value = next
}
</script>

<template>
  <div
    class="relative rounded-xl border p-3 md:p-4 transition-all duration-300 bg-gradient-to-br"
    :class="[
      isWinner
        ? game === 'val'
          ? 'border-val-red from-val-red/15 to-lol-void shadow-[0_0_24px_-6px_rgba(255,70,85,0.6)]'
          : 'border-lol-gold-2 from-lol-gold-6/25 to-lol-void shadow-[0_0_24px_-6px_rgba(200,155,60,0.7)]'
        : isLoser
          ? 'border-lol-gold-6/40 from-lol-void/50 to-lol-void grayscale-[0.4]'
          : 'border-lol-gold-6 from-lol-void/60 to-lol-void',
    ]"
  >
    <!-- accent stripe -->
    <div
      class="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
      :class="isWinner
        ? (game === 'val' ? 'bg-val-red' : 'bg-lol-gold-2')
        : 'bg-gradient-to-r from-transparent via-lol-gold-6 to-transparent'"
    />

    <!-- crown / status ribbon -->
    <div v-if="outcome" class="absolute -top-2.5 left-3 px-1.5 py-0.5 bg-lol-void text-[9px] uppercase tracking-[0.3em] font-display border rounded"
      :class="isWinner
        ? (game === 'val' ? 'text-val-red border-val-red' : 'text-lol-gold-2 border-lol-gold-2')
        : isDraw ? 'text-lol-blue-2 border-lol-blue-2' : 'text-lol-grey-2 border-lol-gold-6/60'">
      <span v-if="isWinner">♛ Vainqueur</span>
      <span v-else-if="isDraw">Nul</span>
      <span v-else>Défaite</span>
    </div>

    <!-- header: name + power inline -->
    <div class="mb-3 mt-0.5">
      <div class="flex items-baseline gap-2 flex-wrap">
        <div
          class="font-display text-base md:text-lg font-bold leading-tight flex-1 min-w-0"
          :class="game === 'val' ? 'text-val-cream' : 'text-lol-gold-1'"
        >
          <span v-for="(line, i) in nameLines" :key="i" class="block truncate">{{ line }}</span>
        </div>
        <div class="flex items-baseline gap-1 shrink-0">
          <span class="font-mono font-bold text-base leading-none" :class="`text-${accent}`">{{ power }}</span>
          <span class="text-[8px] uppercase tracking-[0.2em] text-lol-grey-2">pwr</span>
        </div>
      </div>
    </div>

    <!-- avatars row -->
    <div v-if="isPlaceholder" class="text-[10px] uppercase tracking-widest text-lol-grey-2 italic">
      En attente d'adversaire
    </div>
    <div v-else class="flex items-center">
      <div class="flex -space-x-2">
        <button
          v-for="pid in team.playerIds"
          :key="`av-${side}-${pid}`"
          type="button"
          class="group relative focus:outline-none focus:ring-2 focus:ring-lol-gold-2 rounded-full"
          :title="playerById(pid)?.pseudo || `#${pid}`"
          :aria-label="playerById(pid)?.pseudo || `#${pid}`"
          @click="toggleReveal(pid)"
        >
          <img
            v-if="playerById(pid)?.factoryAvatar"
            :src="playerById(pid)?.factoryAvatar"
            :alt="playerById(pid)?.pseudo"
            class="w-10 h-10 rounded-full border-2 border-lol-void ring-1 ring-lol-gold-6 object-cover transition-transform group-hover:scale-110 group-hover:z-10"
          />
          <div
            v-else
            class="w-10 h-10 rounded-full border-2 border-lol-void ring-1 ring-lol-gold-6 bg-lol-void flex items-center justify-center text-[10px] font-mono text-lol-gold-2 transition-transform group-hover:scale-110 group-hover:z-10"
          >?</div>
          <span
            class="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-7 whitespace-nowrap px-2 py-0.5 text-[10px] uppercase tracking-widest bg-lol-void border border-lol-gold-6 rounded text-lol-gold-1 opacity-0 transition-opacity duration-150 z-20 group-hover:opacity-100 group-focus:opacity-100"
            :class="{ 'opacity-100': revealed.has(pid) }"
          >{{ playerById(pid)?.pseudo || `#${pid}` }}</span>
        </button>
        <div
          v-for="n in emptySlots"
          :key="`av-empty-${side}-${n}`"
          class="w-10 h-10 rounded-full border-2 border-dashed border-lol-gold-6/40 bg-lol-void/50 flex items-center justify-center text-lol-grey-2 text-xs"
          title="Slot vide"
        >+</div>
      </div>
    </div>
  </div>
</template>
