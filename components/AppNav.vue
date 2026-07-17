<script setup lang="ts">
const route = useRoute()
const links = [
  { to: '/lol', label: 'LoL', game: 'lol' as const },
  { to: '/val', label: 'Valorant', game: 'val' as const },
  { to: '/admin', label: 'Admin', game: 'admin' as const },
]

const open = ref(false)
watch(
  () => route.path,
  () => (open.value = false),
)
</script>

<template>
  <header class="sticky top-0 z-50 backdrop-blur-md bg-lol-void/80 border-b border-lol-gold-6">
    <div class="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
      <NuxtLink to="/" class="flex items-center gap-3 group shrink-0">
        <div class="w-9 h-9 md:w-10 md:h-10 border border-lol-gold-3 rotate-45 flex items-center justify-center transition group-hover:border-lol-gold-1 group-hover:shadow-hex">
          <div class="w-3.5 h-3.5 md:w-4 md:h-4 bg-lol-gold-3 -rotate-45" />
        </div>
        <div>
          <div class="text-[9px] md:text-[10px] uppercase tracking-[0.4em] text-lol-gold-2">Factory</div>
          <div class="font-display font-bold text-xs md:text-sm text-lol-gold-1">Arena</div>
        </div>
      </NuxtLink>

      <!-- Desktop nav -->
      <nav class="hidden md:flex items-center gap-2 md:gap-3">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="relative w-11 h-11 flex items-center justify-center border transition group"
          :title="link.label"
          :class="route.path.startsWith(link.to)
            ? (link.game === 'val' ? 'border-val-red' : 'border-lol-gold-2')
            : 'border-lol-gold-6 hover:border-lol-gold-3'"
        >
          <!-- Admin icon: gear -->
          <svg v-if="link.game === 'admin'" viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="#C8AA6E" stroke-width="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <!-- LoL icon: hexagonal frame + sword -->
          <svg v-else-if="link.game === 'lol'" viewBox="0 0 40 40" class="w-6 h-6">
            <defs>
              <linearGradient id="navLol" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#F0E6D2" />
                <stop offset="100%" stop-color="#785A28" />
              </linearGradient>
            </defs>
            <path d="M20 3 L34 11 L34 29 L20 37 L6 29 L6 11 Z" fill="none" stroke="url(#navLol)" stroke-width="1.5"/>
            <line x1="20" y1="12" x2="20" y2="28" stroke="url(#navLol)" stroke-width="2" stroke-linecap="round"/>
            <line x1="15" y1="16" x2="25" y2="16" stroke="url(#navLol)" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <!-- Val icon: V logo -->
          <svg v-else viewBox="0 0 40 40" class="w-6 h-6">
            <path d="M6 8 L20 34 L34 8 L28 8 L20 26 L12 8 Z" fill="#FF4655"/>
            <path d="M15 8 L20 18 L25 8 L23 8 L20 14 L17 8 Z" fill="#ECE8E1"/>
          </svg>
          <span
            v-if="route.path.startsWith(link.to)"
            class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-px"
            :class="link.game === 'val' ? 'bg-val-red' : 'bg-lol-gold-2'"
          />
        </NuxtLink>
      </nav>

      <!-- Burger button -->
      <button
        class="md:hidden relative w-10 h-10 flex items-center justify-center border border-lol-gold-4 hover:border-lol-gold-2 transition"
        :aria-expanded="open"
        aria-label="Menu"
        @click="open = !open"
      >
        <span class="sr-only">Menu</span>
        <div class="w-5 h-4 flex flex-col justify-between">
          <span
            class="block h-px bg-lol-gold-2 transition-transform origin-left"
            :class="open ? 'rotate-45 translate-x-[2px]' : ''"
          />
          <span
            class="block h-px bg-lol-gold-2 transition-opacity"
            :class="open ? 'opacity-0' : 'opacity-100'"
          />
          <span
            class="block h-px bg-lol-gold-2 transition-transform origin-left"
            :class="open ? '-rotate-45 translate-x-[2px]' : ''"
          />
        </div>
      </button>
    </div>

    <!-- Mobile menu -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <nav
        v-if="open"
        class="md:hidden border-t border-lol-gold-6 bg-lol-void/95 backdrop-blur-md"
      >
        <div class="max-w-7xl mx-auto px-4 py-2 flex flex-col">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="px-3 py-3 text-sm uppercase tracking-widest transition border-b border-lol-gold-6/40 last:border-0 flex items-center gap-3"
            :class="route.path.startsWith(link.to)
              ? 'text-lol-gold-1 bg-lol-gold-6/20'
              : 'text-lol-grey-1 hover:text-lol-gold-2 hover:bg-lol-gold-6/10'"
          >
            <svg v-if="link.game === 'admin'" viewBox="0 0 24 24" class="w-5 h-5 shrink-0" fill="none" stroke="#C8AA6E" stroke-width="1.8">
              <circle cx="12" cy="12" r="3" />
            </svg>
            <svg v-else-if="link.game === 'lol'" viewBox="0 0 40 40" class="w-5 h-5 shrink-0">
              <path d="M20 3 L34 11 L34 29 L20 37 L6 29 L6 11 Z" fill="none" stroke="#C8AA6E" stroke-width="1.5"/>
              <line x1="20" y1="12" x2="20" y2="28" stroke="#C8AA6E" stroke-width="2" stroke-linecap="round"/>
              <line x1="15" y1="16" x2="25" y2="16" stroke="#C8AA6E" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg v-else viewBox="0 0 40 40" class="w-5 h-5 shrink-0">
              <path d="M6 8 L20 34 L34 8 L28 8 L20 26 L12 8 Z" fill="#FF4655"/>
            </svg>
            {{ link.label }}
          </NuxtLink>
        </div>
      </nav>
    </transition>
  </header>
</template>
