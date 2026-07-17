<script setup lang="ts">
import {
  usePlayersStore,
  useMembersStore,
  fetchMembers,
  registerPlayer,
  crossRegisterPlayer,
  type FactoryMember,
} from '~/composables/useStores'

const props = defineProps<{ game: 'lol' | 'val' }>()

onMounted(fetchMembers)
const membersStore = useMembersStore()
const playersStore = usePlayersStore()

const search = ref('')

const alreadyInGame = computed(
  () => new Set(
    playersStore.value
      .filter(p => (props.game === 'lol' ? p.lol.playing : p.valorant.playing))
      .map(p => p.factoryUsername)
      .filter(Boolean) as string[],
  ),
)

const candidates = computed<FactoryMember[]>(() => {
  const q = search.value.trim().toLowerCase()
  if (q.length < 2) return []
  return membersStore.value
    .filter(m => !alreadyInGame.value.has(m.username))
    .filter(m => m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q))
    .slice(0, 6)
})

function pick(m: FactoryMember) {
  const existing = playersStore.value.find(p => p.factoryUsername === m.username)
  if (existing) {
    crossRegisterPlayer(existing.id, props.game)
  } else {
    registerPlayer({
      factoryUsername: m.username,
      pseudo: m.name,
      factoryName: m.name,
      factoryAvatar: m.avatar_url ?? undefined,
      game: props.game,
    })
  }
  search.value = ''
}
</script>

<template>
  <div class="mt-6 hex-frame p-4">
    <div class="flex items-center gap-3">
      <div class="text-lol-gold-2 text-xl">+</div>
      <input
        v-model="search"
        type="text"
        placeholder="Tape le nom d'un joueur à inscrire..."
        class="flex-1 bg-lol-void border border-lol-gold-6 rounded-lg focus:border-lol-gold-3 outline-none px-3 py-2 text-lol-gold-1"
      />
    </div>
    <div v-if="candidates.length" class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
      <button
        v-for="m in candidates"
        :key="m.id"
        type="button"
        class="flex items-center gap-3 p-2 border border-lol-gold-6 rounded-lg hover:border-lol-gold-3 hover:bg-lol-gold-6/20 transition text-left"
        @click="pick(m)"
      >
        <img v-if="m.avatar_url" :src="m.avatar_url" :alt="m.name" class="w-8 h-8 border border-lol-gold-6 rounded-lg shrink-0" />
        <div class="min-w-0 flex-1">
          <div class="font-display font-semibold text-lol-gold-1 truncate text-sm">{{ m.name }}</div>
        </div>
      </button>
    </div>
    <div v-else-if="search.trim().length >= 2" class="mt-3 text-center text-lol-grey-1 text-xs py-2">
      Aucun membre trouvé
    </div>
  </div>
</template>
