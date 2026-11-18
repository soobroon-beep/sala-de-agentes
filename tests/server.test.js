const test = require('node:test'), assert = require('node:assert');
const P = require('../server/plan.js');
test('el Taller rota estilos y no repite combinaciones recientes', () => {
  const now = Date.now(), tried = [];
  for (let i = 0; i < 12; i++) { const {plan, inputs} = P.planTaller(tried, {}, null, now, Math.random); assert.ok(P.STYLES.includes(plan.style)); assert.ok(inputs.coins.length >= 6); assert.ok(!tried.some(t => P.comboKey(t) === P.comboKey(plan))); tried.unshift(Object.assign({at: now, outcome: 'rechazado', why: 'pierde'}, plan)); }
});
test('con el mercado en rango favorece rango y rupturas', () => {
  let n = 0; for (let i = 0; i < 400; i++) { const {plan} = P.planTaller([], {}, 'rango', Date.now(), Math.random); if (plan.style === 'rango' || plan.style === 'ruptura') n++; }
  assert.ok(n > 400 * 0.5);
});
test('pasa al equipo lo que falló antes con ese estilo y respeta tus límites', () => {
  const {inputs} = P.planTaller([{at: Date.now() - 5e6, style: 'nova', interval: '1h', basket: 0, outcome: 'rechazado', why: 'solo 4 operaciones'}], {styles: ['nova'], riskPct: 1, maxDD: 15}, null, Date.now(), () => 0);
  assert.match(inputs.goal, /solo 4 operaciones/); assert.equal(inputs.riskPct, 1); assert.equal(inputs.maxDD, 15);
});
test('salas propias: solo corren encendidas, con tarea y a su hora', () => {
  const r = {auto: {on: true, goal: 'x', everyHours: 6}}, now = Date.now();
  assert.equal(P.dueRoom(r, 0, now), true); assert.equal(P.dueRoom(r, now - 3 * 36e5, now), false); assert.equal(P.dueRoom(r, now - 6 * 36e5, now), true);
  assert.equal(P.dueRoom({auto: {on: true, goal: ''}}, 0, now), false); assert.equal(P.dueRoom({auto: {on: false, goal: 'x'}}, 0, now), false);
});
test('revisión: fallas nuevas, que siguen y resueltas', () => {
  const RV = require('../server/revision.js'), t0 = 1e12;
  const a = RV.mergeIssues([], [{id: 'x', app: 'vortex', sev: 'alta', title: 'cae'}], t0);
  assert.equal(a[0].status, 'nueva');
  const b = RV.mergeIssues(a, [{id: 'x', app: 'vortex', sev: 'alta', title: 'cae'}], t0 + 1);
  assert.equal(b[0].status, 'sigue'); assert.equal(b[0].seen, 2);
  const c = RV.mergeIssues(b, [], t0 + 2); assert.equal(c[0].status, 'resuelta');
});
