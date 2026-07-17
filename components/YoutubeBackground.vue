<script setup lang="ts">
const props = defineProps<{
  videoId: string
  playlistId?: string
  overlayClass?: string
}>()

const src = computed(() => {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    modestbranding: '1',
    playsinline: '1',
    rel: '0',
    showinfo: '0',
    iv_load_policy: '3',
    disablekb: '1',
    loop: '1',
  })
  if (props.playlistId) {
    params.set('list', props.playlistId)
    params.set('listType', 'playlist')
  } else {
    params.set('playlist', props.videoId)
  }
  return `https://www.youtube-nocookie.com/embed/${props.videoId}?${params.toString()}`
})

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
    <div class="absolute w-[177.77vh] min-w-full h-[56.25vw] min-h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <iframe
        :src="src"
        class="w-full h-full pointer-events-none"
        frameborder="0"
        allow="autoplay; encrypted-media; fullscreen"
        allowfullscreen
      />
    </div>
    <div class="absolute inset-0 bg-lol-void/40" :class="overlayClass" />
  </div>
</template>
