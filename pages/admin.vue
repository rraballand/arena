<script setup lang="ts">
import { usePlayersStore, useMatchesStore } from '~/composables/useStores'
import { useCurrentGame } from '~/composables/useCurrentGame'
import {
  useGitHubToken,
  pushToGitHub,
  pullFromGitHub,
} from '~/composables/useGitHubSync'

const currentGame = useCurrentGame()
currentGame.value = null

const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()

const importText = ref('')
const message = ref<string | null>(null)

function exportJson() {
  const payload = {
    players: playersStore.value,
    matches: matchesStore.value,
    exportedAt: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `factory-arena-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importJson() {
  try {
    const data = JSON.parse(importText.value)
    if (data.players) playersStore.value = data.players
    if (data.matches) matchesStore.value = data.matches
    message.value = 'Import réussi.'
    importText.value = ''
  } catch (e: any) {
    message.value = `Erreur JSON : ${e.message}`
  }
}

function resetAll() {
  if (!confirm('Effacer TOUTES les données locales (joueurs + matches) ?')) return
  playersStore.value = []
  matchesStore.value = []
  message.value = 'Tout effacé.'
}

// --- GitHub sync ---
const token = useGitHubToken()
const showToken = ref(false)
const syncMsg = ref<string | null>(null)
const syncLoading = ref(false)

async function push() {
  syncLoading.value = true
  syncMsg.value = null
  try {
    await pushToGitHub()
    syncMsg.value = 'Push GitHub OK.'
  } catch (e: any) {
    syncMsg.value = `Erreur push : ${e.message}`
  } finally {
    syncLoading.value = false
  }
}

async function pull() {
  if (!confirm("Écraser l'état local avec la version distante ?")) return
  syncLoading.value = true
  syncMsg.value = null
  try {
    await pullFromGitHub()
    syncMsg.value = 'Pull GitHub OK.'
  } catch (e: any) {
    syncMsg.value = `Erreur pull : ${e.message}`
  } finally {
    syncLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-16">
    <div v-reveal class="text-center mb-8">
      <div class="text-[10px] uppercase tracking-[0.5em] text-lol-blue-2 mb-3">Administration</div>
      <h1 class="lol-title text-4xl md:text-6xl font-black">Backup</h1>
      <p class="mt-3 text-lol-grey-1 text-sm">
        Données stockées dans ton navigateur. Exporte pour sauvegarder, importe pour restaurer,
        ou sync avec GitHub.
      </p>
    </div>

    <div v-reveal="80" class="hex-frame p-5 md:p-8 mb-6">
      <h2 class="text-[10px] uppercase tracking-widest text-lol-gold-2 mb-4">État courant</h2>
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
      <div class="flex flex-wrap gap-3">
        <button class="lol-btn" @click="exportJson">↓ Exporter</button>
        <button class="lol-btn" @click="resetAll">↺ Tout effacer</button>
      </div>
    </div>

    <div v-reveal="120" class="hex-frame p-5 md:p-8 mb-6">
      <h2 class="text-[10px] uppercase tracking-widest text-lol-gold-2 mb-4">Sync GitHub</h2>
      <p class="text-lol-grey-1 text-xs mb-3">
        Push/pull l'état vers <code>backups/state.json</code> du repo <code>arena</code>.
        Nécessite un
        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" class="text-lol-blue-2 underline">
          fine-grained PAT
        </a>
        avec scope <em>Repository contents: Read and Write</em> sur le repo.
      </p>
      <form autocomplete="on" @submit.prevent>
        <input
          type="text"
          name="username"
          value="arena-github"
          autocomplete="username"
          class="hidden"
          readonly
        />
        <div class="flex items-center gap-2 mb-4">
          <input
            v-model="token"
            :type="showToken ? 'text' : 'password'"
            name="password"
            autocomplete="current-password"
            placeholder="Colle ton PAT ici (github_pat_...)"
            class="flex-1 bg-lol-void border border-lol-gold-6 focus:border-lol-gold-3 outline-none px-3 py-2 text-lol-gold-1 text-xs font-mono"
          />
          <button
            type="button"
            class="text-lol-grey-1 hover:text-lol-gold-2 text-xs uppercase"
            @click="showToken = !showToken"
          >{{ showToken ? 'Cacher' : 'Voir' }}</button>
        </div>
      </form>
      <div class="flex flex-wrap gap-3">
        <button class="lol-btn" :disabled="!token || syncLoading" @click="push">
          {{ syncLoading ? '...' : '↑ Push GitHub' }}
        </button>
        <button class="lol-btn" :disabled="!token || syncLoading" @click="pull">
          {{ syncLoading ? '...' : '↓ Pull GitHub' }}
        </button>
      </div>
      <div v-if="syncMsg" class="mt-4 p-3 border border-lol-blue-2/60 bg-lol-blue-2/10 text-lol-blue-2 text-sm">
        {{ syncMsg }}
      </div>
    </div>

    <div v-reveal="160" class="hex-frame p-5 md:p-8">
      <h2 class="text-[10px] uppercase tracking-widest text-lol-gold-2 mb-4">Importer un backup</h2>
      <textarea
        v-model="importText"
        rows="8"
        placeholder="Colle le contenu JSON..."
        class="w-full bg-lol-void border border-lol-gold-6 focus:border-lol-gold-3 outline-none px-3 py-3 text-lol-gold-1 text-xs font-mono"
      />
      <div class="mt-3 flex gap-3">
        <button class="lol-btn" :disabled="!importText.trim()" @click="importJson">↑ Importer</button>
      </div>
      <div v-if="message" class="mt-4 p-3 border border-lol-blue-2/60 bg-lol-blue-2/10 text-lol-blue-2 text-sm">
        {{ message }}
      </div>
    </div>
  </div>
</template>
