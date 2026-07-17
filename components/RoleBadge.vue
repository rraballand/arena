<script setup lang="ts">
const props = defineProps<{ role?: string; game: 'lol' | 'val' }>()

const icons: Record<string, string> = {
  TOP: '⚔', JUNGLE: '🌿', MID: '✦', ADC: '➤', SUPPORT: '✚', FILL: '◈',
  DUELIST: '⚡', INITIATOR: '☄', CONTROLLER: '☁', SENTINEL: '🛡', FLEX: '◈',
}

const label = props.role || '—'
const icon = props.role ? (icons[props.role] || '◆') : '·'
</script>

<template>
  <div
    class="flex items-center gap-2 px-3 py-1.5 border text-[11px] font-bold uppercase tracking-widest"
    :class="game === 'val'
      ? 'border-val-red/60 text-val-red bg-val-red/5'
      : 'border-lol-gold-4 text-lol-gold-2 bg-lol-gold-6/20'"
  >
    <span class="text-base leading-none">{{ icon }}</span>
    <span>{{ label }}</span>
  </div>
</template>
