<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

<template>
  <div class="flex items-center justify-center gap-4 my-8">
    <div class="ornament flex-1 max-w-xs" />
    <div v-if="label" class="flex items-center gap-3">
      <span class="text-lol-gold-2 text-2xl leading-none">◆</span>
      <span class="lol-title text-sm md:text-base">{{ label }}</span>
      <span class="text-lol-gold-2 text-2xl leading-none">◆</span>
    </div>
    <div v-else class="text-lol-gold-3 text-xl">◆</div>
    <div class="ornament flex-1 max-w-xs" />
  </div>
</template>
