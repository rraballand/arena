import { useLocalStore } from './useLocalStore'
import { usePlayersStore, useMatchesStore } from './useStores'

const REPO_OWNER = 'rraballand'
const REPO_NAME = 'arena'
const REMOTE_PATH = 'backups/state.json'
const BRANCH = 'main'

export function useGitHubToken() {
  return useLocalStore<string>('gh-token', '')
}

interface StatePayload {
  players: unknown
  matches: unknown
  exportedAt: string
}

export function currentPayload(): StatePayload {
  return {
    players: usePlayersStore().value,
    matches: useMatchesStore().value,
    exportedAt: new Date().toISOString(),
  }
}

async function ghApi<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useGitHubToken().value
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub ${res.status}: ${body}`)
  }
  return (await res.json()) as T
}

// Base64 UTF-8 safe (handles é, à, etc.)
function toBase64(str: string) {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach(b => (binary += String.fromCharCode(b)))
  return btoa(binary)
}
function fromBase64(b64: string) {
  const binary = atob(b64.replace(/\s+/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

interface FileMeta {
  sha: string
  content: string
}

async function fetchRemoteFile(): Promise<FileMeta | null> {
  try {
    return await ghApi<FileMeta>(
      `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${REMOTE_PATH}?ref=${BRANCH}`,
    )
  } catch (e: any) {
    if (String(e.message).includes('404')) return null
    throw e
  }
}

export async function pushToGitHub(message = 'chore: sync arena state') {
  const payload = currentPayload()
  const content = JSON.stringify(payload, null, 2)
  const existing = await fetchRemoteFile()
  await ghApi(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${REMOTE_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: toBase64(content),
      branch: BRANCH,
      sha: existing?.sha,
    }),
  })
}

export async function pullFromGitHub(): Promise<StatePayload> {
  const file = await fetchRemoteFile()
  if (!file) throw new Error('Aucun état distant trouvé')
  const raw = fromBase64(file.content)
  const parsed = JSON.parse(raw) as StatePayload
  const playersStore = usePlayersStore()
  const matchesStore = useMatchesStore()
  if (Array.isArray(parsed.players)) playersStore.value = parsed.players as any
  if (Array.isArray(parsed.matches)) matchesStore.value = parsed.matches as any
  return parsed
}

export function isTokenSet() {
  return !!useGitHubToken().value.trim()
}
