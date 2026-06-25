import { lazy } from "@/util/lazy"
import { HttpServerResponse } from "effect/unstable/http"

const portalHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenCode Portal</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #f6f8fa; color: #1f2328;
    min-height: 100vh;
  }

  /* ── Header ── */
  .header {
    display: flex; align-items: center; gap: 16px;
    padding: 14px 32px; background: #fff;
    border-bottom: 1px solid #d0d7de;
    position: sticky; top: 0; z-index: 10;
  }
  .header h1 { font-size: 18px; font-weight: 600; white-space: nowrap; letter-spacing: -.02em; }
  .header h1 {
    height: 1.2em;            /* Explicit height based on font size */
    display: inline-flex;
  }
  .header h1 img {
    height: 100%;             /* Scales dynamically with the em height */
    width: auto;              /* Prevents horizontal distortion */
    margin-right: 5px;
  }
  .header .search-wrap { flex: 1; display: flex; justify-content: center; }
  .header .search-wrap input {
    width: 100%; max-width: 500px;
    padding: 7px 12px;
    border: 1px solid #d0d7de; border-radius: 8px;
    font-size: 14px; background: #f6f8fa; color: #1f2328;
    outline: none; transition: border-color .15s, box-shadow .15s;
  }
  .header .search-wrap input:focus {
    border-color: #0969da;
    box-shadow: 0 0 0 3px rgba(9,105,218,.15);
    background: #fff;
  }
  .header .stats { font-size: 13px; color: #656d76; white-space: nowrap; text-align: right; }
  .header .stats span { margin-left: 12px; }
  .open-btn {
    font-size: 13px; background: #0969da; color: #fff; border: none;
    border-radius: 6px; padding: 5px 12px; cursor: pointer; white-space: nowrap;
  }
  .open-btn:hover { background: #0860ca; }

  /* ── Modal ── */
  .modal-overlay {
    display: none; position: fixed; inset: 0; z-index: 100;
    background: rgba(0,0,0,.4); align-items: center; justify-content: center;
  }
  .modal-overlay.open { display: flex; }
  .modal {
    background: #fff; border-radius: 12px; padding: 24px;
    width: 520px; max-width: 90vw; box-shadow: 0 8px 32px rgba(0,0,0,.15);
  }
  .modal h2 { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
  .modal p { font-size: 13px; color: #656d76; margin-bottom: 12px; }
  .modal input {
    width: 100%; padding: 8px 12px; border: 1px solid #d0d7de; border-radius: 8px;
    font-size: 14px; font-family: ui-monospace, SFMono-Regular, monospace;
    outline: none; transition: border-color .15s, box-shadow .15s;
  }
  .modal input:focus {
    border-color: #0969da; box-shadow: 0 0 0 3px rgba(9,105,218,.15);
  }
  .modal .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
  .modal .actions button,
  .modal .actions a {
    padding: 6px 16px; border-radius: 8px; font-size: 14px; cursor: pointer;
  }
  .modal .actions .cancel {
    background: #f6f8fa; border: 1px solid #d0d7de; color: #1f2328;
  }
  .modal .actions .cancel:hover { background: #e8ecf0; }
  .modal .actions .confirm {
    background: #0969da; border: none; color: #fff; text-decoration: none;
    display: inline-flex; align-items: center;
  }
  .modal .actions .confirm:hover { background: #0860ca; }

  .toggle-label {
    font-size: 13px; color: #656d76; cursor: pointer; white-space: nowrap;
    display: flex; align-items: center; gap: 6px; user-select: none;
  }
  .toggle-label input { accent-color: #0969da; cursor: pointer; }

  /* ── Auth ── */
  .auth-bar {
    display: none; align-items: center; gap: 8px;
    padding: 10px 32px; background: #fff8c8; border-bottom: 1px solid #d0d7de; font-size: 13px;
  }
  .auth-bar.show { display: flex; }
  .auth-bar input {
    background: #fff; border: 1px solid #d0d7de; border-radius: 6px;
    padding: 4px 8px; color: #1f2328; font-size: 13px; width: 120px;
  }
  .auth-bar button {
    background: #0969da; border: none; border-radius: 6px;
    padding: 4px 14px; color: #fff; font-size: 13px; cursor: pointer;
  }

  /* ── Status ── */
  .status { padding: 12px 32px; font-size: 14px; color: #656d76; }
  .status.error { color: #cf222e; }

  /* ── Container ── */
  .container { padding: 8px 32px 48px; max-width: 960px; }

  /* ── Tree (nested lists with CSS lines) ── */
  .tree { font-size: 14px; line-height: 1.6; }

  .tree ul {
    list-style: none; padding: 0; margin: 0;
  }
  .tree > ul { padding-left: 0; }
  .tree ul ul { padding-left: 22px; }

  .tree li { position: relative; margin: 0; padding: 0; }

  /* Vertical line from parent - extends from top to bottom of li
     unless it's the last child (then only top half) */
  .tree li::before {
    content: ''; position: absolute;
    left: -11px; top: 0; bottom: 0;
    border-left: 1.5px solid #d0d7de;
  }
  .tree li:last-child::before {
    height: 50%;
  }

  /* Horizontal line from vertical to the node content */
  .tree li::after {
    content: ''; position: absolute;
    left: -11px; top: 50%;
    width: 11px;
    border-top: 1.5px solid #d0d7de;
  }

  /* Remove lines from root-level items */
  .tree > ul > li::before,
  .tree > ul > li::after { display: none; }

  .tree .node {
    display: flex; align-items: center; gap: 4px;
    padding: 2px 0; min-height: 30px;
    position: relative; z-index: 1;
  }
  .tree .node.dir { cursor: default; }
  .tree .node.project { cursor: pointer; border-radius: 6px; padding: 2px 8px; margin: 0 -8px; }
  .tree .node.project:hover { background: #e8ecf0; }

  .tree .icon { flex-shrink: 0; font-size: 15px; line-height: 1; margin-right: 1px; }
  .tree .icon.dir { color: #9a6700; }
  .tree .icon.project { color: #656d76; }
  .tree .label { font-weight: 500; }
  .tree .plabel { font-weight: 500; }

  .tree .arrow {
    flex-shrink: 0; width: 14px; text-align: center;
    font-size: 10px; color: #8b949e; user-select: none;
    transition: transform .12s;
  }
  .tree .arrow.open { transform: rotate(90deg); }

  .tree .badge {
    font-size: 11px; color: #656d76; background: #e8ecf0;
    padding: 0 6px; border-radius: 10px; line-height: 18px;
  }

  /* ── Sessions ── */
  .sess-wrap { display: none; }
  .sess-wrap.open { display: block; }
  .sess-item {
    display: flex; align-items: center; gap: 8px;
    padding: 4px 8px 4px 20px; border-radius: 6px;
    text-decoration: none; color: #1f2328; font-size: 13px;
    position: relative;
  }
  .sess-item:hover { background: #e8ecf0; }
  .sess-item .dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #0969da; flex-shrink: 0;
  }
  .sess-item .title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sess-item .time { font-size: 12px; color: #656d76; white-space: nowrap; }
  .sess-item .sid {
    font-size: 11px; color: #8b949e;
    font-family: ui-monospace, SFMono-Regular, monospace;
  }

  /* ── Empty ── */
  .empty { padding: 64px 32px; text-align: center; }
  .empty .big { font-size: 40px; margin-bottom: 8px; }
  .empty .hint { font-size: 14px; color: #656d76; }

  /* ── Highlight ── */
  mark { background: #fff8c8; color: #1f2328; padding: 0 2px; border-radius: 2px; }
</style>
</head>
<body>

<div class="header">
  <h1><img src="/favicon-v3.ico" height="100%"/> OpenCode Portal</h1>
  <div class="search-wrap">
    <input type="search" id="searchInput" placeholder="搜索上层目录、项目名、会话标题、会话 ID…" spellcheck="false" autocomplete="off">
  </div>
  <button class="open-btn" onclick="showModal()">+ 打开项目</button>
  <label class="toggle-label"><input type="checkbox" id="hideSub" checked onchange="toggleSub()"> 隐藏子会话</label>
  <div class="stats" id="stats"></div>
</div>

<div class="auth-bar" id="authBar">
  <span>需要认证</span>
  <input id="authUser" placeholder="用户名" value="opencode">
  <input id="authPass" type="password" placeholder="密码">
  <button onclick="doAuth()">登录</button>
</div>

<div class="status" id="status">加载中…</div>
<div class="container" id="container"></div>

<div class="modal-overlay" id="modalOverlay" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <h2>打开项目</h2>
    <p>输入项目的绝对路径，按回车或点击确认打开。</p>
    <input id="pathInput" placeholder='例如 D:\\projects\\my-app 或 /home/user/project' spellcheck="false"
           oninput="updateOpenLink()" onkeydown="if(event.key==='Enter')document.getElementById('openLink').click()">
    <div class="actions">
      <button class="cancel" onclick="closeModal()">取消</button>
      <a class="confirm" id="openLink" href="" onclick="closeModal()">确认</a>
    </div>
  </div>
</div>

<script>
const API = '/experimental/session'
let authToken = new URLSearchParams(location.search).get('auth_token') || ''
let allSessions = []
let searchTerm = ''
let hideSub = true
let homeDir = ''

/* ── Helpers ── */

function b64(str) {
  let bin = ''
  for (const b of new TextEncoder().encode(str)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '')
}

function norm(p) {
  return (p || '').replace(/\\\\/g, '/').replace(/\\/+/g, '/').replace(/\\/$/, '') || '/'
}

/* Expand ~ to home dir, convert /c/ style to C:/, then normalize */
function resolvePath(p) {
  let s = (p || '').trim()
  if (!s) return ''
  // ~  → home directory
  if (s === '~') return norm(homeDir || s)
  if (s.startsWith('~') && (s[1] === '/' || s[1] === '\\\\')) {
    s = (homeDir || '~') + s.slice(1)
  }
  // Normalise separators
  s = s.replace(/\\\\/g, '/')
  // d/foo/bar  →  /d/foo/bar  (single-letter first segment, no leading /)
  s = s.replace(/^([a-zA-Z])\\//, '/$1/')
  // /c/foo  →  C:/foo   (single-letter drive, case-insensitive)
  s = s.replace(/^\\/([a-zA-Z])\\//, (_, l) => l.toUpperCase() + ':/')
  // Strip trailing slash, collapse repeats
  return s.replace(/\\/+/g, '/').replace(/\\/$/, '') || '/'
}

function parent(p) {
  const n = norm(p)
  const i = n.lastIndexOf('/')
  return i > 0 ? n.slice(0, i) : null
}

function leaf(p) {
  const n = norm(p).replace(/\\/$/, '')
  return n.slice(n.lastIndexOf('/') + 1)
}

function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const diff = Date.now() - d.getTime()
  if (diff < 6e4) return '刚刚'
  if (diff < 36e5) return Math.floor(diff/6e4) + 'm'
  if (diff < 864e5) return Math.floor(diff/36e5) + 'h'
  if (diff < 6048e5) return Math.floor(diff/864e5) + 'd'
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function esc(s) {
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}

function hl(text, term) {
  if (!term) return esc(text)
  const re = new RegExp('(' + term.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&') + ')', 'gi')
  return esc(text).replace(re, '<mark>$1</mark>')
}

/* ── Tree building ── */

function build(data) {
  const map = {}
  for (const s of data) {
    const d = norm(s.directory || '(unknown)')
    ;(map[d] ??= []).push(s)
  }
  const root = { children: [] }
  for (const [dir, ss] of Object.entries(map)) {
    const parts = dir.split('/').filter(Boolean)
    let cur = root
    for (let i = 0; i < parts.length; i++) {
      const isLeaf = i === parts.length - 1
      let ch = cur.children.find(c => c.name === parts[i])
      if (!ch) {
        ch = {
          name: parts[i],
          full: '/' + parts.slice(0, i + 1).join('/'),
          type: isLeaf ? 'project' : 'dir',
          children: [],
          sessions: isLeaf ? ss : [],
          expanded: false,
        }
        cur.children.push(ch)
      } else if (isLeaf && ch.type === 'dir') {
        ch.type = 'project'
        ch.sessions = ss
      }
      cur = ch
    }
  }
  return root
}

function collapseChains(node) {
  while (node.children.length === 1 && node.children[0].type === 'dir') {
    const child = node.children[0]
    node.name += '/' + child.name
    node.children = child.children
  }
  for (const c of node.children) collapseChains(c)
}

function latest(n) {
  if (n.type === 'project') return Math.max(0, ...n.sessions.map(s => s.time?.created ?? 0))
  return Math.max(0, ...n.children.map(latest))
}

function sortTree(n) {
  n.children.sort((a, b) => { const t = latest(b) - latest(a); return t || a.name.localeCompare(b.name) })
  for (const c of n.children) sortTree(c)
}

function filterTree(n, term) {
  if (!term) { n._v = true; for (const c of n.children) filterTree(c, ''); return }
  const q = term.toLowerCase()
  let self = false
  if (n.type === 'project') {
    self = leaf(n.full).toLowerCase().includes(q) ||
      n.sessions.some(s => (s.title || '').toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
  }
  if (!self && n.full) {
    const p = parent(n.full)
    if (p) self = p.toLowerCase().includes(q)
  }
  if (!self && n.type === 'dir' && n.name) {
    self = n.name.toLowerCase().includes(q)
  }
  for (const c of n.children) filterTree(c, term)
  n._v = self || n.children.some(c => c._v)
}

function applyExp(n) {
  if (n.type === 'project' && expanded.has(n.full)) n.expanded = true
  for (const c of n.children) applyExp(c)
}

const expanded = new Set()

/* ── Render (nested UL/LI with CSS tree lines) ── */

function ulHtml(nodes) {
  const visible = nodes.filter(n => n._v)
  if (!visible.length) return ''
  let html = '<ul>'
  for (const n of visible) html += liHtml(n)
  return html + '</ul>'
}

function liHtml(n) {
  const isProject = n.type === 'project'
  let inner

  if (isProject) {
    const cnt = n.sessions.length
    const arrow = n.expanded ? '▾' : '▸'
    inner = \`<div class="node project" data-path="\${esc(n.full)}">
      <span class="arrow \${n.expanded ? 'open' : ''}">\${arrow}</span>
      <span class="icon project">📂</span>
      <span class="plabel">\${hl(leaf(n.full), searchTerm)}</span>
      <span class="badge">\${cnt}</span>
    </div>\`
    const sorted = [...n.sessions].sort((a, b) => (b.time?.created ?? 0) - (a.time?.created ?? 0))
    const sess = sorted.map(s => {
      const href = '/' + b64(norm(n.full)) + '/session/' + s.id + (authToken ? '?auth_token=' + authToken : '')
      return \`<a class="sess-item" href="\${href}" title="\${esc(s.title || '')}">
        <span class="dot"></span>
        <span class="title">\${hl(s.title || '(无标题)', searchTerm)}</span>
        <span class="sid">\${hl(s.id.slice(0, 10), searchTerm)}</span>
        <span class="time">\${fmtTime(s.time?.updated)}</span>
      </a>\`
    }).join('')
    inner += \`<div class="sess-wrap \${n.expanded ? 'open' : ''}">\${sess}</div>\`
    if (n.children.length) inner += ulHtml(n.children)
  } else {
    const kidsHtml = ulHtml(n.children)
    inner = \`<div class="node dir">
      <span class="icon dir">📁</span>
      <span class="label">\${hl(n.name, searchTerm)}</span>
    </div>\${kidsHtml}\`
  }

  return '<li>' + inner + '</li>'
}

function render(root) {
  const c = document.getElementById('container')
  const kids = root.children.filter(n => n._v)
  if (!kids.length) {
    c.innerHTML = '<div class="empty"><div class="big">📂</div><div class="hint">' +
      (searchTerm ? '没有匹配的会话' : '暂无会话') + '</div></div>'
    stats(); return
  }

  c.innerHTML = '<div class="tree">' + ulHtml(kids) + '</div>'
  stats()

  // Bind project clicks
  c.querySelectorAll('.node.project').forEach(el => {
    el.addEventListener('click', () => {
      const path = el.dataset.path
      const wrap = el.nextElementSibling
      if (!wrap || !wrap.classList.contains('sess-wrap')) return
      const isOpen = wrap.classList.toggle('open')
      el.querySelector('.arrow').classList.toggle('open')
      if (isOpen) expanded.add(path); else expanded.delete(path)
    })
  })
}

function stats() {
  const total = allSessions.length
  const dirs = new Set(allSessions.map(s => norm(s.directory || '(unknown)')))
  document.getElementById('stats').innerHTML = \`<span>📁 \${dirs.size} 个目录</span><span>💬 \${total} 个会话</span>\`
}

/* ── Search ── */

document.getElementById('searchInput').addEventListener('input', () => {
  searchTerm = document.getElementById('searchInput').value.trim()
  refresh()
})

function filteredSessions() {
  if (!hideSub) return allSessions
  return allSessions.filter(s => !s.parentID)
}

function toggleSub() {
  hideSub = document.getElementById('hideSub').checked
  refresh()
}

function refresh() {
  const tree = build(filteredSessions())
  collapseChains(tree)
  filterTree(tree, searchTerm)
  sortTree(tree)
  applyExp(tree)
  render(tree)
}

/* ── Quick open ── */

function showModal() {
  document.getElementById('modalOverlay').classList.add('open')
  document.getElementById('pathInput').value = ''
  updateOpenLink()
  setTimeout(() => document.getElementById('pathInput').focus(), 100)
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open')
}

function updateOpenLink() {
  const input = document.getElementById('pathInput').value.trim()
  const link = document.getElementById('openLink')
  if (!input) { link.removeAttribute('href'); return }
  const resolved = resolvePath(input)
  if (!resolved) { link.removeAttribute('href'); return }
  const encoded = b64(resolved)
  link.href = '/' + encoded + '/session' + (authToken ? '?auth_token=' + authToken : '')
}

/* ── Auth ── */

function doAuth() {
  const user = document.getElementById('authUser').value || 'opencode'
  const pass = document.getElementById('authPass').value
  if (!pass) return
  authToken = btoa(user + ':' + pass).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=/g, '')
  document.getElementById('authBar').classList.remove('show')
  load()
}

function headers() {
  const h = { 'Accept': 'application/json' }
  if (authToken) h['Authorization'] = 'Basic ' + authToken
  return h
}

/* Fetch the home directory from the server via /path endpoint */
async function loadHomeDir() {
  if (!allSessions.length) return
  const dir = allSessions[0].directory
  if (!dir) return
  try {
    const url = '/path?directory=' + encodeURIComponent(dir) + (authToken ? '&auth_token=' + encodeURIComponent(authToken) : '')
    const res = await fetch(url, { headers: headers() })
    if (res.ok) {
      const data = await res.json()
      if (data.home) homeDir = data.home
    }
  } catch { /* ignore */ }
}

async function load() {
  const status = document.getElementById('status')
  status.className = 'status'
  status.textContent = '⏳ 加载中…'
  try {
    const url = authToken ? API + '?auth_token=' + encodeURIComponent(authToken) : API
    const res = await fetch(url, { headers: headers() })
    if (res.status === 401) {
      status.textContent = '🔒 需要认证'
      document.getElementById('authBar').classList.add('show')
      return
    }
    if (!res.ok) { status.textContent = '❌ ' + res.status + ' ' + res.statusText; status.classList.add('error'); return }
    allSessions = await res.json()
    if (!Array.isArray(allSessions)) allSessions = []
    status.textContent = ''
    loadHomeDir()
    refresh()
  } catch (e) {
    status.textContent = '❌ 网络错误: ' + e.message
    status.classList.add('error')
  }
}

// Handle ?path= query param — redirect directly to opencode
const pathParam = new URLSearchParams(location.search).get('path')
if (pathParam) {
  const resolved = resolvePath(pathParam)
  if (resolved)
    location.href = '/' + b64(resolved) + '/session' + (authToken ? '?auth_token=' + authToken : '')
} else {
  load()
}
</script>
</body>
</html>
`

export const portalResponse = lazy(() =>
  HttpServerResponse.raw(portalHtml, {
    headers: { "content-type": "text/html; charset=utf-8" },
  }),
)
