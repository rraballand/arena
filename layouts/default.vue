<script setup lang="ts">
import { GAME_VIDEO, useCurrentGame } from '~/composables/useCurrentGame'

const currentGame = useCurrentGame()
const route = useRoute()
const videoCfg = computed(() => (currentGame.value ? GAME_VIDEO[currentGame.value] : null))
const showYoutube = computed(() => !videoCfg.value && route.path !== '/')
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <VideoBackground
      v-if="videoCfg"
      :src="videoCfg.src"
      :overlay-class="videoCfg.overlay"
    />
    <YoutubeBackground
      v-else-if="showYoutube"
      video-id="x1L36tESjzw"
      playlist-id="PLag05PLn5hyj-e2QszetayhIwJH7uwrE_"
      overlay-class="bg-gradient-to-b from-lol-void/60 via-lol-void/30 to-lol-void/85"
    />
    <AppNav />
    <PactConsent />
    <main class="flex-1 relative z-10">
      <slot />
    </main>
    <footer class="border-t border-lol-gold-6 mt-16 relative z-10">
      <div class="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs uppercase tracking-widest text-lol-grey-1">
        <div>Factory Arena · 2026</div>
        <div>Non affilié à Riot Games</div>
      </div>
    </footer>
  </div>
</template>
