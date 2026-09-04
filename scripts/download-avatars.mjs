#!/usr/bin/env node
/**
 * Localise every factory-members.json avatar under public/avatars/.
 *
 * Gravatar URLs are public and get downloaded as-is. GitLab-hosted uploads
 * (`/uploads/-/system/user/avatar/...`) are served behind a session cookie and
 * reject PRIVATE-TOKEN / Bearer / private_token auth alike — all four return
 * 401 on this instance. Two ways out:
 *
 *   - Set GITLAB_SESSION to the `_gitlab_session` cookie of a logged-in browser
 *     (DevTools > Application > Cookies). Real photos get downloaded.
 *   - Leave it unset: a deterministic initials SVG is generated instead.
 *
 * The cookie is short-lived and must never be committed; it is read from the
 * environment only, like GITLAB_TOKEN.
 *
 * Either way the rewritten JSON only ever holds a host-free relative path
 * (`avatars/<username>.<ext>`), so no external URL is hardcoded in the repo.
 *
 * Rewrites data/factory-members.json + public/factory-members.json.
 */
import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'

const REPO_ROOT = resolve(new URL('../', import.meta.url).pathname)
const MEMBERS_PATH = resolve(REPO_ROOT, 'data/factory-members.json')
const PUBLIC_MEMBERS_PATH = resolve(REPO_ROOT, 'public/factory-members.json')
const AVATAR_DIR = resolve(REPO_ROOT, 'public/avatars')

const gitlabUrl = process.env.GITLAB_URL
const gitlabToken = process.env.GITLAB_TOKEN
const gitlabSession = process.env.GITLAB_SESSION

/**
 * GitLab uploads only answer to a browser session cookie; other hosts (Gravatar)
 * must stay anonymous or they 400.
 */
function headersFor(url) {
  if (!gitlabUrl || !url.startsWith(gitlabUrl)) return {}
  const headers = {}
  if (gitlabToken) headers['PRIVATE-TOKEN'] = gitlabToken
  if (gitlabSession) headers.Cookie = `_gitlab_session=${gitlabSession}`
  return headers
}

/** Two initials: first letter of the first two name parts, fallback username. */
function initials(member) {
  const parts = (member.name || member.username || '?')
    .split(/[\s._-]+/)
    .filter(Boolean)
  const letters = parts.slice(0, 2).map(p => p[0])
  return (letters.join('') || '?').toUpperCase()
}

/** djb2, so a member always lands on the same hue across regenerations. */
function hue(seed) {
  let h = 5381
  for (const ch of seed) h = ((h << 5) + h + ch.charCodeAt(0)) | 0
  return Math.abs(h) % 360
}

const EXT_BY_TYPE = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}

function extFor(contentType) {
  const type = (contentType || '').split(';')[0].trim().toLowerCase()
  return EXT_BY_TYPE[type] || 'png'
}

/** A member switching format (placeholder svg -> real png) would leave an orphan. */
async function dropStaleVariants(username, keep) {
  await Promise.all(
    Object.values(EXT_BY_TYPE)
      .map(ext => `${username}.${ext}`)
      .filter(name => name !== keep)
      .map(name => fs.rm(resolve(AVATAR_DIR, name), { force: true })),
  )
}

function placeholderSvg(member) {
  const h = hue(member.username)
  const text = initials(member)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="${text}">
  <rect width="96" height="96" fill="hsl(${h} 38% 18%)"/>
  <text x="48" y="49" fill="hsl(${h} 55% 72%)" font-family="Cinzel, Georgia, serif" font-size="38" font-weight="700" text-anchor="middle" dominant-baseline="central">${text}</text>
</svg>
`
}

await fs.mkdir(AVATAR_DIR, { recursive: true })

const members = JSON.parse(await fs.readFile(MEMBERS_PATH, 'utf8'))

let downloaded = 0
let kept = 0
let generated = 0

for (const m of members) {
  // web_url only ever restated the GitLab host: rebuild it from the username
  // at call time instead of storing it.
  delete m.web_url

  const url = m.avatar_url

  if (url && !/^https?:\/\//.test(url)) {
    kept++
    continue
  }

  if (url) {
    try {
      const res = await fetch(url, { headers: headersFor(url) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 200) throw new Error(`suspiciously small (${buf.length}B)`)
      // Trust the content type over the URL: GitLab serves every upload as
      // `avatar.png` whatever was uploaded, and a 401 body is also `image/png`.
      const localName = `${m.username}.${extFor(res.headers.get('content-type'))}`
      await fs.writeFile(resolve(AVATAR_DIR, localName), buf)
      await dropStaleVariants(m.username, localName)
      m.avatar_url = `avatars/${localName}`
      downloaded++
      continue
    } catch (e) {
      console.warn(`${m.username}: ${e.message} → placeholder`)
    }
  }

  const localName = `${m.username}.svg`
  await fs.writeFile(resolve(AVATAR_DIR, localName), placeholderSvg(m))
  await dropStaleVariants(m.username, localName)
  m.avatar_url = `avatars/${localName}`
  generated++
}

const json = `${JSON.stringify(members, null, 2)}\n`
await fs.writeFile(MEMBERS_PATH, json)
await fs.mkdir(dirname(PUBLIC_MEMBERS_PATH), { recursive: true })
await fs.writeFile(PUBLIC_MEMBERS_PATH, json)

console.log(
  `Downloaded: ${downloaded}, Already local: ${kept}, Placeholders: ${generated}`,
)
