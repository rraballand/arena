<script setup lang="ts">
const STORAGE_KEY = 'factory-arena:pact-signed'

const visible = ref(false)
const closing = ref(false)

onMounted(() => {
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTimeout(() => (visible.value = true), 600)
    }
  } catch {
    visible.value = true
  }
})

function sign() {
  closing.value = true
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
  } catch {}
  setTimeout(() => {
    visible.value = false
    closing.value = false
  }, 400)
}

function decline() {
  const cries = [
    'Le refus a été noté dans les Archives du Néant.',
    'Un corbeau vient de partir avec ton nom.',
    'Trop tard, le pacte est déjà scellé.',
    'Le silence des braves te juge.',
  ]
  alert(cries[Math.floor(Math.random() * cries.length)])
}
</script>

<template>
  <Teleport to="body">
    <transition name="pact">
      <div
        v-if="visible"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-lol-void/85"
        :class="{ 'pointer-events-none': closing }"
      >
        <!-- Runic circle backdrop -->
        <div class="absolute inset-0 pointer-events-none opacity-40">
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-lol-gold-4 animate-shimmer" />
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-lol-gold-4/60" style="animation-delay: -1s" />
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-lol-gold-4/40" />
        </div>

        <div class="hex-frame relative max-w-2xl w-full p-8 md:p-12 scanline shadow-hex-strong">
          <!-- Corner ornaments -->
          <div class="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-lol-gold-2" />
          <div class="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-lol-gold-2" />
          <div class="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-lol-gold-2" />
          <div class="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-lol-gold-2" />

          <div class="text-center mb-6">
            <div class="text-4xl mb-3 animate-float">⚔️</div>
            <div class="text-[10px] uppercase tracking-[0.5em] text-lol-blue-2">Serment sacré</div>
            <h2 class="lol-title text-4xl md:text-5xl font-black mt-2">Pacte des Invocateurs</h2>
          </div>

          <div class="ornament mb-6" />

          <div class="space-y-4 text-lol-gold-1 text-sm md:text-base leading-relaxed">
            <p>
              <span class="text-lol-gold-2 font-display text-lg">⚜</span>
              Toute inscription au <strong class="text-lol-gold-2">Factory Arena</strong> se fait
              <span class="italic text-lol-gold-2">sur l'honneur</span>, comme jadis les chevaliers
              scellaient leurs pactes autour d'une pinte tiède et d'un poulet rôti douteux.
            </p>
            <p>
              <span class="text-lol-gold-2 font-display text-lg">⚜</span>
              L'invocateur qui s'engage promet solennellement de : se pointer en Discord à l'heure,
              ne pas dodge la file après trois defeats, et ne pas blâmer le jungler
              <em class="text-lol-grey-1">(bon, ok, un peu, mais avec classe)</em>.
            </p>
            <p class="border-l-2 border-val-red pl-4 text-val-cream">
              <span class="text-val-red font-display text-lg">⚠</span>
              Toute désinscription tardive, no-show, ou <em>ghost</em> injustifié sera
              <strong class="text-val-red">vengé dans le sang et les larmes</strong> :
              humiliation publique en réunion team, pénalité Discord custom emote, et bannissement
              symbolique de la machine à café pendant 7 jours ouvrés.
            </p>
            <p class="text-lol-grey-1 text-xs italic text-center pt-2">
              — En cliquant ci-dessous, tu jures fidélité au tournoi, à tes coéquipiers, et à l'honneur d'InVivo Digital Factory. —
            </p>
          </div>

          <div class="ornament mt-6" />

          <div class="mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <button
              type="button"
              class="text-xs uppercase tracking-widest text-lol-grey-1 hover:text-lol-red transition"
              @click="decline"
            >
              Je préfère fuir dans la brume ↩
            </button>
            <button
              type="button"
              class="lol-btn text-base"
              @click="sign"
            >
              ⚔ Je le jure sur l'honneur
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.pact-enter-active,
.pact-leave-active {
  transition: opacity 0.4s ease;
}
.pact-enter-active .hex-frame,
.pact-leave-active .hex-frame {
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease;
}
.pact-enter-from,
.pact-leave-to {
  opacity: 0;
}
.pact-enter-from .hex-frame,
.pact-leave-to .hex-frame {
  transform: scale(0.7) rotateZ(-3deg);
  opacity: 0;
}
</style>
