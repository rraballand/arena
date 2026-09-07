<script setup lang="ts">
import {
  usePlayersStore,
  useMembersStore,
  fetchMembers,
  registerPlayer,
  avatarSrc,
  type FactoryMember,
} from '~/composables/useStores'

onMounted(fetchMembers)

const membersStore = useMembersStore()
const playersStore = usePlayersStore()

const alreadyVal = computed(
  () => new Set(
    playersStore.value
      .filter(p => p.valorant.playing)
      .map(p => p.factoryUsername)
      .filter(Boolean),
  ),
)

const availableMembers = computed(() =>
  membersStore.value.filter(m => !alreadyVal.value.has(m.username)),
)

const search = ref('')
const selectedMember = ref<FactoryMember | null>(null)
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (q.length < 2) return []
  return availableMembers.value
    .filter(m => m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q))
    .slice(0, 12)
})
function pick(m: FactoryMember) {
  selectedMember.value = m
  search.value = ''
}

const loading = ref(false)
const error = ref<string | null>(null)

async function submit() {
  error.value = null
  if (!selectedMember.value) {
    error.value = 'Sélectionne ton nom dans la Factory'
    return
  }
  loading.value = true
  try {
    registerPlayer({
      factoryUsername: selectedMember.value.username,
      pseudo: selectedMember.value.name,
      factoryName: selectedMember.value.name,
      factoryAvatar: selectedMember.value.avatar_url ?? undefined,
      game: 'val',
    })
    await navigateTo('/val')
  } catch (e: any) {
    error.value = e?.statusMessage || e?.data?.statusMessage || e?.message || 'Erreur inconnue'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 md:px-6 py-10 md:py-16">
    <div v-reveal class="text-center mb-8 md:mb-12">
      <div class="text-[10px] md:text-xs uppercase tracking-[0.4em] md:tracking-[0.5em] text-val-red mb-3 md:mb-4">Protocole Radiant</div>
      <h1 class="lol-title text-4xl md:text-6xl font-black" style="background: linear-gradient(180deg, #ECE8E1, #FF4655); -webkit-background-clip: text; background-clip: text; color: transparent;">Valorant</h1>
      <p class="mt-3 md:mt-4 text-lol-grey-1 max-w-xl mx-auto text-sm md:text-base">
        Identifie-toi via ta Factory pour t'inscrire.
      </p>
    </div>

    <form v-reveal="150" class="hex-frame p-5 md:p-12" @submit.prevent="submit">
      <div class="mb-6 md:mb-8">
        <h2 class="text-[10px] md:text-xs uppercase tracking-widest text-val-red mb-3 md:mb-4">Identité Factory</h2>

        <div v-if="selectedMember" class="hex-frame p-4 flex items-center gap-4">
          <img v-if="selectedMember.avatar_url" :src="avatarSrc(selectedMember.avatar_url)" :alt="selectedMember.name" class="w-14 h-14 md:w-16 md:h-16 border border-val-red/60 rounded-lg shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="font-display text-lg md:text-2xl text-val-cream truncate">{{ selectedMember.name }}</div>
          </div>
          <button type="button" class="text-[10px] md:text-xs uppercase tracking-widest text-lol-grey-1 hover:text-val-red shrink-0" @click="selectedMember = null">Changer</button>
        </div>
        <div v-else>
          <input
            v-model="search"
            type="text"
            placeholder="Tape ton nom..."
            class="w-full bg-lol-void border border-val-red/40 rounded-lg focus:border-val-red outline-none px-3 md:px-4 py-3 text-val-cream"
          />
          <div v-if="search.trim().length >= 2" class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 md:max-h-96 overflow-y-auto">
            <button
              v-for="m in filtered"
              :key="m.id"
              type="button"
              class="flex items-center gap-3 p-2 border border-val-red/40 rounded-lg hover:border-val-red hover:bg-val-red/10 transition text-left"
              @click="pick(m)"
            >
              <img v-if="m.avatar_url" :src="avatarSrc(m.avatar_url)" :alt="m.name" class="w-10 h-10 border border-val-red/40 rounded-lg shrink-0" />
              <div class="min-w-0 flex-1">
                <div class="font-display font-semibold text-val-cream truncate text-sm md:text-base">{{ m.name }}</div>
              </div>
            </button>
            <div v-if="!filtered.length" class="col-span-full text-center text-lol-grey-1 py-6 text-sm">Aucun membre trouvé</div>
          </div>
        </div>
      </div>

      <div v-if="error" class="mb-4 p-3 border border-lol-red/60 bg-lol-red/10 text-lol-red text-sm">{{ error }}</div>

      <div class="flex items-center justify-between gap-3">
        <NuxtLink to="/val" class="text-[10px] md:text-xs uppercase tracking-widest text-lol-grey-1 hover:text-val-red">← Retour</NuxtLink>
        <button type="submit" :disabled="loading" class="lol-btn disabled:opacity-40">
          {{ loading ? 'Invocation...' : 'Sceller le pacte' }}
        </button>
      </div>
    </form>
  </div>
</template>
