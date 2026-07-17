<script setup lang="ts">
const props = defineProps<{ game: 'lol' | 'val' }>()
const route = useRoute()

const items = computed(() => [
  { to: `/${props.game}`, label: 'Roster' },
  { to: `/${props.game}/bracket`, label: 'Bracket' },
  { to: `/${props.game}/leaderboard`, label: 'Classement' },
])
</script>

<template>
  <div class="mt-6 flex flex-wrap items-center gap-2 md:gap-3 border-b border-lol-gold-6/40 pb-4">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="px-4 py-2 text-xs uppercase tracking-widest transition"
      :class="route.path === item.to
        ? (game === 'val'
            ? 'text-val-red border-b-2 border-val-red -mb-4 pb-4'
            : 'text-lol-gold-1 border-b-2 border-lol-gold-2 -mb-4 pb-4')
        : 'text-lol-grey-1 hover:text-lol-gold-2'"
    >
      {{ item.label }}
    </NuxtLink>
  </div>
</template>
