<script setup lang="ts">
import { rankColors } from '~/data/players'
import { rankIcon } from '~/composables/useRanks'

const props = defineProps<{ rank?: string; game?: 'lol' | 'val'; size?: 'sm' | 'md' | 'lg' }>()
const color = computed(() => (props.rank ? rankColors[props.rank] || '#5B5A56' : '#5B5A56'))
const icon = computed(() => (props.game ? rankIcon(props.rank, props.game) : null))
const iconSize = computed(() =>
  props.size === 'lg' ? 'w-8 h-8' : props.size === 'sm' ? 'w-4 h-4' : 'w-5 h-5',
)
</script>

<template>
  <div
    class="rank-chip"
    :style="{ color: color, borderColor: color, boxShadow: `0 0 12px ${color}40` }"
  >
    <img
      v-if="icon"
      :src="icon"
      :alt="rank"
      class="shrink-0 -ml-1"
      :class="iconSize"
      loading="lazy"
    />
    <span v-else class="w-1.5 h-1.5 rounded-full" :style="{ background: color }" />
    {{ rank || 'UNRANKED' }}
  </div>
</template>
