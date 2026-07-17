import { onMounted, watch } from 'vue'

export function useLocalStore<T>(key: string, initial: T) {
  const state = useState<T>(key, () => initial)

  onMounted(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) state.value = JSON.parse(raw) as T
    } catch {}
    watch(
      state,
      (v) => {
        try {
          localStorage.setItem(key, JSON.stringify(v))
        } catch {}
      },
      { deep: true },
    )
  })

  return state
}
