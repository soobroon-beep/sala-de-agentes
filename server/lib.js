/* SALA DE AGENTES · piezas del SERVIDOR (corren en GitHub Actions, sin que tengas la app abierta).
   Reutilizan EXACTAMENTE el mismo código que la app: el orquestador (js/engine.js), las salas (js/rooms.js) y las herramientas
   (js/tools.js) de este repo, más el motor de backtest, Nova Nexus y la IA de VORTEX (botlab-engine.js, nova-nexus.js, llm.js).
   Aquí solo se «imita» el navegador: window, localStorage y tu cuenta (Firestore con la cuenta de servicio en vez del inicio de sesión).
   Variables: FIREBASE_SERVICE_ACCOUNT (obligatoria), GROQ_KEY (respaldo de IA), VORTEX_DIR (copia del repo de VORTEX; por defecto ../). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');

const SALA_DIR = path.join(__dirname, '..');
const VORTEX_DIR = process.env.VORTEX_DIR || path.join(SALA_DIR, '..');
const OWNER = 'a8d56a29aa7c5208d7748a84e75e4b14c713c521136174e8a652b7a76ac19b28'; // sha-256 del correo del creador (el mismo de VORTEX)
const PUSH_URL = 'https://vortex-push.soobroon.workers.dev';
const ORIGIN = 'https://soobroon-beep.github.io';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const clip = (s, n) => { s = String(s == null ? '' : s).trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/* ───────── «navegador» mínimo ───────── */
function browserShim() {
  if (globalThis.__salaShim) return; globalThis.__salaShim = true;
  globalThis.window = globalThis; globalThis.self = globalThis;
  const mem = new Map();
  globalThis.localStorage = {getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k), clear: () => mem.clear()};
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init = {}) => {
    let url = typeof input === 'string' ? input : input.url;
    // Binance bloquea las IP de EE. UU. (donde corre GitHub Actions); su espejo público de datos sí responde
    url = url.replace('https://api.binance.com/api/v3/klines', 'https://data-api.binance.vision/api/v3/klines');
    const headers = Object.assign({}, init.headers || {});
    if (/\.soobroon\.workers\.dev\//.test(url)) headers.origin = ORIGIN; // tus Workers solo responden a tus apps
    return nativeFetch(url, Object.assign({}, init, {headers}));
  };
}
function loadScript(file) { vm.runInThisContext(fs.readFileSync(file, 'utf8'), {filename: file}); }
function loadAll() {
  browserShim();
  for (const f of ['nova-nexus.js', 'botlab-engine.js', 'llm.js']) loadScript(path.join(VORTEX_DIR, f));
  for (const f of ['engine.js', 'rooms.js', 'tools.js']) loadScript(path.join(SALA_DIR, 'js', f));
  if (!globalThis.CCTBotLab || !globalThis.CCTLLM || !globalThis.SalaEngine || !globalThis.SalaTools) throw new Error('No cargaron las piezas de la sala');
}

/* ───────── tu cuenta (Firestore con la cuenta de servicio) ───────── */
let admin = null, db = null, uid = null;
async function account() {
  if (db) return {db, uid};
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT; if (!raw) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT');
  admin = require('firebase-admin'); admin.initializeApp({credential: admin.credential.cert(JSON.parse(raw))}); db = admin.firestore();
  let page; do { const r = await admin.auth().listUsers(1000, page); page = r.pageToken; for (const u of r.users) if (u.email && crypto.createHash('sha256').update(u.email.trim().toLowerCase()).digest('hex') === OWNER) uid = u.uid; } while (page && !uid);
  if (!uid) throw new Error('No se encontró la cuenta del creador');
  const doc = n => db.doc(`users/${uid}/data/${n}`);
  globalThis.SalaCloud = {
    init: async () => true, user: () => ({uid}), on: () => () => {},
    get: async n => { const s = await doc(n).get(); return s.exists ? s.data() : null; },
    set: async (n, o) => doc(n).set(o),
    pub: async p => { const s = await db.doc(p).get(); return s.exists ? s.data() : null; }
  };
  return {db, uid, admin};
}
const getDoc = async n => globalThis.SalaCloud.get(n);
const setDoc = async (n, o) => globalThis.SalaCloud.set(n, o);
/* El documento «sala» lo escribe la app como {s: '<JSON>'}: aquí solo se lee (tus salas y los ajustes del modo automático) */
async function salaState() { const d = await getDoc('sala'); try { return d && d.s ? JSON.parse(d.s) : {}; } catch { return {}; } }

/* ───────── IA: la misma de la app (Tu IA → IA gratis de VORTEX → servicio gratis) y Groq de respaldo ───────── */
let ownDone = false;
async function ai(messages, o = {}) {
  const L = globalThis.CCTLLM;
  if (!ownDone) { ownDone = true; try { const d = await getDoc('ownai'); if (d && d.on && d.key && L.OWN && L.OWN[d.provider]) L.ownSave({on: true, provider: d.provider, key: d.key, model: d.model, url: d.url || ''}); } catch {} }
  const spec = o.purpose === 'spec', json = o.purpose === 'json', errs = [];
  try {
    const r = await L.chat(messages, {purpose: 'text', maxTokens: spec ? 1800 : json ? 1600 : 1100, temperature: spec ? .3 : json ? .2 : .5, signal: o.signal});
    const text = String(r.text || '').trim(); if (text) return {text, model: String(r.model || '')};
  } catch (e) { errs.push('VORTEX: ' + clip(e.message, 80)); }
  const key = process.env.GROQ_KEY;
  if (key) for (const model of ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b']) {
    for (let t = 0; t < 2; t++) {
      try {
        const body = {model, temperature: spec || json ? .25 : .5, max_tokens: spec ? 2200 : 1400, messages};
        if (json) body.response_format = {type: 'json_object'};
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {method: 'POST', headers: {'content-type': 'application/json', authorization: 'Bearer ' + key}, body: JSON.stringify(body)});
        if (r.status === 429) { await new Promise(ok => setTimeout(ok, 8000)); continue; }
        if (!r.ok) { errs.push(model + ' ' + r.status); break; }
        const j = await r.json(), text = String(j.choices && j.choices[0].message.content || '').trim(); if (text) return {text, model: model + ' · Groq'};
      } catch (e) { errs.push(model + ': ' + clip(e.message, 60)); break; }
    }
  }
  throw new Error('Ninguna IA respondió (' + errs.join(' · ') + ')');
}

/* ───────── avisos a tu celular (el mismo servidor de avisos de tus bots) ───────── */
async function push(msgs) {
  try {
    const key = require(path.join(VORTEX_DIR, 'scripts', 'bot-push-key.js')).botPushKey(process.env.FIREBASE_SERVICE_ACCOUNT); if (!key || !uid) return;
    const r = await fetch(PUSH_URL + '/bot-push', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({key, uid, msgs: msgs.slice(0, 6)})});
    const j = await r.json().catch(() => ({})); log(`aviso al celular: ${j.sent || 0} enviado(s)${j.error ? ' · ' + j.error : ''}`);
  } catch (e) { log('aviso al celular: ' + clip(e.message, 100)); }
}

/* Eventos como los guarda la app (sin el contexto pesado), para que el historial se pueda volver a ver en la sala */
function keepEvent(e) {
  const k = Object.assign({}, e); delete k.ctx;
  if (k.data && k.tool === 'market' && k.data.rows) k.data = {rows: k.data.rows.map(r => ({sym: r.sym, regime: r.regime, ch24: r.ch24}))};
  if (k.text && k.text.length > 1600) k.text = k.text.slice(0, 1600) + '…';
  if (k.spec) k.spec = null;
  return k;
}
/* Recorta una lista de sesiones para que el documento quepa (Firestore: 1 MiB) */
function fit(list, max = 850000) { const out = list.slice(); while (out.length > 3 && JSON.stringify(out).length > max) out.pop(); return out; }

module.exports = {SALA_DIR, VORTEX_DIR, log, clip, loadAll, account, getDoc, setDoc, salaState, ai, push, keepEvent, fit};
