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
        class="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4 backdrop-blur-md bg-lol-void/85 overflow-y-auto"
        :class="{ 'pointer-events-none': closing }"
      >
        <!-- Runic circle backdrop -->
        <div class="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[900px] h-[600px] md:h-[900px] rounded-full border border-lol-gold-4 animate-shimmer" />
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] md:w-[700px] h-[450px] md:h-[700px] rounded-full border border-lol-gold-4/60" style="animation-delay: -1s" />
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full border border-lol-gold-4/40" />
        </div>

        <div class="hex-frame relative max-w-2xl w-full max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-5 md:p-12 scanline shadow-hex-strong my-auto">
          <!-- Corner ornaments -->
          <div class="absolute top-2 left-2 w-5 h-5 md:w-6 md:h-6 border-t-2 border-l-2 border-lol-gold-2" />
          <div class="absolute top-2 right-2 w-5 h-5 md:w-6 md:h-6 border-t-2 border-r-2 border-lol-gold-2" />
          <div class="absolute bottom-2 left-2 w-5 h-5 md:w-6 md:h-6 border-b-2 border-l-2 border-lol-gold-2" />
          <div class="absolute bottom-2 right-2 w-5 h-5 md:w-6 md:h-6 border-b-2 border-r-2 border-lol-gold-2" />

          <div class="text-center mb-4 md:mb-6">
            <div class="text-3xl md:text-4xl mb-2 md:mb-3 animate-float">⚔️</div>
            <div class="text-[9px] md:text-[10px] uppercase tracking-[0.35em] md:tracking-[0.5em] text-lol-blue-2">Serment sacré</div>
            <h2 class="lol-title text-2xl md:text-5xl font-black mt-2">Pacte des Invocateurs</h2>
          </div>

          <div class="ornament mb-4 md:mb-6" />

          <div class="space-y-3 md:space-y-4 text-lol-gold-1 text-xs md:text-base leading-relaxed">
            <p>
              <span class="text-lol-gold-2 font-display text-base md:text-lg">⚜</span>
              Toute inscription au <strong class="text-lol-gold-2">Factory Arena</strong> se fait
              <span class="italic text-lol-gold-2">sur l'honneur</span>, comme jadis les chevaliers
              scellaient leurs pactes autour d'une pinte tiède et d'un poulet rôti douteux.
            </p>
            <p>
              <span class="text-lol-gold-2 font-display text-base md:text-lg">⚜</span>
              L'invocateur qui s'engage promet solennellement de : débarquer à l'heure,
              ne pas fuir après trois defeats, et ne pas blâmer le jungler
              <em class="text-lol-grey-1">(bon, ok, un peu, mais avec classe)</em>.
            </p>
            <p class="border-l-2 border-val-red pl-3 md:pl-4 text-val-cream">
              <span class="text-val-red font-display text-base md:text-lg">⚠</span>
              Toute désinscription tardive, no-show, ou <em>ghost</em> injustifié sera
              <strong class="text-val-red">vengé dans le sang et les larmes</strong> :
              humiliation publique en réunion team, tournée générale offerte, et bannissement
              symbolique de la machine à café pendant 7 jours ouvrés.
            </p>
            <p class="text-lol-grey-1 text-[11px] md:text-xs italic text-center pt-1 md:pt-2">
              — En cliquant ci-dessous, tu jures fidélité au tournoi, à tes coéquipiers, et à l'honneur d'InVivo Digital Factory. —
            </p>
          </div>

          <div class="ornament mt-4 md:mt-6" />

          <div class="mt-5 md:mt-8 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <button
              type="button"
              class="text-xs uppercase tracking-widest text-lol-grey-1 hover:text-lol-red transition"
              @click="decline"
            >
              Je préfère fuir dans la brume ↩
            </button>
            <button
              type="button"
              class="lol-btn w-full md:w-auto justify-center text-sm md:text-base"
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
