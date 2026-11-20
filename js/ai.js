/* SALA DE AGENTES · IA de los agentes y piezas compartidas con VORTEX.
   Se cargan EN VIVO de tu VORTEX publicado (así el motor de backtest, Nova Nexus y la IA son siempre los mismos que en Nova Bot Lab);
   si no responde, se usa la copia de respaldo guardada en este repositorio (carpeta vortex/).
   IA: SIEMPRE gratis → IA gratis de tu servidor VORTEX (open source: Groq / Cloudflare) → servicio gratis. Nunca usa «Tu IA». */
(function () {
  'use strict';
  const LIVE = 'https://vortex-nexus.pages.dev/', FILES = ['nova-nexus.js', 'botlab-engine.js', 'llm.js'];
  const load = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = () => { s.remove(); ko(new Error(src)); }; document.head.appendChild(s); });
  const ok = f => f === 'llm.js' ? !!window.CCTLLM : f === 'botlab-engine.js' ? !!window.CCTBotLab : !!window.NovaNexus;
  let ready = null, source = '';
  function boot() {
    if (ready) return ready;
    ready = (async () => {
      const from = {};
      for (const f of FILES) {
        try { await Promise.race([load(LIVE + f + '?v=' + Math.floor(Date.now() / 36e5)), new Promise((_, ko) => setTimeout(() => ko(new Error('tiempo')), 8000))]); } catch {}
        if (!ok(f)) { try { await load('vortex/' + f); } catch {} from[f] = 'respaldo'; } else from[f] = 'en vivo';
      }
      source = Object.values(from).every(x => x === 'en vivo') ? 'VORTEX en vivo' : 'copia de respaldo';
      if (!window.CCTBotLab || !window.CCTLLM) throw new Error('No se pudieron cargar las piezas de VORTEX');
      return true;
    })();
    return ready;
  }

  /* La Sala usa SIEMPRE la IA gratis de VORTEX (open source). Ya no lee «Tu IA» de tu cuenta: tus agentes trabajan solos
     y gastaban tu clave de pago. Se borra la copia que quedó guardada en este navegador. */
  try { localStorage.removeItem('cct_ownai_v1'); } catch {}
  function label() { return 'IA gratis de VORTEX'; }

  async function chat(messages, o) {
    await boot(); const L = window.CCTLLM;
    const r = await L.chat(messages, {purpose: 'text', noOwn: true, maxTokens: o && o.purpose === 'spec' ? 1800 : 1100, temperature: o && o.purpose === 'spec' ? .3 : .5, signal: o && o.signal});
    return {text: String(r.text || '').trim(), model: String(r.model || '')};
  }

  window.SalaAI = {boot, chat, label, source: () => source, resetOwn: () => {}};
})();
