<script setup lang="ts">
defineProps<{
  game: 'lol' | 'val'
  title: string
  subtitle: string
  count: number
  total: number
}>()
</script>

<template>
  <div class="relative">
    <div
      class="absolute inset-0 opacity-10 pointer-events-none"
      :style="game === 'val'
        ? 'background: radial-gradient(circle at 50% 0%, #FF4655, transparent 60%)'
        : 'background: radial-gradient(circle at 50% 0%, #C89B3C, transparent 60%)'"
    />
    <div class="relative flex items-end justify-between gap-3 pb-6">
      <div class="min-w-0 flex-1">
        <div
          v-if="subtitle"
          class="text-[10px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.4em] mb-1 md:mb-2"
          :class="game === 'val' ? 'text-val-red' : 'text-lol-blue-2'"
        >
          {{ subtitle }}
        </div>
        <h2 class="lol-title text-2xl md:text-5xl font-black leading-tight">{{ title }}</h2>
      </div>
      <div class="text-right shrink-0">
        <div class="text-[9px] md:text-xs uppercase tracking-widest text-lol-grey-1">Invocateurs</div>
        <div
          class="font-display text-2xl md:text-3xl font-bold whitespace-nowrap"
          :class="game === 'val' ? 'text-val-red' : 'text-lol-gold-2'"
        >
          {{ count }}<span class="text-lol-grey-2 text-sm md:text-lg">/{{ total }}</span>
        </div>
      </div>
    </div>
    <div
      class="h-px"
      :class="game === 'val' ? 'val-accent' : ''"
      :style="game === 'lol' ? 'background: linear-gradient(90deg, transparent, #C89B3C, transparent)' : ''"
    />
  </div>
</template>
