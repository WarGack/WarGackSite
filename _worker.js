// _worker.js — Cloudflare Pages / Workers demo
// Simple registration/login with "remember me" using KV namespaces
// Bindings required in your Pages project:
// - USERS_KV (KV Namespace) for storing users
// - SESSIONS_KV (KV Namespace) for storing sessions

// NOTE: This is a demo. Do NOT use in production as-is without improvements
// (rate-limiting, email verification, stronger password policies, secure cookie flags, SQL/kv injection checks, CSRF protection, HTTPS enforcement, account recovery, etc.)

const SESSION_COOKIE_NAME = 'demo_session';
const REMEMBER_SECONDS = 30 * 24 * 60 * 60; // 30 days
const DEFAULT_SESSION_SECONDS = 24 * 60 * 60; // 1 day

function b64(buf) { return Buffer.from(buf).toString('base64'); }
function fromB64(s) { return Buffer.from(s, 'base64'); }
function hex(buf) { return Buffer.from(buf).toString('hex'); }
function fromHex(h) { return Buffer.from(h, 'hex'); }

// Helper: read JSON body safely
async function readJSON(request) {
  try {
    return await request.json();
  } catch (e) {
    return null;
  }
}

// Password hashing using Web Crypto PBKDF2
async function hashPassword(password, salt=null) {
  const enc = new TextEncoder();
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(16));
  } else {
    salt = fromB64(salt);
  }
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { salt: b64(salt), hash: b64(new Uint8Array(derivedBits)) };
}

async function verifyPassword(password, stored) {
  // stored: { salt: base64, hash: base64 }
  const got = await hashPassword(password, stored.salt);
  return got.hash === stored.hash;
}

// Sessions
async function createSession(env, username, remember=false) {
  const idBytes = crypto.getRandomValues(new Uint8Array(32));
  const sid = b64(idBytes);
  const ttl = remember ? REMEMBER_SECONDS : DEFAULT_SESSION_SECONDS;
  const sessionObj = { username, created: Date.now(), ttl };
  // store in KV with ttl
  await env.SESSIONS_KV.put(sid, JSON.stringify(sessionObj), { expirationTtl: ttl });
  return { sid, ttl };
}

async function getSession(env, sid) {
  if (!sid) return null;
  const raw = await env.SESSIONS_KV.get(sid);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) { return null; }
}

async function deleteSession(env, sid) {
  if (!sid) return;
  await env.SESSIONS_KV.delete(sid);
}

// Utilities for cookies
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.split('=');
    if (!k) continue;
    out[k.trim()] = rest.join('=').trim();
  }
  return out;
}

function makeSetCookie(sid, ttl) {
  // HttpOnly; Secure; SameSite=Lax
  const expires = new Date(Date.now() + ttl * 1000).toUTCString();
  return `${SESSION_COOKIE_NAME}=${sid}; Path=/; Expires=${expires}; HttpOnly; SameSite=Lax; Secure`;
}

// HTML page served at GET /
function indexHTML() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Demo — Hidden content after login</title>
  <style>body{font-family:system-ui,Segoe UI,Roboto,Arial;max-width:760px;margin:40px auto;padding:0 16px} .hidden{display:none;background:#f4f4f4;padding:16px;border-radius:8px;margin-top:12px}</style>
</head>
<body>
  <h1>Тестовая страница — скрытый текст после входа</h1>
  <div id="public">
    <p>Это публичный текст, доступный всем.</p>
  </div>

  <div id="logged-out">
    <h2>Войти / Регистрация</h2>
    <form id="loginForm">
      <input name="username" placeholder="Логин" required /> <br/><br/>
      <input name="password" type="password" placeholder="Пароль" required /> <br/><br/>
      <label><input type="checkbox" name="remember" /> Запомнить меня</label> <br/><br/>
      <button type="submit">Войти</button>
    </form>
    <hr/>
    <form id="registerForm">
      <input name="rusername" placeholder="Новый логин" required /> <br/><br/>
      <input name="rpassword" type="password" placeholder="Новый пароль" required /> <br/><br/>
      <button type="submit">Зарегистрироваться</button>
    </form>
  </div>

  <div id="logged-in" class="hidden">
    <h2>Вы вошли как <span id="who"></span></h2>
    <button id="logout">Выйти</button>
    <div class="hidden" id="secret">
      <h3>Скрытый текст (только для вошедших)</h3>
      <p>Поздравляем — вы видите секретный текст!</p>
    </div>
  </div>

  <script>
    async function jsonFetch(url, opts) {
      opts = opts || {};
      if (!opts.headers) opts.headers = {};
      opts.headers['Accept'] = 'application/json';
      const res = await fetch(url, opts);
      try { return await res.json(); } catch (e) { return null; }
    }

    async function checkSession() {
      const data = await jsonFetch('/api/session');
      if (data && data.username) {
        document.getElementById('logged-out').classList.add('hidden');
        document.getElementById('logged-in').classList.remove('hidden');
        document.getElementById('who').textContent = data.username;
        document.getElementById('secret').classList.remove('hidden');
      } else {
        document.getElementById('logged-out').classList.remove('hidden');
        document.getElementById('logged-in').classList.add('hidden');
      }
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const body = { username: f.username.value, password: f.password.value, remember: f.remember.checked };
      const resp = await jsonFetch('/api/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (resp && resp.ok) {
        checkSession();
      } else {
        alert(resp?.error || 'Ошибка входа');
      }
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const body = { username: f.rusername.value, password: f.rpassword.value };
      const resp = await jsonFetch('/api/register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (resp && resp.ok) {
        alert('Зарегистрированы. Войдите.');
      } else {
        alert(resp?.error || 'Ошибка регистрации');
      }
    });

    document.getElementById('logout').addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      checkSession();
    });

    checkSession();
  </script>
</body>
</html>`;
}

// Main fetch handler
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // API endpoints
    if (pathname === '/api/register' && request.method === 'POST') {
      const body = await readJSON(request);
      if (!body || !body.username || !body.password) return new Response(JSON.stringify({ ok: false, error: 'Missing fields' }), { status: 400, headers: { 'Content-Type':'application/json' }});
      const username = String(body.username).toLowerCase();
      const exists = await env.USERS_KV.get(username);
      if (exists) return new Response(JSON.stringify({ ok:false, error: 'Пользователь уже существует' }), { status: 409, headers: { 'Content-Type':'application/json' }});
      const hashed = await hashPassword(body.password);
      const store = { salt: hashed.salt, hash: hashed.hash, created: Date.now() };
      await env.USERS_KV.put(username, JSON.stringify(store));
      return new Response(JSON.stringify({ ok:true }), { status: 200, headers: { 'Content-Type':'application/json' }});
    }

    if (pathname === '/api/login' && request.method === 'POST') {
      const body = await readJSON(request);
      if (!body || !body.username || !body.password) return new Response(JSON.stringify({ ok:false, error:'Missing fields' }), { status:400, headers:{'Content-Type':'application/json'}});
      const username = String(body.username).toLowerCase();
      const storedRaw = await env.USERS_KV.get(username);
      if (!storedRaw) return new Response(JSON.stringify({ ok:false, error:'Неверный логин или пароль' }), { status:401, headers:{'Content-Type':'application/json'}});
      const stored = JSON.parse(storedRaw);
      const ok = await verifyPassword(body.password, stored);
      if (!ok) return new Response(JSON.stringify({ ok:false, error:'Неверный логин или пароль' }), { status:401, headers:{'Content-Type':'application/json'}});

      const remember = !!body.remember;
      const { sid, ttl } = await createSession(env, username, remember);
      const headers = new Headers({ 'Content-Type':'application/json' });
      headers.append('Set-Cookie', makeSetCookie(sid, ttl));
      return new Response(JSON.stringify({ ok:true }), { status:200, headers });
    }

    if (pathname === '/api/logout' && request.method === 'POST') {
      const cookie = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE_NAME];
      if (cookie) await deleteSession(env, cookie);
      // Clear cookie
      const headers = new Headers();
      headers.append('Set-Cookie', `${SESSION_COOKIE_NAME}=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax; Secure`);
      return new Response(JSON.stringify({ ok:true }), { status:200, headers });
    }

    if (pathname === '/api/session' && request.method === 'GET') {
      const cookie = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE_NAME];
      if (!cookie) return new Response(JSON.stringify({}), { status:200, headers:{ 'Content-Type':'application/json' }});
      const session = await getSession(env, cookie);
      if (!session) return new Response(JSON.stringify({}), { status:200, headers:{ 'Content-Type':'application/json' }});
      return new Response(JSON.stringify({ username: session.username }), { status:200, headers:{ 'Content-Type':'application/json' }});
    }

    // Serve index for everything else (simple demo)
    if (request.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      return new Response(indexHTML(), { status:200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    return new Response('Not found', { status:404 });
  }
};
