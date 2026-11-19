#!/usr/bin/env node
/* SALA DE AGENTES · SALA DE REVISIÓN DE APPS (corre sola cada 2 horas en GitHub Actions).
   Equipo: un inspector por app (Vector · VORTEX, Hubble · Nova HUB, Synapse · Neural Brain, Tinta · INKBOT PRO, Eco · Sala, Lira · Moldes Gaby's)
   → Centinela (bots y servidores) → Cerbero (huecos de seguridad, sin atacar) → Quasar (vuelve a probar cada falla, una por una) → Andrómeda (tu informe).
   Herramientas REALES (la IA solo explica; no inventa datos):
   · inspect_<app> — abre la app con Chromium en PC y celular, mide la carga, junta errores de código y respuestas fallidas del servidor,
                      aprieta sus botones (nunca los que borran, pagan, operan, cierran sesión o publican) y revisa sus tareas automáticas de GitHub.
   · sentinel      — Motor de VORTEX, velas, servidores de avisos e IA, tus bots de Nova Bot Lab (¿se apagó o se atoró alguno?), Claudio,
                      el modo automático de la Sala y cuántas personas usaron VORTEX/Sala (cuentas que entraron en 24 h y 7 días).
   · retest        — Quasar repite cada falla sola, con la app recién abierta, para descartar falsas alarmas.
   Se guarda en users/<tú>/data/sala_revision (estado por app, fallas con «nueva / sigue / resuelta» e historial de sesiones).
   Si aparece una falla grave NUEVA, un bot se apaga o una app se cae, te llega un aviso al celular. Nada se cambia solo. */
'use strict';
const L = require('./lib.js');
const SKIP = /borrar|elimin|desconect|cerrar sesi|salir|logout|reset|restablec|comprar|vender|pagar|suscrib|cerrar posici|importar|exportar|limpiar|quitar|papelera|cancelar orden|inicia(r)? sesi|google|instalar|descargar|discord|unirme|publicar|enviar|whatsapp|llamar|compartir|share|delete|remove|sign ?out/i;
const NOISE = /Failed to load resource|favicon|ERR_BLOCKED|net::ERR_|gstatic|googleapis|firebase.*offline|Cross-Origin-Opener|third-party cookie|Permissions-Policy|was preloaded|deprecat/i;
const DEVS = [{name: 'PC', vp: {width: 1366, height: 800}, mobile: false}, {name: 'celular', vp: {width: 390, height: 844}, mobile: true}];
const H = 36e5, clip = L.clip;
const ghHead = () => ({accept: 'application/vnd.github+json', 'user-agent': 'sala-de-agentes', ...(process.env.GITHUB_TOKEN ? {authorization: 'Bearer ' + process.env.GITHUB_TOKEN} : {})});
const ago = t => !t ? 'nunca' : (Date.now() - t) < H ? Math.round((Date.now() - t) / 6e4) + ' min' : ((Date.now() - t) / H).toFixed(1) + ' h';

/* ───────── navegador ───────── */
async function openApp(browser, app, dev) {
  const errs = [], http = [];
  const ctx = await browser.newContext({viewport: dev.vp, isMobile: dev.mobile, hasTouch: dev.mobile, deviceScaleFactor: dev.mobile ? 2 : 1, locale: 'es-MX', timezoneId: 'America/Mexico_City'});
  const page = await ctx.newPage(); page.__where = 'al abrir';
  page.on('pageerror', e => errs.push({kind: 'js', msg: clip(e.message, 220), where: page.__where}));
  page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errs.push({kind: 'console', msg: clip(m.text(), 220), where: page.__where}); });
  const origin = new URL(app.url).origin;
  page.on('response', r => { const u = r.url(), st = r.status(); if (st >= 500 || (st >= 400 && u.startsWith(origin) && !/favicon|\.map$/.test(u))) http.push(`${st} ${clip(u.split('?')[0], 140)}`); });
  const t0 = Date.now(); let main = null, err = '';
  try { main = await page.goto(app.url, {waitUntil: 'load', timeout: 45000}); } catch (e) { err = clip(e.message.split('\n')[0], 200); }
  await page.waitForTimeout(3000);
  const loadMs = Date.now() - t0, status = main ? main.status() : 0;
  for (let i = 0; i < 2; i++) await page.keyboard.press('Escape').catch(() => {});
  const text = await page.evaluate(() => (document.body && document.body.innerText || '').trim().length).catch(() => 0);
  return {ctx, page, errs, http, loadMs, status, err, blank: text < 15};
}
const sigOf = page => page.evaluate(() => { const t = document.body ? document.body.innerHTML : ''; let k = 0; for (let i = 0; i < t.length; i += 3) k = (k * 33 + t.charCodeAt(i)) | 0; return k + ':' + location.href; }).catch(() => 'x');
async function buttons(page, max) {
  return page.$$eval('button, [role="button"], a[href^="#"], .btn, [data-a]', (els, a) => {
    const re = new RegExp(a.skip, 'i'), out = [], seen = new Set();
    for (const e of els) {
      const r = e.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const st = getComputedStyle(e); if (st.visibility === 'hidden' || st.pointerEvents === 'none' || e.disabled || st.display === 'none') continue;
      if (e.getAttribute('aria-current') === 'page' || e.getAttribute('aria-selected') === 'true') continue; // ya estás ahí: tocarlo no tiene por qué cambiar nada
      const name = (e.getAttribute('aria-label') || e.getAttribute('title') || (e.innerText || e.textContent || '').trim().split('\n')[0] || '').replace(/\s+/g, ' ').trim().slice(0, 48); // solo la primera línea: «Crear sala», no todo el texto de la tarjeta
      const hr = e.getAttribute('href'); if (!name || re.test(name) || (hr && /^https?:/.test(hr))) continue;
      if (hr && hr.startsWith('#') && (hr === location.hash || ((hr === '#/' || hr === '#') && (location.hash === '' || location.hash === '#/')))) continue; // enlace a la misma página: no tiene por qué cambiar nada
      if (seen.has(name)) continue; seen.add(name);
      // toca el centro de la parte VISIBLE (una tarjeta cortada por abajo tenía su centro fuera de la pantalla y se contaba como «no hace nada»)
      out.push({name, x: (Math.max(r.left, 0) + Math.min(r.right, innerWidth)) / 2, y: (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2});
    }
    return out.slice(0, a.max);
  }, {skip: SKIP.source, max}).catch(() => []);
}
async function pressByName(page, name) {
  const b = (await buttons(page, 80)).find(x => x.name === name); if (!b) return null;
  const s0 = await sigOf(page); page.__where = `al tocar «${name}»`;
  try { await page.mouse.click(b.x, b.y); } catch { return null; }
  await page.waitForTimeout(700); const s1 = await sigOf(page);
  return s0 !== s1;
}

async function inspectApp(browser, app) {
  const out = {app: app.id, name: app.name, url: app.url, devs: [], errors: [], http: [], dead: [], tried: 0, down: false, blank: false, loadMs: 0, actions: null, ping: null};
  for (const dev of DEVS) {
    let o; try { o = await openApp(browser, app, dev); } catch (e) { out.devs.push({dev: dev.name, err: clip(e.message, 160)}); continue; }
    const d = {dev: dev.name, status: o.status, loadMs: o.loadMs, blank: o.blank, err: o.err, tried: 0, dead: []};
    if (!o.status || o.status >= 400 || o.err) out.down = true;
    if (o.blank) out.blank = true;
    if (!out.down) {
      const list = await buttons(o.page, 30), home = o.page.url();
      for (const b of list) {
        const r = await pressByName(o.page, b.name); if (r === null) continue; d.tried++; if (!r) d.dead.push(b.name);
        if (o.page.url() !== home) { await o.page.goto(home, {waitUntil: 'load', timeout: 30000}).catch(() => {}); await o.page.waitForTimeout(1500); } // vuelve al inicio para probar el siguiente botón
        for (let i = 0; i < 2; i++) await o.page.keyboard.press('Escape').catch(() => {});
      }
    }
    out.tried += d.tried; out.loadMs = Math.max(out.loadMs, o.loadMs); out.devs.push(d);
    for (const e of o.errs) out.errors.push(Object.assign({dev: dev.name}, e)); for (const h of o.http) out.http.push(`${h} (${dev.name})`);
    for (const n of d.dead) out.dead.push({name: n, dev: dev.name});
    await o.ctx.close().catch(() => {});
  }
  out.errors = [...new Map(out.errors.map(e => [e.msg, e])).values()].slice(0, 12); out.http = [...new Set(out.http)].slice(0, 10);
  out.actions = await actions(app.repo); if (app.ping) out.ping = await ping(app.ping);
  return out;
}

/* ───────── tareas automáticas de GitHub ───────── */
async function actions(repo) {
  try {
    const since = new Date(Date.now() - 26 * H).toISOString().slice(0, 19);
    const r = await fetch(`https://api.github.com/repos/soobroon-beep/${repo}/actions/runs?per_page=100&created=${encodeURIComponent('>' + since)}`, {headers: ghHead()});
    if (!r.ok) return {error: 'GitHub ' + r.status};
    const j = await r.json(), by = {};
    for (const run of j.workflow_runs || []) { const w = by[run.name] = by[run.name] || {runs: 0, fails: 0, last: null, url: ''}; w.runs++; if (run.conclusion === 'failure') { w.fails++; if (!w.url) w.url = run.html_url; } if (!w.last && run.status === 'completed') w.last = run.conclusion; }
    const broken = Object.entries(by).filter(([, w]) => w.last === 'failure').map(([n, w]) => ({name: n, fails: w.fails, runs: w.runs, url: w.url}));
    const flaky = Object.entries(by).filter(([, w]) => w.last !== 'failure' && w.fails).map(([n, w]) => ({name: n, fails: w.fails, runs: w.runs}));
    return {total: (j.workflow_runs || []).length, broken, flaky};
  } catch (e) { return {error: clip(e.message, 100)}; }
}
async function ping(url) { const t = Date.now(); try { const r = await fetch(url, {signal: AbortSignal.timeout(15000)}); return {ok: r.ok, status: r.status, ms: Date.now() - t}; } catch (e) { return {ok: false, status: 0, ms: Date.now() - t, err: clip(e.message, 80)}; } }

function inspectText(o) {
  const L2 = [`${o.name} (${o.url}).`];
  for (const d of o.devs) L2.push(d.err && !d.status ? `${d.dev}: NO ABRIÓ (${d.err}).` : `${d.dev}: respuesta ${d.status}, lista en ${(d.loadMs / 1000).toFixed(1)} s${d.blank ? ', PANTALLA EN BLANCO' : ''}; botones probados ${d.tried}, sin reacción ${d.dead.length}${d.dead.length ? ' (' + d.dead.slice(0, 8).join(', ') + ')' : ''}.`);
  L2.push(o.errors.length ? 'Errores de código: ' + o.errors.slice(0, 6).map(e => `[${e.dev}, ${e.where}] ${e.msg}`).join(' | ') : 'Sin errores de código.');
  if (o.http.length) L2.push('Respuestas fallidas: ' + o.http.slice(0, 5).join(' | '));
  const a = o.actions; if (a) L2.push(a.error ? 'Tareas automáticas: no se pudieron leer (' + a.error + ').' : `Tareas automáticas (26 h): ${a.total} ejecuciones; ${a.broken.length ? 'SIGUEN FALLANDO: ' + a.broken.map(b => `«${b.name}» (${b.fails}/${b.runs})`).join(', ') : 'ninguna sigue fallando'}${a.flaky.length ? '; fallaron a ratos pero ya se recuperaron: ' + a.flaky.map(b => `«${b.name}»`).join(', ') : ''}.`);
  if (o.ping) L2.push(`Servidor de la app: ${o.ping.ok ? 'responde' : 'NO RESPONDE'} (${o.ping.status}, ${o.ping.ms} ms).`);
  L2.push('Nota: la revisión entra sin iniciar sesión, así que solo prueba la parte pública de la app.');
  return L2.join('\n');
}

/* ───────── Centinela: bots y servidores ───────── */
async function sentinel(db, uid, admin, prev) {
  const alerts = [], ok = [], data = {};
  const add = (sev, title, ev) => alerts.push({sev, title, ev: clip(ev, 260)});
  try { const mo = (await db.doc('server/motor').get()).data() || {}; data.motor = mo.beat || 0; if (!mo.beat || Date.now() - mo.beat > 25 * 6e4) add('alta', 'El Motor de VORTEX no da señales', 'Último latido hace ' + ago(mo.beat) + '. Sin Motor no avanzan tus bots, alertas ni Claudio.'); else ok.push('Motor de VORTEX latiendo (hace ' + ago(mo.beat) + ')'); } catch (e) { add('media', 'No se pudo leer el Motor', e.message); }
  try { const c = (await db.doc('candles/BTCUSDT_1h').get()).data(); data.candles = c && c.at; if (!c || Date.now() - c.at > 3 * H) add('alta', 'Las velas de VORTEX no se actualizan', 'BTC 1h guardadas hace ' + ago(c && c.at)); else ok.push('Velas al día'); } catch {}
  for (const [n, u] of [['servidor de avisos y señales (vortex-push)', 'https://vortex-push.soobroon.workers.dev/scr/state'], ['servidor de Nova HUB (nova-hub-push)', 'https://nova-hub-push.soobroon.workers.dev/ai/status']]) { const p = await ping(u); if (!p.ok) add('alta', 'No responde el ' + n, `${p.status || p.err || 'sin respuesta'}`); else ok.push(n + ' responde (' + p.ms + ' ms)'); }

  /* tus bots */
  const now = Date.now(), live = {}, IV = {'1m': 6e4, '5m': 3e5, '15m': 9e5, '30m': 18e5, '1h': H, '2h': 2 * H, '4h': 4 * H, '1d': 24 * H};
  try {
    const bd = (await db.doc(`users/${uid}/data/botlab`).get()).data(); let S = {}; try { S = JSON.parse(bd && bd.items || '{}'); } catch {}
    const srv = (await db.doc(`users/${uid}/data/botlab_server`).get()).data() || {};
    const bots = (S.bots || []).filter(b => b.status !== 'archived' && !(S.deleted && S.deleted[b.id] >= (b.updatedAt || 0)));
    for (const b of bots) {
      const run = (b.paper || []).filter(s => s.status === 'running'); if (!run.length) continue; live[b.id] = b.name;
      for (const s of run) { const ss = ((srv.paper || {})[b.id] || []).find(x => x.id === s.id), iv = IV[s.spec && s.spec.interval] || H, t = Math.max((ss && ss.last && ss.last.t) || 0, (s.last && s.last.t) || 0); // la app o el servidor: el que lo haya avanzado más reciente
        if (!t || now - t > 3 * iv + 1.5 * H) add('alta', `El bot «${b.name}» se atoró`, `Está encendido (${s.spec && s.spec.symbol} ${s.spec && s.spec.interval}) pero el servidor no lo avanza desde hace ${ago(t)}.`);
        if (ss && ss.err) add('media', `El bot «${b.name}» reporta un error`, ss.err); }
    }
    const before = (prev && prev.live) || {};
    for (const [id, name] of Object.entries(before)) if (!live[id]) { const b = bots.find(x => x.id === id); add(b ? 'alta' : 'media', `El bot «${name}» se apagó`, b ? 'En la revisión anterior estaba encendido y ahora ya no. Si no lo apagaste tú, revísalo en Nova Bot Lab.' : 'Ya no está en Nova Bot Lab (¿lo borraste o archivaste?).'); }
    data.bots = {total: bots.length, live: Object.keys(live).length}; ok.push(`${Object.keys(live).length} de ${bots.length} bots encendidos`);
  } catch (e) { add('media', 'No se pudieron leer tus bots', e.message); }
  try { /* agentes autónomos Claudio y Felipe: si están encendidos, su sesión del servidor debe actualizarse cada hora */
    const bd = (await db.doc(`users/${uid}/data/botlab`).get()).data(); let items = {}; try { items = JSON.parse(bd && bd.items || '{}') || {}; } catch {}
    const legacy = (await db.doc(`users/${uid}/data/claudio`).get()).data() || null;
    for (const k of ['claudio', 'felipe']) {
      const a = items[k] || null, cfg = a && a.cfg && (!legacy || k !== 'claudio' || (a.cfg.at || 0) >= (legacy.at || 0)) ? a.cfg : (k === 'claudio' ? legacy : null);
      if (!cfg || !cfg.enabled) continue; const sd = (await db.doc(`users/${uid}/data/${k}_server`).get()).data(), t = sd && sd.updatedAt && sd.updatedAt.toMillis ? sd.updatedAt.toMillis() : 0, nm = k === 'claudio' ? 'Claudio' : 'Felipe';
      if (!t || now - t > 3 * H) add('alta', `${nm} está encendido pero no avanza`, 'Su sesión del servidor se actualizó hace ' + ago(t) + ' (debería ser cada hora).'); else ok.push(`${nm} avanzando (hace ${ago(t)})`);
      if (sd && sd.summary && (sd.summary.kill || sd.summary.halted)) add('media', `${nm} está detenido`, sd.summary.kill ? 'Se activó el interruptor de emergencia.' : 'Se detuvo por sus límites de riesgo.');
    }
  } catch {}
  try { const sa = (await db.doc(`users/${uid}/data/sala_auto`).get()).data(); if (!sa || now - (sa.at || 0) > 8 * H) add('media', 'El modo automático del Taller no ha corrido', 'Última vez hace ' + ago(sa && sa.at)); else ok.push('Taller automático corrió hace ' + ago(sa.at) + (sa.status && sa.status.taller ? ' · ' + sa.status.taller : '')); } catch {}
  try { const vg = (await db.doc(`users/${uid}/data/vigia`).get()).data(); if (vg) { const items = Array.isArray(vg.items) ? vg.items : []; const nuevas = items.filter(i => i.status === 'nuevo'); data.vigia = nuevas.length; if (nuevas.length) ok.push(`El Vigía de VORTEX tiene ${nuevas.length} hallazgo(s) por revisar en VORTEX › Configuración › Vigía`); } } catch {}
  /* tráfico: cuentas que usaron VORTEX / la Sala (misma cuenta de Google) */
  try { let page, d1 = 0, d7 = 0, tot = 0; do { const r = await admin.auth().listUsers(1000, page); page = r.pageToken; for (const u of r.users) { tot++; const t = Date.parse(u.metadata.lastRefreshTime || u.metadata.lastSignInTime || 0) || 0; if (now - t < 24 * H) d1++; if (now - t < 7 * 24 * H) d7++; } } while (page);
    data.traffic = {d1, d7, total: tot}; ok.push(`Personas en VORTEX/Sala: ${d1} en 24 h, ${d7} en 7 días (${tot} cuentas)`);
    const pt = prev && prev.traffic; if (pt && pt.d7 >= 5 && d7 < pt.d7 * 0.5) add('media', 'Bajó mucho el uso de VORTEX', `De ${pt.d7} a ${d7} personas activas en 7 días.`);
  } catch (e) { ok.push('Tráfico: no se pudo leer (' + clip(e.message, 60) + ')'); }
  const text = (alerts.length ? 'PROBLEMAS:\n' + alerts.map(a => `- [${a.sev}] ${a.title}: ${a.ev}`).join('\n') : 'Sin problemas en bots ni servidores.') + '\nBIEN:\n' + ok.map(x => '- ' + x).join('\n');
  return {text, summary: alerts.length ? `${alerts.length} alerta(s)` : 'Bots y servidores bien', data: {alerts, ok, live, ...data}};
}

/* ───────── Cerbero: busca huecos de seguridad SIN atacar (solo lee lo que cualquiera podría ver; nunca escribe, borra ni prueba contraseñas) ───────── */
const SECRETS = [
  [/\bgsk_[A-Za-z0-9]{40,}/, 'una clave de Groq'], [/sk-ant-[A-Za-z0-9_-]{30,}/, 'una clave de Anthropic (Claude)'], [/\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/, 'una clave de OpenAI'],
  [/ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{60,}/, 'un token de GitHub'], [/xox[bpa]-[A-Za-z0-9-]{20,}/, 'un token de Slack'], [/AKIA[0-9A-Z]{16}/, 'una clave de AWS'],
  [/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|"private_key"\s*:\s*"-----BEGIN/, 'una llave privada (cuenta de servicio)'], [/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]{30,}/, 'un webhook de Discord'],
  [/\b\d{9,10}:AA[A-Za-z0-9_-]{33}\b/, 'un token de bot de Telegram'], [/sk_live_[A-Za-z0-9]{20,}/, 'una clave secreta de Stripe'], [/(?:bingx|binance)[^\n]{0,40}secret[^\n]{0,8}["'][A-Za-z0-9]{40,}["']/i, 'un secreto de exchange']
];
const PRIVATE_COLS = ['users', 'plans', 'accounts', 'keys', 'secrets', 'admin', 'private', 'payments', 'subs'];
const mask = s => s.slice(0, 6) + '…' + s.slice(-3);
async function securityScan(browser, app) {
  const out = [], add = (sev, what, ev) => out.push({sev, title: `Seguridad: ${what} en ${app.name}`, ev: clip(ev, 280)});
  const base = app.url.replace(/[^/]*$/, ''), origin = new URL(app.url).origin, scripts = new Map();
  let html = '', headers = {};
  try {
    const ctx = await browser.newContext(), page = await ctx.newPage();
    page.on('response', async r => { const u = r.url(); if (r.request().resourceType() === 'script' && u.startsWith(origin) && !scripts.has(u)) scripts.set(u, await r.text().catch(() => '')); });
    const main = await page.goto(app.url, {waitUntil: 'load', timeout: 45000}); headers = main ? main.headers() : {}; html = main ? await main.text().catch(() => '') : '';
    await page.waitForTimeout(2500); await ctx.close();
  } catch (e) { return {list: out, text: `${app.name}: no se pudo abrir para revisar seguridad (${clip(e.message, 80)}).`}; }
  const code = [['la página', html], ...[...scripts].map(([u, t]) => [u.replace(origin, ''), t])];
  /* 1) claves secretas metidas en el código público */
  const seen = new Set();
  for (const [where, t] of code) for (const [re, what] of SECRETS) { const m = re.exec(t || ''); if (m && !seen.has(what)) { seen.add(what); add('alta', `${what} visible en el código`, `Cualquiera que abra ${where} la puede copiar (${mask(m[0])}). Muévela a un secreto del servidor y cámbiala por una nueva.`); } }
  /* 2) base de datos y archivos de Firebase abiertos sin iniciar sesión (solo lectura) */
  const all = code.map(x => x[1]).join('\n'), projs = new Map();
  for (const m of all.matchAll(/projectId\s*[:=]\s*["']([a-z0-9-]{4,40})["'][\s\S]{0,400}?/g)) projs.set(m[1], null);
  for (const m of all.matchAll(/apiKey\s*[:=]\s*["'](AIza[0-9A-Za-z_-]{35})["']/g)) for (const k of projs.keys()) if (!projs.get(k)) projs.set(k, m[1]);
  for (const [pid, key] of projs) {
    for (const col of PRIVATE_COLS) { try { const r = await fetch(`https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/${col}?pageSize=1${key ? '&key=' + key : ''}`, {signal: AbortSignal.timeout(10000)}); if (r.ok) { const j = await r.json().catch(() => ({})); if ((j.documents || []).length) add('alta', `la colección «${col}» se puede leer sin iniciar sesión`, `Firestore del proyecto ${pid}: cualquiera puede leer «${col}». Cierra las reglas para que cada quien lea solo lo suyo (request.auth.uid).`); } } catch {} }
    for (const b of [`${pid}.appspot.com`, `${pid}.firebasestorage.app`]) { try { const r = await fetch(`https://firebasestorage.googleapis.com/v0/b/${b}/o?maxResults=1`, {signal: AbortSignal.timeout(10000)}); if (r.ok) { const j = await r.json().catch(() => ({})); if ((j.items || []).length) add('media', 'los archivos de Storage se pueden listar sin iniciar sesión', `Bucket ${b}: cualquiera puede ver la lista de tus archivos. Pide sesión en las reglas de Storage.`); } } catch {} }
  }
  /* 3) archivos que nunca deberían estar publicados */
  for (const [p, test, what] of [['.git/config', /\[core\]/, 'la carpeta .git (tu historial de código)'], ['.env', /^[A-Z_]+=.+/m, 'un archivo .env con variables'], ['serviceAccount.json', /private_key/, 'una cuenta de servicio'], ['firebase-service-account.json', /private_key/, 'una cuenta de servicio']]) {
    try { const r = await fetch(base + p, {signal: AbortSignal.timeout(10000), redirect: 'manual'}); if (r.ok && test.test(await r.text())) add('alta', `${what} está publicada`, `${base + p} se puede descargar. Quítala del sitio publicado (y cambia lo que contenga si es secreto).`); } catch {}
  }
  /* 4) servidores que aceptan llamadas de cualquier página */
  for (const u of [app.ping].filter(Boolean)) { try { const r = await fetch(u, {headers: {origin: 'https://sitio-ajeno.example'}, signal: AbortSignal.timeout(10000)}); const ao = r.headers.get('access-control-allow-origin') || ''; if (ao === 'https://sitio-ajeno.example') add('media', 'su servidor acepta llamadas de cualquier página', `${u} responde a una página ajena (refleja el origen). Limita ALLOWED_ORIGIN a tus apps.`); } catch {} }
  /* 5) protección contra que otra página la meta en un marco (solo donde se puede configurar: Cloudflare Pages) */
  if (/\.pages\.dev$/.test(new URL(app.url).hostname) && !headers['x-frame-options'] && !/frame-ancestors/.test(headers['content-security-policy'] || '')) add('baja', 'otra página la puede meter en un marco (clickjacking)', 'Falta X-Frame-Options o frame-ancestors. Agrega un archivo _headers con «X-Frame-Options: DENY».');
  const text = `${app.name}: ${scripts.size} archivos de código revisados, ${projs.size} proyecto(s) de Firebase. ${out.length ? 'HALLAZGOS: ' + out.map(o => `[${o.sev}] ${o.title.replace(/^Seguridad: /, '')}`).join(' | ') : 'Sin huecos encontrados.'}`;
  return {list: out, text};
}

/* ───────── Quasar: repite cada falla sola ───────── */
async function retest(browser, results) {
  const out = {};
  for (const o of results) {
    const r = out[o.app] = {confirmedDead: [], falseDead: [], errorsAgain: [], errorsGone: [], down: o.down, blank: o.blank};
    if (o.down) { await new Promise(ok => setTimeout(ok, 15000)); const app = {url: o.url}; let x; try { x = await openApp(browser, app, DEVS[0]); r.down = !x.status || x.status >= 400 || !!x.err; r.blank = x.blank; await x.ctx.close(); } catch { r.down = true; } continue; }
    const devs = [...new Set(o.dead.map(d => d.dev).concat(o.errors.map(e => e.dev)))];
    for (const devName of devs) {
      const dev = DEVS.find(d => d.name === devName); const dead = o.dead.filter(d => d.dev === devName).slice(0, 8);
      for (const d of dead) { let x; try { x = await openApp(browser, {url: o.url}, dev); const moved = await pressByName(x.page, d.name); (moved === false ? r.confirmedDead : r.falseDead).push(`${d.name} (${devName})`); await x.ctx.close(); } catch { r.falseDead.push(`${d.name} (${devName})`); } }
      const errs = o.errors.filter(e => e.dev === devName).slice(0, 6);
      if (errs.length) { let x; try { x = await openApp(browser, {url: o.url}, dev); for (const e of errs) { if (e.where !== 'al abrir') { const n = /«(.+)»/.exec(e.where); if (n) await pressByName(x.page, n[1]); } } await x.page.waitForTimeout(800);
        for (const e of errs) (x.errs.some(z => z.msg === e.msg) ? r.errorsAgain : r.errorsGone).push(`[${devName}, ${e.where}] ${e.msg}`); await x.ctx.close(); } catch { for (const e of errs) r.errorsAgain.push(`[${devName}, ${e.where}] ${e.msg}`); } }
    }
  }
  return out;
}
function retestText(rt, names) {
  return Object.entries(rt).map(([id, r]) => { const n = names[id]; const p = [];
    if (r.down) p.push('SIGUE SIN ABRIR'); if (r.blank) p.push('sigue en blanco');
    if (r.confirmedDead.length) p.push('botones sin reacción CONFIRMADOS: ' + r.confirmedDead.join(', ')); if (r.falseDead.length) p.push('falsa alarma (sí reaccionan solos): ' + r.falseDead.join(', '));
    if (r.errorsAgain.length) p.push('errores que SE REPITEN: ' + r.errorsAgain.slice(0, 4).join(' | ')); if (r.errorsGone.length) p.push('errores que no se repitieron (pasajeros): ' + r.errorsGone.length);
    return `${n}: ${p.length ? p.join('; ') : 'nada que volver a probar'}.`; }).join('\n');
}

/* ───────── fallas definitivas (sin IA) y su historial ───────── */
function issuesOf(results, rt, sen, sec) {
  const out = [], add = (app, sev, title, ev) => out.push({id: (app + '|' + title).toLowerCase().replace(/\d+(\.\d+)?/g, 'N').replace(/\s+/g, ' ').slice(0, 160), app, sev, title: clip(title, 140), ev: clip(ev, 300)});
  for (const o of results) { const r = rt[o.app] || {};
    if (r.down) add(o.app, 'alta', `${o.name} no abre`, o.devs.map(d => `${d.dev}: ${d.status || d.err}`).join(' · '));
    if (r.blank && !r.down) add(o.app, 'alta', `${o.name} se queda en blanco`, 'La página abre pero no muestra contenido.');
    for (const e of (r.errorsAgain || [])) add(o.app, /al abrir/.test(e) ? 'alta' : 'media', `Error de código en ${o.name}`, e);
    if ((r.confirmedDead || []).length) add(o.app, 'media', `${r.confirmedDead.length} botón(es) de ${o.name} no hacen nada`, r.confirmedDead.join(', '));
    for (const h of o.http.slice(0, 3)) if (/^5/.test(h)) add(o.app, 'media', `El servidor de ${o.name} respondió con error`, h);
    const slow = Math.max(0, ...o.devs.map(d => d.loadMs || 0)); if (!r.down && slow > 15000) add(o.app, 'baja', `${o.name} tarda en abrir`, `${(slow / 1000).toFixed(1)} s`);
    for (const b of ((o.actions && o.actions.broken) || [])) add(o.app, b.fails >= 3 ? 'alta' : 'media', `La tarea automática «${b.name}» de ${o.name} sigue fallando`, `${b.fails} de ${b.runs} ejecuciones en 26 h · ${b.url}`);
    if (o.ping && !o.ping.ok) add(o.app, 'alta', `El servidor de ${o.name} no responde`, String(o.ping.status || o.ping.err));
  }
  for (const a of sen.alerts) add('bots', a.sev, a.title, a.ev);
  for (const [app, list] of Object.entries(sec || {})) for (const x of list) add(app, x.sev, x.title, x.ev);
  return [...new Map(out.map(x => [x.id, x])).values()];
}
function mergeIssues(prev, now, at) {
  const old = new Map((prev || []).map(x => [x.id, x])), res = [];
  for (const x of now) { const o = old.get(x.id); res.push(Object.assign({}, x, o && o.status !== 'resuelta' ? {first: o.first, seen: (o.seen || 1) + 1, status: 'sigue'} : {first: at, seen: 1, status: 'nueva'}, {last: at})); old.delete(x.id); }
  for (const o of old.values()) if (o.status !== 'resuelta' || at - (o.last || 0) < 3 * 24 * H) res.push(Object.assign({}, o, o.status === 'resuelta' ? {} : {status: 'resuelta', solvedAt: at}));
  const rank = {alta: 0, media: 1, baja: 2}, st = {nueva: 0, sigue: 1, resuelta: 2};
  return res.sort((a, b) => st[a.status] - st[b.status] || rank[a.sev] - rank[b.sev]).slice(0, 80);
}

async function main() {
  L.loadAll(); const {db, uid, admin} = await L.account();
  const R = globalThis.SalaRooms, room = R.REVISION, E = globalThis.SalaEngine, names = Object.fromEntries(R.APPS.map(a => [a.id, a.name]));
  const prev = (await L.getDoc('sala_revision')) || {};
  const {chromium} = require('playwright'); const browser = await chromium.launch();
  const results = [], tools = {}; let rt = null, sen = null;
  for (const app of R.APPS) tools['inspect_' + app.id] = async () => { L.log('Inspeccionando ' + app.name); const o = await inspectApp(browser, app); results.push(o); return {text: inspectText(o), summary: o.down ? 'NO ABRIÓ' : `${o.tried} botones · ${o.errors.length} errores · ${(o.loadMs / 1000).toFixed(1)} s`, data: {app: app.id, down: o.down, blank: o.blank, tried: o.tried, dead: o.dead.length, errors: o.errors.length, loadMs: o.loadMs, broken: o.actions && o.actions.broken ? o.actions.broken.length : 0}}; };
  tools.sentinel = async () => { L.log('Centinela: bots y servidores'); sen = await sentinel(db, uid, admin, prev.sentinel); return {text: sen.text, summary: sen.summary, data: {alerts: sen.data.alerts.length, bots: sen.data.bots, traffic: sen.data.traffic}}; };
  let sec = null;
  tools.security = async () => { L.log('Cerbero busca huecos de seguridad'); sec = {}; const T = []; for (const app of R.APPS) { const r = await securityScan(browser, app); sec[app.id] = r.list; T.push(r.text); } const n = Object.values(sec).reduce((k, l) => k + l.length, 0); return {text: T.join('\n'), summary: n ? n + ' hallazgo(s) de seguridad' : 'Sin huecos encontrados', data: {found: n}}; };
  tools.retest = async () => { L.log('Quasar vuelve a probar cada falla'); rt = await retest(browser, results); const t = retestText(rt, names); return {text: t, summary: 'Fallas repetidas una por una', data: {confirmed: Object.values(rt).reduce((n, r) => n + r.confirmedDead.length + r.errorsAgain.length + (r.down ? 1 : 0), 0)}}; };

  const run = {id: 'v' + Date.now().toString(36), room: room.id, roomName: room.name, at: Date.now(), inputs: {goal: 'Revisión automática de todas tus apps'}, events: [], outcome: null, auto: true, title: 'Revisión automática'};
  const deps = {ai: (m, o) => L.ai(m, o), tools, parseSpec: () => ({errors: []}), checks: {}};
  const emit = e => { run.events.push(L.keepEvent(e)); if (e.type === 'msg') L.log(`  ${e.fromName} → ${e.to}`); if (e.type === 'error') L.log('  error: ' + e.text); };
  const SS = await L.salaState().catch(() => ({})), mem = (SS.roomMem || {})[room.id], roomM = mem && mem.notes ? Object.assign({}, room, {memory: mem.notes}) : room;
  let ctx; try { ctx = await E.runRoom(roomM, run.inputs, deps, {emit}); } catch (e) { L.log('La sesión falló: ' + e.message); ctx = {outcome: 'error', msgs: []}; }
  /* si la IA falló a medias, las herramientas que faltan se corren igual: el informe de fallas no depende de la IA */
  for (const app of R.APPS) if (!results.find(r => r.app === app.id)) await tools['inspect_' + app.id]();
  if (!sen) await tools.sentinel(); if (!sec) await tools.security(); if (!rt) await tools.retest();
  await browser.close();
  run.outcome = ctx.outcome; run.ms = Date.now() - run.at;

  const at = Date.now(), issues = mergeIssues(prev.issues, issuesOf(results, rt, sen.data, sec), at);
  const apps = {}; for (const a of R.APPS.concat([{id: 'bots', name: 'Bots y servidores'}])) { const open = issues.filter(i => i.app === a.id && i.status !== 'resuelta'), o = results.find(r => r.app === a.id);
    apps[a.id] = {name: a.name, state: open.some(i => i.sev === 'alta') ? 'falla' : open.length ? 'atencion' : 'bien', open: open.length, loadMs: o ? o.loadMs : null, tried: o ? o.tried : null, at}; }
  const report = ((ctx.msgs || []).filter(m => m.from === 'andromeda').slice(-1)[0] || {}).text || '';
  const runs = [run].concat(Array.isArray(prev.runs) ? prev.runs : []);
  const doc = {at, next: at + 2 * H, apps, issues, report, sentinel: {live: sen.data.live, traffic: sen.data.traffic || null, bots: sen.data.bots || null, ok: sen.data.ok}, runs: L.fit(runs.slice(0, 12), 600000)};
  await L.setDoc('sala_revision', doc);
  const fresh = issues.filter(i => i.status === 'nueva' && (i.sev === 'alta' || /se apagó|se atoró/.test(i.title)));
  L.log(`Revisión guardada: ${issues.filter(i => i.status !== 'resuelta').length} fallas abiertas (${fresh.length} graves nuevas) · ${Object.values(apps).map(a => a.name + ' ' + a.state).join(' · ')}`);
  /* el repo es público: el registro solo dice QUÉ TIPO de falla tiene cada app, sin nombres de bots ni evidencia */
  const kind = t => /^Seguridad/.test(t) ? 'seguridad' : /no abre/.test(t) ? 'no abre' : /en blanco/.test(t) ? 'pantalla en blanco' : /Error de código/.test(t) ? 'error de código' : /no hacen nada/.test(t) ? 'botones sin reacción' : /tarea automática/.test(t) ? 'tarea automática fallando' : /tarda/.test(t) ? 'carga lenta' : /se atoró/.test(t) ? 'bot atorado' : /se apagó/.test(t) ? 'bot apagado' : /servidor|no responde|Motor|velas/i.test(t) ? 'servidor' : 'otra';
  for (const [id, a] of Object.entries(apps)) { const k = issues.filter(i => i.app === id && i.status !== 'resuelta').map(i => `${i.sev} ${kind(i.title)}`); if (k.length) L.log(`  ${a.name}: ${k.join(', ')}`); }
  if (fresh.length) await L.push(fresh.slice(0, 3).map(i => ({title: 'Sala de agentes · ' + clip(i.title, 60), body: clip(i.ev, 200) + ' · Detalles en Sala de agentes › Revisión de apps.', tag: 'sala-rev-' + i.id.slice(0, 40)})));
}

module.exports = {issuesOf, mergeIssues, inspectText, retestText, inspectApp, retest, securityScan, SECRETS};
if (require.main === module) main().then(() => process.exit(0), e => { console.error('Error:', e.stack || e.message); process.exit(1); });
