// Pruebas de lo nuevo: consumo, cadenas, versiones, memoria y herramientas reales
'use strict';
const test = require('node:test'), assert = require('node:assert');
global.window = global; global.self = global;
const R = require('../js/rooms.js'), E = require('../js/engine.js'); require('../js/tools.js'); const T = global.SalaTools;

test('meter anota consultas, tokens, errores y modelos', async () => {
  const run = {}, ai = E.meter(async m => ({text: 'x'.repeat(400), model: 'gpt-oss'}), run);
  await ai([{role: 'user', content: 'y'.repeat(800)}]); await ai([{role: 'user', content: 'z'}]);
  const bad = E.meter(async () => { throw new Error('no'); }, run); await assert.rejects(bad([]));
  assert.equal(run.usage.calls, 2); assert.equal(run.usage.errors, 1); assert.equal(run.usage.tokOut, 200); assert.equal(run.usage.models['gpt-oss'], 2); assert.ok(run.usage.tokIn >= 200);
});
test('salas propias guardan cadena y versión; herramientas nuevas válidas', () => {
  const r = R.normalizeCustom({id: 'u1', name: 'A', ver: 3, chain: {to: 'taller-bots', goal: 'haz un bot'}, agents: [{name: 'Nova', prompt: 'x', tool: 'web'}, {name: 'Vega', prompt: 'y', tool: 'agenda'}, {name: 'Orion', prompt: 'z', tool: 'nada'}]});
  assert.equal(r.ver, 3); assert.deepEqual(r.chain, {to: 'taller-bots', goal: 'haz un bot'});
  assert.deepEqual(r.agents.map(a => a.tool), ['web', 'agenda', '']);
  assert.equal(R.normalizeCustom({id: 'u2', name: 'B', agents: [{name: 'a', prompt: 'x'}, {name: 'b', prompt: 'y'}]}).chain, null);
});
test('la memoria de la sala entra en las instrucciones de cada agente', async () => {
  const room = Object.assign(R.normalizeCustom({id: 'u3', name: 'M', agents: [{name: 'Nova', prompt: 'p1'}, {name: 'Vega', prompt: 'p2'}]}), {memory: 'Mi estilo es neo-japonés'});
  const sys = []; await E.runRoom(room, {goal: 'hola'}, {ai: async m => { sys.push(m[0].content); return {text: 'listo\nVEREDICTO: APROBADO', model: 'f'}; }, tools: {}}, {emit: () => {}});
  assert.ok(sys.length >= 2 && sys.every(s => s.includes('Mi estilo es neo-japonés')));
});
test('la búsqueda en internet arma una consulta corta con las palabras importantes', () => {
  assert.equal(T.queryOf({inputs: {goal: 'Quiero que me digas las tendencias de tatuajes neo japonés en Instagram para hoy\nRESULTADO DE «X»: mucho texto'}}), 'digas tendencias tatuajes neo japones instagram');
  assert.equal(T.queryOf({inputs: {goal: ''}}), 'noticias');
});
