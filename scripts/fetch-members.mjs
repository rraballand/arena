#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const GITLAB_URL = process.env.GITLAB_URL
const GITLAB_TOKEN = process.env.GITLAB_TOKEN

if (!GITLAB_URL || !GITLAB_TOKEN) {
  console.error('Missing GITLAB_URL or GITLAB_TOKEN in env')
  process.exit(1)
}

const EXCLUDED_USERNAMES = new Set(['root', 'ghost', 'support-bot', 'alert-bot', 'automation-bot'])

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
  .filter(u => !EXCLUDED_USERNAMES.has(u.username?.toLowerCase()))
  .filter(u => (u.name || '').toLowerCase() !== 'administrator')
  .map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    avatar_url: u.avatar_url,
    web_url: u.web_url,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'fr'))

const path = resolve('data/factory-members.json')
writeFileSync(path, JSON.stringify(filtered, null, 2))
console.log(`Wrote ${filtered.length} members → ${path}`)
