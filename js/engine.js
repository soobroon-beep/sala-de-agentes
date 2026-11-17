/* SALA DE AGENTES · orquestador (puro: sin DOM; se prueba en tests/engine.test.js).
   Los agentes hablan de verdad entre ellos: cada uno recibe la conversación del equipo, las herramientas reales que le tocan
   y le responde al siguiente. Los agentes «juez» (output: 'verdict') aprueban o regresan el trabajo a quien indique su campo «back».
   Reglas fijas (checks) en código: si la IA aprueba algo que rompe una regla (pierde dinero, se pasa del riesgo…), el motor lo regresa igual.
   Todo lo que pasa se emite como eventos para la animación y el chat. */
(function (root) {
  'use strict';
  const MAX_CALLS = 18, MSG_CAP = 1400, HIST = 12;

  /* Veredicto al final del mensaje: «VEREDICTO: APROBADO» o «VEREDICTO: CAMBIOS» (acepta variantes) */
  function parseVerdict(text) {
    const t = String(text || ''), m = /VEREDICTO\s*[:：\-]?\s*\**\s*(APROBAD[OA]|APRUEBO|CAMBIOS|RECHAZAD[OA]|REVISAR)/i.exec(t);
    if (m) return /^APR/i.test(m[1]) ? 'aprobado' : 'cambios';
    const tail = t.slice(-160).toUpperCase(); if (/\bAPROBADO\b/.test(tail) && !/NO APROBADO/.test(tail)) return 'aprobado'; if (/\bCAMBIOS\b|\bRECHAZ/.test(tail)) return 'cambios';
    return null;
  }
  const stripVerdict = t => String(t || '').replace(/\n?\s*\**VEREDICTO\s*[:：\-]?[^\n]*\s*$/i, '').trim();

  /* El JSON de la estrategia dentro de la respuesta (```json … ``` o el primer objeto con "entry") */
  function extractJson(text) {
    const t = String(text || ''), blocks = [...t.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m => m[1]);
    const tryParse = s => { try { const o = JSON.parse(s); return o && typeof o === 'object' ? o : null; } catch { return null; } };
    for (const b of blocks) { const o = tryParse(b.trim()); if (o) return o.spec || o; }
    const i = t.indexOf('{'), j = t.lastIndexOf('}'); if (i >= 0 && j > i) { const o = tryParse(t.slice(i, j + 1)); if (o) return o.spec || o; }
    return null;
  }
  const withoutJson = t => String(t || '').replace(/```(?:json)?[\s\S]*?```/gi, '').replace(/```[\s\S]*$/, '').trim();

  function protocol(room, ag, toName, inputs) {
    const team = room.flow.map(id => room.agents.find(a => a.id === id)).filter(Boolean).map(a => `${a.name} — ${a.role}`).join('; ');
    let p = `${ag.prompt}\n\nESTÁS EN UNA SALA DE AGENTES DE IA llamada «${room.name}». Equipo, en orden: ${team}. Tú eres ${ag.name}. Le hablas a ${toName}.
Escribe en español, directo, sin emojis ni saludos, como un mensaje de chat entre colegas (máximo ${ag.output === 'spec' ? 140 : 170} palabras fuera de bloques de código). Responde a lo que dijeron tus compañeros por su nombre cuando haga falta.
NO inventes datos: usa solo los de las herramientas y los mensajes. Si un dato no está, dilo.`;
    if (ag.output === 'verdict') p += `\nTERMINA SIEMPRE con una última línea exacta: «VEREDICTO: APROBADO» o «VEREDICTO: CAMBIOS». Si pides cambios, antes de esa línea di exactamente qué cambiar.`;
    return p;
  }
  function briefOf(room, inputs) {
    const L = []; for (const f of room.inputs || []) { const v = inputs[f.id]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue; const opt = f.options && f.options.find(o => o[0] === v); L.push(`- ${f.label}: ${Array.isArray(v) ? v.map(x => String(x).replace(/USDT$/, '')).join(', ') : opt ? opt[1] : v}`); }
    return L.join('\n');
  }

  /**
   * runRoom(room, inputs, deps, hooks) → resultado final
   * deps: {ai(messages, {agent}) → {text, model}, tools: {market, backtest, bots}(ctx) → {text, data}, parseSpec(obj, inputs, ctx) → {spec, errors, text},
   *        checks: {name(ctx) → [problemas]}, propose(ctx) → propuesta, signal}
   * hooks.emit(evento): {type:'start'|'think'|'tool'|'msg'|'note'|'done'|'error', ...}
   */
  async function runRoom(room, inputs, deps, hooks) {
    const emit = e => { try { hooks && hooks.emit && hooks.emit(Object.assign({at: Date.now()}, e)); } catch {} };
    const byId = id => room.agents.find(a => a.id === id), flow = room.flow.filter(byId), ctx = {room, inputs, msgs: [], tools: {}, spec: null, specText: '', bt: null, round: 1, calls: 0, approved: false, outcome: null};
    const aborted = () => deps.signal && deps.signal.aborted;
    const nameOf = id => id === 'user' ? 'el usuario (Tú)' : (byId(id) || {}).name || id;
    emit({type: 'start', room: room.id, flow});
    let i = 0, changes = 0, lastTo = null;
    while (i < flow.length) {
      if (aborted()) { ctx.outcome = 'cancelado'; emit({type: 'done', outcome: 'cancelado', ctx}); return ctx; }
      if (ctx.calls >= MAX_CALLS) { ctx.outcome = 'limite'; emit({type: 'note', text: 'Se alcanzó el límite de mensajes de esta sesión para no gastar de más.'}); break; }
      const ag = byId(flow[i]), to = i + 1 < flow.length ? flow[i + 1] : 'user';

      /* 1) Herramienta real */
      let toolTxt = '';
      if (ag.tool && deps.tools && deps.tools[ag.tool]) {
        emit({type: 'tool', agent: ag.id, tool: ag.tool, state: 'run'});
        try { const r = await deps.tools[ag.tool](ctx); ctx.tools[ag.tool] = r; toolTxt = r.text || ''; emit({type: 'tool', agent: ag.id, tool: ag.tool, state: 'ok', text: r.summary || '', data: r.data}); }
        catch (e) { toolTxt = 'La herramienta falló: ' + String(e && e.message || e).slice(0, 200); ctx.tools[ag.tool] = {error: toolTxt}; emit({type: 'tool', agent: ag.id, tool: ag.tool, state: 'err', text: toolTxt}); }
      }

      /* 2) Mensajes para la IA: su papel + pedido + conversación del equipo + datos */
      const hist = ctx.msgs.slice(-HIST).map(m => `${m.fromName}${m.to ? ' → ' + nameOf(m.to) : ''}: ${String(m.text).slice(0, MSG_CAP)}`).join('\n\n');
      let user = `PEDIDO DEL USUARIO:\n${briefOf(room, inputs) || '(sin detalles)'}\n\nRONDA ${ctx.round} de ${room.maxRounds || 3}.`;
      if (hist) user += `\n\nCONVERSACIÓN DEL EQUIPO HASTA AHORA:\n${hist}`;
      if (ctx.spec && ag.output !== 'spec') user += `\n\nESTRATEGIA ACTUAL (JSON):\n${JSON.stringify(ctx.spec)}`;
      if (toolTxt) user += `\n\nDATOS DE TU HERRAMIENTA (reales):\n${toolTxt}`;
      user += `\n\nAhora te toca a ti, ${ag.name}. Háblale a ${nameOf(to)}.`;
      let messages = [{role: 'system', content: protocol(room, ag, nameOf(to), inputs)}, {role: 'user', content: user}];

      /* 3) Habla (con reintento si la estrategia no es válida para el motor) */
      emit({type: 'think', agent: ag.id, to});
      let reply, attempts = 0, verdict = null, parsed = null;
      for (;;) {
        ctx.calls++;
        try { reply = await deps.ai(messages, {agent: ag, purpose: ag.output === 'spec' ? 'spec' : 'text', signal: deps.signal}); }
        catch (e) { if (aborted()) { ctx.outcome = 'cancelado'; emit({type: 'done', outcome: 'cancelado', ctx}); return ctx; } ctx.outcome = 'error'; emit({type: 'error', agent: ag.id, text: String(e && e.message || e)}); emit({type: 'done', outcome: 'error', ctx}); return ctx; }
        if (ag.output !== 'spec') break;
        const obj = extractJson(reply.text); parsed = obj ? deps.parseSpec(obj, inputs, ctx) : {errors: ['No escribiste el bloque ```json con la estrategia.']};
        if (!parsed.errors || !parsed.errors.length) break;
        if (++attempts > 2 || ctx.calls >= MAX_CALLS) break;
        emit({type: 'note', agent: ag.id, kind: 'motor', text: 'El motor de Nova Bot Lab no aceptó la estrategia: ' + parsed.errors.slice(0, 3).join(' · ') + '. Orion la corrige.'});
        messages = messages.concat([{role: 'assistant', content: reply.text}, {role: 'user', content: 'El motor de Nova Bot Lab rechazó esa estrategia por esto: ' + parsed.errors.join('; ') + '. Corrige SOLO eso y vuelve a escribir el bloque ```json completo.'}]);
      }

      let text = reply.text;
      if (ag.output === 'spec') {
        if (parsed && parsed.spec && !(parsed.errors && parsed.errors.length)) { ctx.spec = parsed.spec; ctx.bt = null; ctx.specText = parsed.text || ''; }
        else { ctx.outcome = 'spec-invalida'; emit({type: 'msg', agent: ag.id, to, text: withoutJson(text) || text, model: reply.model}); emit({type: 'note', text: 'El estratega no logró escribir una estrategia válida. La sesión se detiene; intenta con un pedido más concreto.'}); emit({type: 'done', outcome: 'spec-invalida', ctx}); return ctx; }
        text = withoutJson(text) || 'Aquí está la estrategia.';
      }
      if (ag.output === 'verdict') {
        verdict = parseVerdict(reply.text) || 'cambios';
        const rule = ag.check && deps.checks && deps.checks[ag.check] ? deps.checks[ag.check](ctx) : [];
        if (verdict === 'aprobado' && rule.length) { verdict = 'cambios'; emit({type: 'note', agent: ag.id, kind: 'regla', text: 'Regla fija: ' + rule.join(' · ') + '. No se puede aprobar así.'}); text = stripVerdict(text) + '\n\n(Regla fija: ' + rule.join('; ') + ')'; }
        else text = stripVerdict(text);
      }
      const dest = verdict === 'cambios' && ag.back ? ag.back : to;
      const msg = {from: ag.id, fromName: ag.name, to: dest, text, model: reply.model, verdict, spec: ag.output === 'spec' ? ctx.spec : null, specText: ag.output === 'spec' ? ctx.specText : '', round: ctx.round};
      ctx.msgs.push(msg); lastTo = dest;
      emit(Object.assign({type: 'msg', agent: ag.id}, msg));

      /* 4) ¿Avanza o regresa? */
      if (verdict === 'cambios' && ag.back) {
        changes++;
        if (ctx.round >= (room.maxRounds || 3)) { ctx.outcome = 'rechazado'; emit({type: 'note', text: `Después de ${ctx.round} rondas el equipo no llegó a algo que pase todos los filtros. No se propone nada (mejor eso que un bot malo).`}); break; }
        ctx.round++; i = flow.indexOf(ag.back); if (i < 0) i = 0; emit({type: 'round', round: ctx.round, from: ag.id, to: ag.back}); continue;
      }
      i++;
    }
    if (!ctx.outcome) {
      ctx.approved = true; ctx.outcome = room.final === 'proposal' ? 'propuesta' : 'informe';
      if (room.final === 'proposal' && deps.propose) {
        try { ctx.proposal = await deps.propose(ctx); emit({type: 'proposal', proposal: ctx.proposal}); }
        catch (e) { ctx.outcome = 'aprobado-sin-enviar'; emit({type: 'note', text: 'El bot fue aprobado, pero no se pudo enviar a Nova Bot Lab: ' + String(e && e.message || e).slice(0, 160)}); }
      }
    }
    ctx.report = (ctx.msgs.filter(m => m.from !== 'user').slice(-1)[0] || {}).text || '';
    emit({type: 'done', outcome: ctx.outcome, ctx, changes});
    return ctx;
  }

  const api = {runRoom, parseVerdict, stripVerdict, extractJson, withoutJson, briefOf, MAX_CALLS};
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SalaEngine = api;
})(typeof self !== 'undefined' ? self : this);
