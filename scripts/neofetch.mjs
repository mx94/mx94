#!/usr/bin/env node
// Generates a neofetch-style profile card (SVG) from live GitHub data.
// Usage: GITHUB_TOKEN=... node scripts/neofetch.mjs dist/neofetch.svg
// Zero dependencies — Node 20+ (global fetch).

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const LOGIN = process.env.GH_LOGIN || 'mx94'
const TOKEN = process.env.GITHUB_TOKEN
const OUT = process.argv[2] || 'dist/neofetch.svg'

if (!TOKEN) {
  console.error('GITHUB_TOKEN is required')
  process.exit(1)
}

const query = `
query($login: String!) {
  user(login: $login) {
    name createdAt
    followers { totalCount }
    own: repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) { totalCount }
    forks: repositories(ownerAffiliations: OWNER, isFork: true, privacy: PUBLIC) { totalCount }
    starred: starredRepositories { totalCount }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      restrictedContributionsCount
      contributionCalendar { totalContributions }
    }
  }
}`

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'mx94-neofetch' },
  body: JSON.stringify({ query, variables: { login: LOGIN } }),
})
const json = await res.json()
if (json.errors) {
  console.error(JSON.stringify(json.errors, null, 2))
  process.exit(1)
}
const u = json.data.user
const cc = u.contributionsCollection

// ---- derived values -------------------------------------------------------
const now = new Date()
const created = new Date(u.createdAt)
let months = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth())
if (now.getDate() < created.getDate()) months -= 1
const uptime = `${Math.floor(months / 12)} years, ${months % 12} months`
const contributions = cc.contributionCalendar.totalContributions
const synced = now.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
const fmt = (n) => n.toLocaleString('en-US')

// ---- svg helpers ----------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const rows = [
  ['OS',        'macOS · zsh · Hangzhou, CN',                                   'val'],
  ['Role',      'AI Agent Engineer · Full-Stack',                               'cyan'],
  ['Host',      'AI drug-discovery startup · protein-design agents',            'val'],
  ['Uptime',    `${uptime} on GitHub`,                                          'val'],
  ['Repos',     `${fmt(u.own.totalCount)} original · ${fmt(u.forks.totalCount)} forks`, 'val'],
  ['Commits',   `${fmt(contributions)} contributions in the last year`,         'green'],
  ['Followers', `${fmt(u.followers.totalCount)} · ${fmt(u.starred.totalCount)} repos starred`, 'val'],
  ['Stack',     'TS · React · Vue · Python · Django · LangGraph',                'val'],
  ['Focus',     'agent runtime · RAG · streaming · sandbox · o11y',              'amber'],
]

const ROW_H = 24
const rowsSvg = rows.map(([k, v, cls], i) => {
  const y = 96 + i * ROW_H
  return `<g class="row" style="animation-delay:${(0.35 + i * 0.12).toFixed(2)}s">
    <text class="t key" x="330" y="${y}">${esc(k)}</text>
    <text class="t dim" x="430" y="${y}">:</text>
    <text class="t ${cls}" x="446" y="${y}">${esc(v)}</text>
  </g>`
}).join('\n')

// neofetch palette blocks
const palette = ['#ff5f56', '#ffbd2e', '#39ff14', '#00e5ff', '#3b82f6', '#ff2bd6', '#a855f7', '#e6edf3']
const blocks = palette.map((c, i) => `<rect x="${330 + i * 30}" y="312" width="26" height="14" rx="2" fill="${c}"/>`).join('')
const blocksDim = palette.map((c, i) => `<rect x="${330 + i * 30}" y="330" width="26" height="14" rx="2" fill="${c}" fill-opacity="0.45"/>`).join('')

// double helix (left panel): two sine strands + rungs
const helix = (() => {
  const cx = 160, top = 78, bottom = 340, amp = 46, period = 84
  const pts = (phase) => {
    let d = ''
    for (let y = top; y <= bottom; y += 4) {
      const x = cx + amp * Math.sin(((y - top) / period) * Math.PI * 2 + phase)
      d += (y === top ? 'M' : 'L') + x.toFixed(1) + ' ' + y + ' '
    }
    return d
  }
  let rungs = ''
  for (let y = top + 8; y <= bottom - 6; y += 12) {
    const x1 = cx + amp * Math.sin(((y - top) / period) * Math.PI * 2)
    const x2 = cx + amp * Math.sin(((y - top) / period) * Math.PI * 2 + Math.PI)
    const w = Math.abs(x2 - x1)
    const op = Math.max(0.15, Math.min(1, w / (amp * 2)))
    rungs += `<line x1="${x1.toFixed(1)}" y1="${y}" x2="${x2.toFixed(1)}" y2="${y}" stroke="#39ff14" stroke-opacity="${op.toFixed(2)}" stroke-width="2"/>`
  }
  return `
    <g filter="url(#glow)">
      ${rungs}
      <path class="strand sA" d="${pts(0)}" fill="none" stroke="#ff2bd6" stroke-width="3"/>
      <path class="strand sB" d="${pts(Math.PI)}" fill="none" stroke="#00e5ff" stroke-width="3"/>
    </g>`
})()

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="410" viewBox="0 0 900 410" font-family="'SF Mono', 'JetBrains Mono', Menlo, Consolas, 'Liberation Mono', 'DejaVu Sans Mono', monospace">
  <defs>
    <radialGradient id="auroraA" cx="0.1" cy="0.15" r="0.7"><stop offset="0" stop-color="#ff2bd6" stop-opacity="0.28"/><stop offset="1" stop-color="#ff2bd6" stop-opacity="0"/></radialGradient>
    <radialGradient id="auroraB" cx="0.92" cy="0.9" r="0.75"><stop offset="0" stop-color="#00e5ff" stop-opacity="0.26"/><stop offset="1" stop-color="#00e5ff" stop-opacity="0"/></radialGradient>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#39ff14"/><stop offset="0.5" stop-color="#00e5ff"/><stop offset="1" stop-color="#ff2bd6"/></linearGradient>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#fff" fill-opacity="0.045"/></pattern>
    <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#00e5ff" stroke-opacity="0.07"/></pattern>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="glowHard" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <clipPath id="win"><rect x="30" y="26" width="840" height="360" rx="14"/></clipPath>
  </defs>
  <style>
    .t { font-size: 15px; white-space: pre; }
    .key { fill: #ff2bd6; font-weight: 700; }
    .val { fill: #e6edf3; }
    .dim { fill: #8b949e; }
    .cyan { fill: #00e5ff; }
    .green { fill: #39ff14; }
    .amber { fill: #ffb000; }
    .row { animation: fadein .5s ease-out both; }
    @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
    .strand { stroke-dasharray: 10 6; animation: flow 1.6s linear infinite; }
    .sB { animation-direction: reverse; }
    @keyframes flow { to { stroke-dashoffset: -32; } }
    .beam { animation: sweep 6s linear infinite; }
    @keyframes sweep { from { transform: translateY(-40px); } to { transform: translateY(430px); } }
    .cur { animation: blink 1s steps(1, end) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
  </style>

  <rect width="900" height="410" fill="#050810"/>
  <rect width="900" height="410" fill="url(#grid)"/>
  <rect width="900" height="410" fill="url(#auroraA)"/>
  <rect width="900" height="410" fill="url(#auroraB)"/>
  <rect x="28" y="24" width="844" height="364" rx="16" fill="none" stroke="url(#frame)" stroke-width="2" filter="url(#glowHard)" opacity="0.9"/>

  <rect x="30" y="26" width="840" height="360" rx="14" fill="#0b0f17" fill-opacity="0.96"/>
  <g clip-path="url(#win)">
    <rect x="30" y="26" width="840" height="360" fill="url(#scan)"/>
    <rect class="beam" x="30" y="0" width="840" height="26" fill="#00e5ff" fill-opacity="0.05"/>
  </g>

  <!-- title bar -->
  <rect x="30" y="26" width="840" height="34" rx="14" fill="#111826"/>
  <rect x="30" y="46" width="840" height="14" fill="#111826"/>
  <circle cx="54" cy="43" r="6" fill="#ff5f56"/><circle cx="74" cy="43" r="6" fill="#ffbd2e"/><circle cx="94" cy="43" r="6" fill="#27c93f"/>
  <text x="450" y="48" text-anchor="middle" class="t dim" font-size="13">curry@mx94: ~ — neofetch</text>

  <!-- left: helix + wordmark -->
  ${helix}
  <text x="160" y="370" text-anchor="middle" class="t dim" font-size="11">protein · design · agents</text>

  <!-- right: header line -->
  <text class="t green" x="330" y="70" font-size="17" font-weight="700" filter="url(#glow)">curry@mx94</text>
  <text class="t dim" x="330" y="82" font-size="11">${'─'.repeat(52)}</text>

  ${rowsSvg}

  ${blocks}
  ${blocksDim}
  <text class="t dim" x="850" y="372" text-anchor="end" font-size="11">synced ${esc(synced)}</text>
  <rect class="cur" x="590" y="312" width="9" height="14" fill="#39ff14" filter="url(#glow)"/>
</svg>
`

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, svg)
console.log(`wrote ${OUT} — ${fmt(contributions)} contributions, ${u.own.totalCount} repos, ${u.followers.totalCount} followers, uptime ${uptime}`)
