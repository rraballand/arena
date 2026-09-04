#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const GITLAB_URL = process.env.GITLAB_URL
const GITLAB_TOKEN = process.env.GITLAB_TOKEN

if (!GITLAB_URL || !GITLAB_TOKEN) {
  console.error('Missing GITLAB_URL or GITLAB_TOKEN in env')
  process.exit(1)
}

const EXCLUDED_USERNAMES = new Set([
  'root', 'ghost', 'support-bot', 'alert-bot', 'automation-bot',
  'marge-bot', 'n8n-gitlab', 'tech.account.idf',
])

/**
 * GitLab leaves `bot: false` on project access tokens and on service accounts
 * created by hand, so the API flag alone lets them through. Match the shapes.
 */
const EXCLUDED_PATTERNS = [
  /^project_\d+_bot_/, // project access tokens
  /-bot$/, // conventional bot naming
  /^(n8n|renovate|dependabot)[-.]/, // automation accounts
]

/**
 * Test accounts give themselves away in the display name, not the username
 * (e.g. `live.comtanguy.patte.invivo` is called "TEST DEV User Tanguy Patte").
 */
const EXCLUDED_NAME_PATTERNS = [/\btest\b/i, /\bdemo\b/i, /\bdummy\b/i]

const isExcluded = (username, name) => {
  const u = (username || '').toLowerCase()
  return EXCLUDED_USERNAMES.has(u)
    || EXCLUDED_PATTERNS.some(re => re.test(u))
    || EXCLUDED_NAME_PATTERNS.some(re => re.test(name || ''))
}

async function fetchAll() {
  const all = []
  let page = 1
  while (true) {
    const url = `${GITLAB_URL}/api/v4/users?active=true&per_page=100&page=${page}`
    const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': GITLAB_TOKEN } })
    if (!res.ok) throw new Error(`GitLab ${res.status}: ${await res.text()}`)
    const batch = await res.json()
    all.push(...batch)
    const nextPage = res.headers.get('x-next-page')
    if (!nextPage) break
    page = Number(nextPage)
  }
  return all
}

const raw = await fetchAll()
const filtered = raw
  .filter(u => !u.bot)
  .filter(u => u.state === 'active')
  .filter(u => !isExcluded(u.username, u.name))
  .filter(u => (u.name || '').toLowerCase() !== 'administrator')
  // web_url is dropped on purpose: it only restates the GitLab host, which we
  // don't want hardcoded in the committed JSON. avatar_url is kept remote here
  // and localised right after by scripts/download-avatars.mjs.
  .map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    avatar_url: u.avatar_url,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

const path = resolve('data/factory-members.json')
writeFileSync(path, `${JSON.stringify(filtered, null, 2)}\n`)
console.log(`Wrote ${filtered.length} members → ${path}`)
console.log('Now run: node scripts/download-avatars.mjs')
