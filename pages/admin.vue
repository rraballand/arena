<script setup lang="ts">
import { usePlayersStore, useMatchesStore } from '~/composables/useStores'
import { useCurrentGame } from '~/composables/useCurrentGame'
import {
  useGitHubToken,
  pushToGitHub,
  pullFromGitHub,
} from '~/composables/useGitHubSync'

const currentGame = useCurrentGame()
currentGame.value = 'lol'

const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()

const message = ref<string | null>(null)

// --- GitHub sync ---
const token = useGitHubToken()
const showToken = ref(false)
const pushing = ref(false)
const pulling = ref(false)

async function push() {
  pushing.value = true
  message.value = null
  try {
    await pushToGitHub()
    message.value = 'Push GitHub OK.'
  } catch (e: any) {
    message.value = `Erreur push : ${e.message}`
  } finally {
    pushing.value = false
  }
}

async function pull() {
  if (!confirm("Écraser l'état local avec la version distante ?")) return
  pulling.value = true
  message.value = null
  try {
    await pullFromGitHub()
    message.value = 'Pull GitHub OK.'
  } catch (e: any) {
    message.value = `Erreur pull : ${e.message}`
  } finally {
    pulling.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-16">
    <div v-reveal class="text-center mb-8">
      <div class="text-[10px] uppercase tracking-[0.5em] text-lol-blue-2 mb-3">Administration</div>
      <h1 class="lol-title text-4xl md:text-6xl font-black">Backup</h1>
      <p class="mt-3 text-lol-grey-1 text-sm">
        Données stockées dans ton navigateur. Sync avec GitHub, export local, ou reset.
      </p>
    </div>

    <div v-reveal="80" class="hex-frame p-5 md:p-8">
      <!-- Stats -->
      <div class="grid grid-cols-2 gap-4 text-center mb-6">
        <div>
          <div class="font-display text-3xl text-lol-gold-2">{{ playersStore.length }}</div>
          <div class="text-[10px] uppercase tracking-widest text-lol-grey-1">Joueurs</div>
        </div>
        <div>
          <div class="font-display text-3xl text-lol-gold-2">{{ matchesStore.length }}</div>
          <div class="text-[10px] uppercase tracking-widest text-lol-grey-1">Matches</div>
        </div>
      </div>

      <div class="ornament my-6" />

      <!-- GitHub token -->
      <div class="mb-4">
        <div class="text-[10px] uppercase tracking-widest text-lol-gold-2 mb-2">Token GitHub (PAT)</div>
        <form autocomplete="on" @submit.prevent>
          <input
            type="text"
            name="username"
            value="arena-github"
            autocomplete="username"
            class="hidden"
            readonly
          />
          <div class="flex items-center gap-2">
            <input
              v-model="token"
              :type="showToken ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              placeholder="github_pat_..."
              class="flex-1 bg-lol-void border border-lol-gold-6 focus:border-lol-gold-3 outline-none px-3 py-2 text-lol-gold-1 text-xs font-mono"
            />
            <button
              type="button"
              class="text-lol-grey-1 hover:text-lol-gold-2 text-xs uppercase"
              @click="showToken = !showToken"
            >{{ showToken ? 'Cacher' : 'Voir' }}</button>
          </div>
        </form>
        <p class="mt-2 text-lol-grey-2 text-[10px]">
          Fine-grained PAT scope <em>Contents Read/Write</em> sur repo
          <code>arena</code> ·
          <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" class="text-lol-blue-2 underline">créer</a>
        </p>
      </div>

      <!-- Actions -->
      <div class="grid grid-cols-2 gap-3">
        <button
          class="lol-btn justify-center"
          :disabled="!token || pushing || pulling"
          @click="push"
        >
          <span
            v-if="pushing"
            class="inline-block w-4 h-4 border-2 border-lol-gold-2 border-t-transparent rounded-full animate-spin"
          />
          <span v-else>↑ Sauvegarde</span>
        </button>
        <button
          class="lol-btn justify-center"
          :disabled="!token || pushing || pulling"
          @click="pull"
        >
          <span
            v-if="pulling"
            class="inline-block w-4 h-4 border-2 border-lol-gold-2 border-t-transparent rounded-full animate-spin"
          />
          <span v-else>↓ Restore</span>
        </button>
      </div>

      <div v-if="message" class="mt-6 p-3 border border-lol-blue-2/60 bg-lol-blue-2/10 text-lol-blue-2 text-sm">
        {{ message }}
      </div>

    </div>
  </div>
</template>
