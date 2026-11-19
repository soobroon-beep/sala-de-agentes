/* SALA DE AGENTES · CONEXIONES: de dónde sacan datos reales tus agentes.
   · Nova Hub (notas, proyectos, pendientes, agenda con tus citas de Google Calendar y recordatorios):
     se inicia sesión UNA vez en el proyecto de Nova Hub con tu misma cuenta de Google (solo lectura: las reglas solo te dejan leer lo tuyo)
     y se guarda un resumen en tu cuenta de la Sala (users/<tú>/data/sala_ctx). Así también lo leen los agentes del servidor (24/7).
     Cada vez que abres la Sala se actualiza solo (si pasaron más de 20 min).
   · Internet (noticias de Google y Bing + Wikipedia) y GitHub (tus repos públicos) no necesitan conexión. */
(function () {
  'use strict';
  const NH = {apiKey: 'AIzaSyAACWtwcJayD3q_LIC7gL6QoY1H7dfaEjY', authDomain: 'nova-hub-2a8a0.firebaseapp.com', projectId: 'nova-hub-2a8a0', appId: '1:438215534612:web:d4d3243352d19bfc9d5f01'};
  let app = null, last = null, busy = false;
  const C = () => window.SalaCloud;
  async function nh() { await C().init(); const fb = window.firebase; app = app || fb.apps.find(a => a.name === 'novahub') || fb.initializeApp(NH, 'novahub'); return app; }
  const day = d => { const x = new Date(d); return isNaN(x) ? '' : x.toISOString().slice(0, 10); };
  function snapshot(u) {
    const now = Date.now(), today = day(now), in14 = day(now + 14 * 864e5), live = x => x && !x.deleted && !x.trashed;
    const projects = (u.projects || []).filter(live).map(p => { const t = (p.tasks || []).filter(k => k && !k.done); return {name: String(p.name || 'Proyecto').slice(0, 80), desc: String(p.desc || '').slice(0, 200), status: p.status || '', pending: t.length, pendingList: t.slice(0, 8).map(k => String(k.title || '').slice(0, 100))}; })
      .sort((a, b) => b.pending - a.pending).slice(0, 30);
    const notes = (u.notes || []).filter(live).sort((a, b) => (Date.parse(b.updatedAt || b.createdAt) || +b.id || 0) - (Date.parse(a.updatedAt || a.createdAt) || +a.id || 0))
      .slice(0, 40).map(n => ({title: String(n.title || 'Nota').slice(0, 100), body: String(n.body || '').slice(0, 300), tags: (n.tags || []).slice(0, 5)}));
    const ev = (u.events || []).filter(e => live(e) && e.date >= today && e.date <= in14).map(e => ({date: e.date, start: e.start || '', end: e.end || '', title: String(e.title || '').slice(0, 120), cal: 'Nova Hub'}));
    const gc = ((u.gcalAgenda && u.gcalAgenda.events) || []).map(e => ({date: e.date, start: e.start || '', end: e.end || '', title: String(e.title || '').slice(0, 120), cal: e.calName || 'Google Calendar'}));
    const seen = new Set(), events = ev.concat(gc).filter(e => { const k = e.date + e.start + e.title; if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 50);
    const reminders = (u.reminders || []).filter(r => live(r) && !r.done && r.datetime && Date.parse(r.datetime) > now - 864e5).sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime)).slice(0, 20)
      .map(r => ({when: new Date(r.datetime).toLocaleString('es-MX', {dateStyle: 'medium', timeStyle: 'short'}), title: String(r.title || '').slice(0, 120)}));
    return {at: now, projects, notes, events, reminders, gcalAt: (u.gcalAgenda && u.gcalAgenda.at) || 0};
  }
  async function pull(a) {
    const user = a.auth().currentUser; if (!user) return null;
    const d = await a.firestore().doc('users/' + user.uid).get(); if (!d.exists) throw new Error('Tu cuenta de Nova Hub está vacía');
    const snap = snapshot(d.data()); snap.email = user.email || '';
    await C().set('sala_ctx', {novahub: snap, at: Date.now()}); last = snap; return snap;
  }
  async function connect() {
    if (!C().user()) throw new Error('Primero inicia sesión en la Sala'); busy = true;
    try { const a = await nh(), p = new window.firebase.auth.GoogleAuthProvider(); p.setCustomParameters({login_hint: C().user().email || ''});
      if (!a.auth().currentUser) await a.auth().signInWithPopup(p); return await pull(a); } finally { busy = false; }
  }
  async function refresh(force) { // al abrir la app: si ya está conectada, actualiza la copia sin preguntar nada
    if (busy || !C().user()) return last; try { const cur = await state(); if (!force && cur && Date.now() - cur.at < 20 * 6e4) return cur;
      const a = await nh(); await new Promise(ok => { const off = a.auth().onAuthStateChanged(() => { off(); ok(); }); }); if (!a.auth().currentUser) return cur; return await pull(a); } catch (e) { console.warn('Nova Hub:', e.message); return last; }
  }
  async function state() { if (last) return last; try { const d = await C().get('sala_ctx'); last = d && d.novahub || null; } catch {} return last; }
  async function disconnect() { try { const a = await nh(); await a.auth().signOut(); } catch {} await C().set('sala_ctx', {novahub: null, at: Date.now()}); last = null; }
  window.SalaConn = {connect, refresh, state, disconnect, cached: () => last};
})();
