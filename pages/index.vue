<script setup lang="ts">
import { usePlayersStore } from '~/composables/useStores'

const playersStore = usePlayersStore()
const lolCount = computed(() => playersStore.value.filter(p => p.lol.playing).length)
const valCount = computed(() => playersStore.value.filter(p => p.valorant.playing).length)
</script>

<template>
  <div class="relative min-h-[calc(100vh-73px)] overflow-hidden">
    <!-- Intro ribbon -->
    <div v-reveal class="relative z-10 text-center pt-14 pb-6 px-6">
      <div class="text-xs uppercase tracking-[0.5em] text-lol-blue-2 mb-3 animate-shimmer">
        Factory Arena · Édition 2026
      </div>
      <h1 class="lol-title text-3xl sm:text-5xl md:text-7xl font-black leading-tight md:leading-none px-2">
        Choisis ton champ de bataille
      </h1>
      <p class="mt-4 max-w-xl mx-auto text-lol-grey-1">
        Deux disciplines, un tournoi. Sélectionne le jeu pour rejoindre l'arène.
      </p>
    </div>

    <!-- Split panels -->
    <div class="relative z-10 flex flex-col md:flex-row max-w-7xl mx-auto px-6 gap-6 py-10">
      <!-- LoL panel -->
      <NuxtLink
        to="/lol"
        v-reveal="80"
        class="group relative flex-1 min-h-[520px] overflow-hidden border border-lol-gold-4 hover:border-lol-gold-2 transition"
      >
        <!-- Video background -->
        <div class="absolute inset-0 overflow-hidden">
          <video
            src="https://cmsassets.rgpub.io/sanity/files/dsfx7636/news/bbc27473157462adacf0de441a8796268eb2d0ac.mp4"
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
            autoplay muted loop playsinline preload="auto"
          />
          <div class="absolute inset-0 bg-lol-void/40 group-hover:bg-lol-void/20 transition-colors duration-500" />
          <div class="absolute inset-0 bg-gradient-to-t from-lol-void via-lol-void/40 to-transparent" />
        </div>

        <!-- Content -->
        <div class="relative h-full p-10 flex flex-col justify-between">
          <div class="flex items-start justify-between">
            <div class="text-[10px] uppercase tracking-[0.5em] text-lol-blue-2">Discipline I</div>
            <div class="text-right">
              <div class="text-[10px] uppercase tracking-widest text-lol-grey-1">Invocateurs</div>
              <div class="font-display text-3xl text-lol-gold-2 font-black">{{ lolCount }}</div>
            </div>
          </div>

          <!-- Icon center -->
          <div class="flex-1 flex flex-col items-center justify-center gap-8">
            <div class="relative">
              <div class="absolute inset-0 bg-lol-gold-3/30 blur-3xl group-hover:bg-lol-gold-2/50 transition-colors duration-500" />
              <svg viewBox="0 0 200 200" class="relative w-40 h-40 md:w-56 md:h-56 group-hover:scale-110 transition-transform duration-500">
                <defs>
                  <linearGradient id="lolIcon" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#F0E6D2" />
                    <stop offset="50%" stop-color="#C8AA6E" />
                    <stop offset="100%" stop-color="#785A28" />
                  </linearGradient>
                </defs>
                <path
                  d="M100 10 L180 55 L180 145 L100 190 L20 145 L20 55 Z"
                  fill="none"
                  stroke="url(#lolIcon)"
                  stroke-width="2"
                />
                <path
                  d="M100 40 L155 70 L155 130 L100 160 L45 130 L45 70 Z"
                  fill="none"
                  stroke="url(#lolIcon)"
                  stroke-width="1.5"
                />
                <!-- Sword -->
                <g stroke="url(#lolIcon)" stroke-width="3" stroke-linecap="round" fill="none">
                  <line x1="100" y1="70" x2="100" y2="130" />
                  <line x1="85" y1="85" x2="115" y2="85" />
                  <polygon points="100,60 105,72 100,75 95,72" fill="url(#lolIcon)" />
                </g>
              </svg>
            </div>

            <div class="text-center">
              <div class="text-[10px] uppercase tracking-[0.4em] text-lol-gold-2 mb-2">Faille de l'Invocateur</div>
              <div class="lol-title text-2xl md:text-3xl font-black leading-tight">
                League of Legends
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="text-xs uppercase tracking-widest text-lol-grey-1">
              5v5 · Summoner's Rift
            </div>
            <div class="text-xs uppercase tracking-widest text-lol-gold-2 group-hover:text-lol-gold-1">
              Entrer →
            </div>
          </div>
        </div>

        <!-- Corner ornaments -->
        <div class="absolute top-3 left-3 w-6 h-6 border-t border-l border-lol-gold-3" />
        <div class="absolute top-3 right-3 w-6 h-6 border-t border-r border-lol-gold-3" />
        <div class="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-lol-gold-3" />
        <div class="absolute bottom-3 right-3 w-6 h-6 border-b border-r border-lol-gold-3" />
      </NuxtLink>

      <!-- Valorant panel -->
      <NuxtLink
        to="/val"
        v-reveal="160"
        class="group relative flex-1 min-h-[520px] overflow-hidden border border-val-red/60 hover:border-val-red transition"
      >
        <!-- Video background -->
        <div class="absolute inset-0 overflow-hidden">
          <video
            src="https://cmsassets.rgpub.io/sanity/files/dsfx7636/news_live/74d9d9fd8664d1c431b4b82d007f968eacb3e8b4.mp4"
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
            autoplay muted loop playsinline preload="auto"
          />
          <div class="absolute inset-0 bg-val-dark/40 group-hover:bg-val-dark/20 transition-colors duration-500" />
          <div class="absolute inset-0 bg-gradient-to-t from-lol-void via-lol-void/40 to-transparent" />
        </div>

        <div class="relative h-full p-10 flex flex-col justify-between">
          <div class="flex items-start justify-between">
            <div class="text-[10px] uppercase tracking-[0.5em] text-val-red">Discipline II</div>
            <div class="text-right">
              <div class="text-[10px] uppercase tracking-widest text-lol-grey-1">Agents</div>
              <div class="font-display text-3xl text-val-red font-black">{{ valCount }}</div>
            </div>
          </div>

          <div class="flex-1 flex flex-col items-center justify-center gap-8">
            <div class="relative">
              <div class="absolute inset-0 bg-val-red/30 blur-3xl group-hover:bg-val-red/50 transition-colors duration-500" />
              <svg viewBox="0 0 200 200" class="relative w-40 h-40 md:w-56 md:h-56 group-hover:scale-110 transition-transform duration-500">
                <defs>
                  <linearGradient id="valIcon" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FF4655" />
                    <stop offset="100%" stop-color="#C8272C" />
                  </linearGradient>
                </defs>
                <!-- V logo simplified -->
                <path
                  d="M40 40 L100 160 L160 40 L140 40 L100 120 L60 40 Z"
                  fill="url(#valIcon)"
                />
                <path
                  d="M75 40 L100 90 L125 40 L115 40 L100 70 L85 40 Z"
                  fill="#ECE8E1"
                />
              </svg>
            </div>

            <div class="text-center">
              <div class="text-[10px] uppercase tracking-[0.4em] text-val-red mb-2">Protocole Radiant</div>
              <div class="lol-title text-2xl md:text-3xl font-black leading-tight" style="background: linear-gradient(180deg, #ECE8E1, #FF4655); -webkit-background-clip: text; background-clip: text; color: transparent;">
                Valorant
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="text-xs uppercase tracking-widest text-lol-grey-1">
              5v5 · Tactical FPS
            </div>
            <div class="text-xs uppercase tracking-widest text-val-red group-hover:text-val-cream">
              Entrer →
            </div>
          </div>
        </div>

        <div class="absolute top-3 left-3 w-6 h-6 border-t border-l border-val-red" />
        <div class="absolute top-3 right-3 w-6 h-6 border-t border-r border-val-red" />
        <div class="absolute bottom-3 left-3 w-6 h-6 border-b border-l border-val-red" />
        <div class="absolute bottom-3 right-3 w-6 h-6 border-b border-r border-val-red" />
      </NuxtLink>
    </div>

    <!-- Actions -->
    <div v-reveal="240" class="relative z-10 flex flex-wrap items-center justify-center gap-4 pb-16 px-6">
    </div>

    <!-- Background glow -->
    <div class="absolute inset-0 pointer-events-none opacity-40">
      <div class="absolute top-20 left-10 w-96 h-96 rounded-full bg-lol-blue-3 blur-3xl animate-float" />
      <div class="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-val-red blur-3xl opacity-30 animate-float" style="animation-delay: -2s" />
    </div>
  </div>
</template>
