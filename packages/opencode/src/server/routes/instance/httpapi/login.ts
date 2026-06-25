import { lazy } from "@/util/lazy"
import { HttpServerResponse } from "effect/unstable/http"

const loginHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenCode Login</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: #f6f8fa; color: #1f2328;
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
  }
  .card {
    background: #fff; border-radius: 12px; padding: 32px;
    width: 360px; max-width: 90vw;
    box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 8px 32px rgba(0,0,0,.06);
  }
  .card h1 {
    font-size: 20px; font-weight: 600; text-align: center;
    margin-bottom: 24px; letter-spacing: -.02em;
  }
  .card h1 img { height: 1.2em; vertical-align: middle; margin-right: 6px; }
  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; color: #656d76; }
  .field input {
    width: 100%; padding: 8px 12px;
    border: 1px solid #d0d7de; border-radius: 8px;
    font-size: 14px; outline: none; transition: border-color .15s, box-shadow .15s;
  }
  .field input:focus {
    border-color: #0969da;
    box-shadow: 0 0 0 3px rgba(9,105,218,.15);
  }
  .btn {
    width: 100%; padding: 8px 16px;
    background: #0969da; color: #fff; border: none; border-radius: 8px;
    font-size: 14px; font-weight: 500; cursor: pointer;
  }
  .btn:hover { background: #0860ca; }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .error {
    margin-top: 12px; padding: 8px 12px;
    background: #ffebe9; color: #cf222e;
    border: 1px solid #ffc2c2; border-radius: 8px;
    font-size: 13px; display: none;
  }
  .hint {
    margin-top: 16px; text-align: center;
    font-size: 12px; color: #8b949e;
  }
</style>
</head>
<body>
<div class="card">
  <h1><img src="/favicon-v3.ico"/> OpenCode</h1>
  <form id="loginForm">
    <div class="field">
      <label for="username">用户名</label>
      <input id="username" type="text" placeholder="opencode" value="opencode" autocomplete="username">
    </div>
    <div class="field">
      <label for="password">密码</label>
      <input id="password" type="password" placeholder="输入密码" autocomplete="current-password">
    </div>
    <button class="btn" id="loginBtn" type="submit">登录</button>
    <div class="error" id="errorMsg"></div>
  </form>
  <div class="hint">登录后自动跳转到 OpenCode Portal</div>
</div>
<script>
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const btn = document.getElementById('loginBtn')
  const err = document.getElementById('errorMsg')
  const user = document.getElementById('username').value
  const pass = document.getElementById('password').value
  if (!pass) { err.textContent = '请输入密码'; err.style.display = 'block'; return }
  btn.disabled = true
  err.style.display = 'none'
  const token = btoa(user + ':' + pass)
  try {
    const res = await fetch('/experimental/session', {
      headers: { 'Authorization': 'Basic ' + token },
    })
    if (res.ok) {
      location.href = '/home'
    } else if (res.status === 401) {
      err.textContent = '用户名或密码错误'
      err.style.display = 'block'
    } else {
      err.textContent = '登录失败: ' + res.status
      err.style.display = 'block'
    }
  } catch (e) {
    err.textContent = '网络错误: ' + e.message
    err.style.display = 'block'
  } finally {
    btn.disabled = false
  }
})
</script>
</body>
</html>`

export const loginResponse = lazy(() =>
  HttpServerResponse.raw(loginHtml, {
    headers: { "content-type": "text/html; charset=utf-8" },
  }),
)
