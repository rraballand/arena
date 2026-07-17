<script setup lang="ts">
defineProps<{
  src: string
  poster?: string
  overlayClass?: string
}>()

onMounted(() => {
  document.documentElement.classList.add('video-bg-active')
  document.body.classList.add('video-bg-active')
})
onBeforeUnmount(() => {
  document.documentElement.classList.remove('video-bg-active')
  document.body.classList.remove('video-bg-active')
})
</script>

<template>
  <div class="fixed inset-0 z-0 overflow-hidden pointer-events-none">
    <video
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-auto h-auto object-cover"
      :src="src"
      :poster="poster"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
    />
    <div class="absolute inset-0 bg-lol-void/25" :class="overlayClass" />
  </div>
</template>

<style>
html.video-bg-active,
body.video-bg-active {
  background: transparent !important;
}
</style>
