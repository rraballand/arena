<script setup lang="ts">
import type { Player } from '~/data/players'
import {
  avatarSrc,
  crossRegisterPlayer,
  deletePlayer,
  leavePlayerGame,
  toggleShadowPlayer,
  updatePlayer,
  type PlayerPatch,
  type ScoreCard,
} from '~/composables/useStores'
import { LOL_RANKS, LOL_ROLES, VAL_RANKS } from '~/composables/useRanks'

const props = defineProps<{
  player: Player
  /** Matches referencing this player. Non-zero blocks the hard delete. */
  matchCount: number
  /** Per-game scorecards, computed once by the parent. Absent = no match played. */
  lolScore?: ScoreCard
  valScore?: ScoreCard
  editing: boolean
}>()

const emit = defineEmits<{
  (e: 'toggleEdit'): void
  (e: 'notify', text: string, tone?: 'ok' | 'error'): void
}>()

/**
 * Shared box for the whole action group: a fixed height and min-width keep the
 * icon buttons exactly as big as the LoL / Valo ones despite the smaller glyph.
 */
const BTN = 'h-8 min-w-8 px-2 inline-flex items-center justify-center border rounded-lg transition shrink-0'

// The action buttons already say LoL / Valo, so the meta line drops the labels
// and leans on colour + the game-specific rank emblem instead. Each side is
// rendered only when it has something to say, and the divider only when both do.
const hasLol = computed(() =>
  Boolean(props.player.lol.role || props.player.lol.rank || props.lolScore?.matches),
)
const hasVal = computed(() =>
  Boolean(props.player.valorant.rank || props.valScore?.matches),
)

const metaEmpty = computed(() => !hasLol.value && !hasVal.value && !props.matchCount)

const draft = ref<PlayerPatch>({})

// Re-seed whenever the row opens, so a cancelled edit never leaks into the next one.
watch(
  () => props.editing,
  (open) => {
    if (!open) return
    const p = props.player
    draft.value = {
      pseudo: p.pseudo,
      lol: { role: p.lol.role, rank: p.lol.rank, main: p.lol.main ?? '' },
      valorant: { rank: p.valorant.rank, main: p.valorant.main ?? '' },
    }
  },
  { immediate: true },
)

function save() {
  const p = updatePlayer(props.player.id, draft.value)
  emit('notify', p ? `${p.pseudo} mis à jour.` : 'Joueur introuvable.', p ? 'ok' : 'error')
  emit('toggleEdit')
}

function toggleGame(game: 'lol' | 'val') {
  const p = props.player
  const playing = game === 'lol' ? p.lol.playing : p.valorant.playing
  const label = game === 'lol' ? 'LoL' : 'Valorant'
  if (!playing) {
    crossRegisterPlayer(p.id, game)
    emit('notify', `${p.pseudo} ajouté à ${label}.`)
    return
  }
  const res = leavePlayerGame(p.id, game)
  emit(
    'notify',
    res.deleted
      ? `${p.pseudo} retiré (aucun historique).`
      : res.kept
        ? `${p.pseudo} sorti de ${label}, fiche conservée (historique de matchs).`
        : `${p.pseudo} sorti de ${label}.`,
  )
}

function toggleShadow() {
  const next = !props.player.shadow
  toggleShadowPlayer(props.player.id, next)
  emit('notify', `${props.player.pseudo} ${next ? 'marqué indisponible ce soir' : 'de retour'}.`)
}

function remove() {
  const p = props.player
  if (props.matchCount) {
    emit(
      'notify',
      `${p.pseudo} apparaît dans ${props.matchCount} match${props.matchCount > 1 ? 's' : ''} : suppression impossible, sors-le des deux jeux plutôt.`,
      'error',
    )
    return
  }
  if (!confirm(`Supprimer définitivement ${p.pseudo} ?`)) return
  const res = deletePlayer(p.id)
  emit('notify', res.deleted ? `${p.pseudo} supprimé.` : 'Suppression refusée.', res.deleted ? 'ok' : 'error')
}
</script>

<template>
  <div class="hex-frame p-3 md:p-4" :class="player.shadow ? 'opacity-60' : ''">
    <div class="flex items-center gap-3">
      <img
        v-if="player.factoryAvatar"
        :src="avatarSrc(player.factoryAvatar)"
        :alt="player.pseudo"
        class="w-10 h-10 rounded-full border border-lol-gold-6 shrink-0"
      />
      <div class="min-w-0 flex-1">
        <div class="font-display text-lol-gold-1 truncate">{{ player.pseudo }}</div>
        <div
          v-if="!metaEmpty"
          class="flex items-center gap-2 mt-1 flex-wrap text-[10px] uppercase tracking-widest"
        >
          <template v-if="hasLol">
            <span v-if="player.lol.role" class="text-lol-gold-2">{{ player.lol.role }}</span>
            <RankChip v-if="player.lol.rank" :rank="player.lol.rank" game="lol" size="sm" />
            <span v-if="lolScore?.matches" class="text-lol-gold-1 font-mono normal-case">
              {{ lolScore.points }} pts
            </span>
          </template>

          <span v-if="hasLol && hasVal" class="text-lol-grey-2">|</span>

          <template v-if="hasVal">
            <RankChip v-if="player.valorant.rank" :rank="player.valorant.rank" game="val" size="sm" />
            <span v-if="valScore?.matches" class="text-val-red font-mono normal-case">
              {{ valScore.points }} pts
            </span>
          </template>

          <!-- Only when no score is shown: otherwise nothing would explain the
               disabled delete for someone who has only ever been benched. -->
          <span v-if="matchCount && !lolScore?.matches && !valScore?.matches" class="text-lol-grey-1">
            {{ matchCount }} match{{ matchCount > 1 ? 's' : '' }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          :class="[BTN, 'text-[10px] uppercase tracking-widest', player.lol.playing
            ? 'border-lol-gold-2 text-lol-gold-1'
            : 'border-lol-gold-6/60 text-lol-grey-1 hover:border-lol-gold-3']"
          :title="player.lol.playing ? 'Sortir de LoL' : 'Ajouter à LoL'"
          @click="toggleGame('lol')"
        >LoL</button>
        <button
          type="button"
          :class="[BTN, 'text-[10px] uppercase tracking-widest', player.valorant.playing
            ? 'border-val-red text-val-red'
            : 'border-lol-gold-6/60 text-lol-grey-1 hover:border-val-red']"
          :title="player.valorant.playing ? 'Sortir de Valorant' : 'Ajouter à Valorant'"
          @click="toggleGame('val')"
        >Valo</button>
        <button
          type="button"
          :class="[BTN, 'text-sm', editing
            ? 'border-lol-gold-2 text-lol-gold-1 bg-lol-gold-6/30'
            : 'border-lol-gold-6/60 text-lol-grey-1 hover:border-lol-gold-3']"
          :title="editing ? 'Fermer' : 'Éditer'"
          :aria-label="editing ? 'Fermer' : 'Éditer'"
          @click="emit('toggleEdit')"
        >✎</button>
        <button
          type="button"
          :class="[BTN, 'text-sm', player.shadow
            ? 'border-lol-blue-2/60 text-lol-blue-2'
            : 'border-lol-gold-6/60 text-lol-grey-1 hover:border-lol-blue-2/60']"
          :title="player.shadow ? 'De retour ce soir' : 'Indisponible ce soir'"
          :aria-label="player.shadow ? 'De retour ce soir' : 'Indisponible ce soir'"
          @click="toggleShadow"
        >{{ player.shadow ? '☀' : '☾' }}</button>
        <button
          type="button"
          :class="[BTN, 'text-sm border-val-red/40 text-val-red hover:border-val-red disabled:opacity-30']"
          :disabled="matchCount > 0"
          :title="matchCount ? 'A un historique de matchs : sors-le des deux jeux' : 'Supprimer définitivement'"
          aria-label="Supprimer"
          @click="remove"
        >✕</button>
      </div>
    </div>

    <div v-if="editing" class="mt-4 pt-4 border-t border-lol-gold-6/40 space-y-4">
      <label class="block">
        <span class="text-[10px] uppercase tracking-widest text-lol-gold-2">Pseudo</span>
        <input
          v-model="draft.pseudo"
          type="text"
          class="mt-1 w-full md:max-w-sm bg-lol-void border border-lol-gold-6 rounded-lg focus:border-lol-gold-3 outline-none px-3 py-2 text-lol-gold-1 text-sm"
        />
      </label>

      <div v-if="draft.lol" class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label class="block">
          <span class="text-[10px] uppercase tracking-widest text-lol-gold-2">Rôle LoL</span>
          <select
            v-model="draft.lol.role"
            class="mt-1 w-full bg-lol-void border border-lol-gold-6 rounded-lg focus:border-lol-gold-3 outline-none px-3 py-2 text-lol-gold-1 text-sm"
          >
            <option :value="undefined">—</option>
            <option v-for="r in LOL_ROLES" :key="r" :value="r">{{ r }}</option>
          </select>
        </label>
        <label class="block">
          <span class="text-[10px] uppercase tracking-widest text-lol-gold-2">Rang LoL</span>
          <select
            v-model="draft.lol.rank"
            class="mt-1 w-full bg-lol-void border border-lol-gold-6 rounded-lg focus:border-lol-gold-3 outline-none px-3 py-2 text-lol-gold-1 text-sm"
          >
            <option :value="undefined">—</option>
            <option v-for="r in LOL_RANKS" :key="r" :value="r">{{ r }}</option>
          </select>
        </label>
        <label class="block">
          <span class="text-[10px] uppercase tracking-widest text-lol-gold-2">Main LoL</span>
          <input
            v-model="draft.lol.main"
            type="text"
            placeholder="Azir..."
            class="mt-1 w-full bg-lol-void border border-lol-gold-6 rounded-lg focus:border-lol-gold-3 outline-none px-3 py-2 text-lol-gold-1 text-sm"
          />
        </label>
      </div>

      <div v-if="draft.valorant" class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label class="block">
          <span class="text-[10px] uppercase tracking-widest text-val-red">Rang Valo</span>
          <select
            v-model="draft.valorant.rank"
            class="mt-1 w-full bg-lol-void border border-val-red/40 rounded-lg focus:border-val-red outline-none px-3 py-2 text-val-cream text-sm"
          >
            <option :value="undefined">—</option>
            <option v-for="r in VAL_RANKS" :key="r" :value="r">{{ r }}</option>
          </select>
        </label>
        <label class="block">
          <span class="text-[10px] uppercase tracking-widest text-val-red">Main Valo</span>
          <input
            v-model="draft.valorant.main"
            type="text"
            placeholder="Jett..."
            class="mt-1 w-full bg-lol-void border border-val-red/40 rounded-lg focus:border-val-red outline-none px-3 py-2 text-val-cream text-sm"
          />
        </label>
      </div>

      <div class="flex items-center justify-end gap-3">
        <button
          type="button"
          class="text-[10px] uppercase tracking-widest text-lol-grey-1 hover:text-lol-gold-2"
          @click="emit('toggleEdit')"
        >Annuler</button>
        <button type="button" class="lol-btn" @click="save">Enregistrer</button>
      </div>
    </div>
  </div>
</template>
