/* SALA DE AGENTES · tu cuenta de Google (la misma de VORTEX, Nova Hub y Neural Brain: proyecto Firebase criptochart-bd774).
   Documentos privados en users/<tú>/data/:
   · sala        — tus salas propias y el historial de sesiones
   · sala_props  — propuestas de bots aprobadas por el Taller (Nova Bot Lab las muestra para Agregar o Descartar)
   · ownai       — «Tu IA» (la misma que configuras en VORTEX), solo lectura aquí
   · botlab      — tus bots de Nova Bot Lab, solo lectura aquí (el Juez los compara)
   Sin sesión la sala funciona igual con la IA gratis, guardando en este dispositivo; solo enviar propuestas pide iniciar sesión. */
(function () {
  'use strict';
  const CFG = {apiKey: 'AIzaSyDCPmWHev8zpRitGpyyqfxWhAe6rtZKHR4', authDomain: 'criptochart-bd774.firebaseapp.com', projectId: 'criptochart-bd774', storageBucket: 'criptochart-bd774.firebasestorage.app', messagingSenderId: '803196219118', appId: '1:803196219118:web:c1a525dc60f0478d5e0dff'};
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  let auth = null, db = null, user = null, ready = null; const subs = new Set();
  const load = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => ko(new Error('No cargó ' + src)); document.head.appendChild(s); });

  function init() {
    if (ready) return ready;
    ready = (async () => {
      await load(SDK + 'firebase-app-compat.js'); await Promise.all([load(SDK + 'firebase-auth-compat.js'), load(SDK + 'firebase-firestore-compat.js')]);
      const fb = window.firebase; if (!fb.apps.length) fb.initializeApp(CFG); auth = fb.auth(); db = fb.firestore();
      try { await auth.getRedirectResult(); } catch {}
      await new Promise(res => { let first = true; auth.onAuthStateChanged(u => { user = u; subs.forEach(f => { try { f(u); } catch {} }); if (first) { first = false; res(); } }); });
      return true;
    })().catch(e => { console.warn('Cuenta no disponible:', e); ready = null; return false; });
    return ready;
  }
  async function signIn() {
    await init(); const p = new window.firebase.auth.GoogleAuthProvider();
    try { await auth.signInWithPopup(p); }
    catch (e) { if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/popup-closed-by-browser'].includes(e.code)) return auth.signInWithRedirect(p); throw e; }
  }
  const signOut = async () => { await init(); return auth.signOut(); };
  const doc = n => db.doc(`users/${user.uid}/data/${n}`);
  async function get(n) { if (!(await init()) || !user) return null; const s = await doc(n).get(); return s.exists ? s.data() : null; }
  async function set(n, o) { if (!(await init()) || !user) throw new Error('Inicia sesión con Google'); return doc(n).set(o); }
  async function pub(path) { if (!(await init())) return null; const s = await db.doc(path).get(); return s.exists ? s.data() : null; } // datos públicos (velas de VORTEX)

  window.SalaCloud = {init, signIn, signOut, get, set, pub, user: () => user, on: f => { subs.add(f); if (user !== null) f(user); return () => subs.delete(f); }};
})();
