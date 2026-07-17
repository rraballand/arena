<script setup lang="ts">
import { rankColors } from '~/data/players'
import { rankIcon } from '~/composables/useRanks'

const props = defineProps<{
  game: 'lol' | 'val'
  ranks: readonly string[]
  modelValue: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

function pick(r: string) {
  emit('update:modelValue', r)
}
</script>

<template>
  <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 md:gap-3">
    <button
      v-for="r in ranks"
      :key="r"
      type="button"
      class="group relative flex flex-col items-center gap-1 p-2 md:p-3 border transition"
      :class="modelValue === r
        ? (game === 'val'
            ? 'border-val-red bg-val-red/10 shadow-hex'
            : 'border-lol-gold-2 bg-lol-gold-6/30 shadow-hex')
        : 'border-lol-gold-6/60 hover:border-lol-gold-3'"
      :style="modelValue === r ? { boxShadow: `0 0 20px ${rankColors[r] || '#5B5A56'}55` } : {}"
      @click="pick(r)"
    >
      <img
        v-if="rankIcon(r, game)"
        :src="rankIcon(r, game)!"
        :alt="r"
        class="w-10 h-10 md:w-12 md:h-12"
        loading="lazy"
      />
      <div
        v-else
        class="w-10 h-10 md:w-12 md:h-12 border border-dashed border-lol-grey-2 flex items-center justify-center text-lol-grey-1 text-xs"
      >
        ?
      </div>
      <div
        class="text-[9px] md:text-[10px] uppercase tracking-widest font-semibold text-center"
        :style="{ color: rankColors[r] || '#A09B8C' }"
      >
        {{ r }}
      </div>
    </button>
  </div>
</template>
