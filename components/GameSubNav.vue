<script setup lang="ts">
const props = defineProps<{ game: 'lol' | 'val' }>()
const route = useRoute()

const items = computed(() => [
  { to: `/${props.game}`, label: 'Roster' },
  { to: `/${props.game}/bracket`, label: 'Tournois' },
  { to: `/${props.game}/leaderboard`, label: 'Classement' },
])
</script>

<template>
  <div class="mt-6 flex flex-wrap items-center gap-2 md:gap-3 pb-2">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="px-4 py-2 text-xs uppercase tracking-widest transition relative"
      :class="route.path === item.to
        ? (game === 'val' ? 'text-val-red' : 'text-lol-gold-1')
        : 'text-lol-grey-1 hover:text-lol-gold-2'"
    >
      {{ item.label }}
      <span
        v-if="route.path === item.to"
        class="absolute left-2 right-2 -bottom-0.5 h-px"
        :class="game === 'val' ? 'bg-val-red' : 'bg-lol-gold-2'"
      />
    </NuxtLink>
    <div v-if="$slots.actions" class="ml-auto flex items-center gap-2 md:gap-3">
      <slot name="actions" />
    </div>
  </div>
</template>
