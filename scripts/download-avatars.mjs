#!/usr/bin/env node
/**
 * Fetch factory-members.json avatars locally.
 * - Gravatar URLs → downloaded as public/avatars/<username>.<ext>
 * - GitLab-hosted URLs need session cookies, so they stay remote.
 *   (Fallback to dicebear placeholder handled in-app.)
 *
 * Rewrites data/factory-members.json + public/factory-members.json
 * so avatar_url points to the local file when we have one.
 */
import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'

const REPO_ROOT = resolve(new URL('../', import.meta.url).pathname)
const MEMBERS_PATH = resolve(REPO_ROOT, 'data/factory-members.json')
const PUBLIC_MEMBERS_PATH = resolve(REPO_ROOT, 'public/factory-members.json')
const AVATAR_DIR = resolve(REPO_ROOT, 'public/avatars')

await fs.mkdir(AVATAR_DIR, { recursive: true })

const raw = await fs.readFile(MEMBERS_PATH, 'utf8')
const members = JSON.parse(raw)

let downloaded = 0
let skipped = 0
let missing = 0

for (const m of members) {
  const url = m.avatar_url
  if (!url) { missing++; continue }
  // Only fetch publicly reachable (gravatar / generic https)
  const isGravatar = url.includes('gravatar')
  if (!isGravatar) { skipped++; continue }

  try {
    const res = await fetch(url)
    if (!res.ok) { skipped++; continue }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 200) { skipped++; continue }
    const localName = `${m.username}.png`
    await fs.writeFile(resolve(AVATAR_DIR, localName), buf)
    m.avatar_url = `avatars/${localName}`
    downloaded++
  } catch (e) {
    console.error(`Failed ${m.username}: ${e.message}`)
    skipped++
  }
}

await fs.writeFile(MEMBERS_PATH, JSON.stringify(members, null, 2))
await fs.mkdir(dirname(PUBLIC_MEMBERS_PATH), { recursive: true })
await fs.writeFile(PUBLIC_MEMBERS_PATH, JSON.stringify(members, null, 2))

console.log(`Downloaded: ${downloaded}, Skipped (needs auth): ${skipped}, Missing URL: ${missing}`)
