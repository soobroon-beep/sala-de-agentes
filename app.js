import * as THREE from './vendor/three.module.js';
import { SVGRenderer } from './vendor/SVGRenderer.js';
const $=id=>document.getElementById(id);
const agents=[
{id:'vortex',name:'Auditor de Vortex',short:'Vortex',initials:'VX',color:0x9670ff,pos:[-6,1],role:'NIVEL 3 · REPORTA AL GERENTE',mission:'Revisa disponibilidad, navegación, gráficos, APIs y regresiones de Vortex.',scope:'HTTP, navegación pública en escritorio y móvil, pruebas aisladas de IA/indicadores y estado de procesos. Funciones privadas pendientes.'},
{id:'apps',name:'Auditor de Apps',short:'Apps',initials:'AP',color:0x27c5aa,pos:[-5.5,6],role:'NIVEL 3 · REPORTA AL GERENTE',mission:'Supervisa Nova HUB, INKBOT PRO, INKBOT VIDEO y Moldes Gabys. Cada aplicación conserva sus evidencias y bloqueos.',scope:'Cuatro páginas públicas, navegación permitida y pruebas aisladas de Nova HUB. Guardar y recargar datos reales requiere una cuenta de prueba.'},
{id:'neural',name:'Auditor de Neural Brain',short:'Neural Brain',initials:'NB',color:0xed80b5,pos:[0,7.1],role:'NIVEL 3 · REPORTA AL GERENTE',mission:'Comprueba disponibilidad y prepara la revisión de aprendizaje, procesamiento e integraciones de IA.',scope:'Interfaz de Neural-Brain-Claude y Neural-Brain; aprendizaje y sincronización por metadatos. Resultados de IA y sincronización privada no comprobados.'},
{id:'discord',name:'Auditor de Discord',short:'Discord',initials:'DC',color:0x559cf1,pos:[5.6,6],role:'NIVEL 3 · REPORTA AL GERENTE',mission:'Revisa bots e integraciones de Discord sin enviar mensajes a miembros ni modificar permisos.',scope:'Lectura directa del servidor pendiente. El token de este repositorio no da acceso a los repositorios privados de bots.'},
{id:'bots',name:'Auditor de bots de Vortex',short:'Bots Vortex',initials:'BT',color:0xf0ae4d,pos:[6,1],role:'NIVEL 3 · REPORTA AL GERENTE',mission:'Audita cada bot, sus tareas y fallos silenciosos. Las operaciones financieras se revisan solo mediante lectura.',scope:'Pruebas aisladas de stop loss, take profit, paper trading y riesgo. Metadatos del motor e inventario puntual; telemetría continua privada pendiente.'},
{id:'gerente',name:'Gerente',short:'Gerente',initials:'GR',color:0x72cda0,pos:[0,.6],role:'NIVEL 2 · REPORTA AL JEFE',mission:'Consolida las cinco auditorías, mantiene sus evidencias y separa fallos de revisiones bloqueadas.',scope:'Consolidación automática de los cinco reportes. Análisis de tendencias avanzado y asignación de incidencias pendientes.'},
{id:'jefe',name:'Jefe',short:'Jefe',initials:'JF',color:0xd2b378,pos:[3.4,-5.7],role:'NIVEL 1 · ENTREGA AL PROPIETARIO',mission:'Valida el reporte del Gerente, comprueba recibos y evidencia, identifica conexiones entre aplicaciones y te entrega el resumen ejecutivo.',scope:'Informe validado para el panel a las 09:00 y 21:00; tendencias los lunes a las 09:00. Alertas solo críticas confirmadas y recuperaciones.'}];
let activeFloor=0,groundFloor,upperFloor,cameraFocusY=0,motionRate=1.35,nightMode=false;
let selected=0,latest=null,reportHistory=[],currentRun=null,currentJobs=[],loadingData=false,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,t=0;let scene,camera,renderer,robots=[],labels=[],routes=[],rings=[],screenGroups=[],cityTraffic=[],archiveSlots=[],frameError=false,softwareRenderer=false;
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function date(s){return s?new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',dateStyle:'short',timeStyle:'short'}).format(new Date(s)):'Sin registro';}
function resultFor(a){if(a.id==='gerente')return latest?.gerente;if(a.id==='jefe')return latest?.jefe;return latest?.auditores?.find(x=>x.agente===a.id);}
function nextReview(a){
 const now=new Date(),hour=new Date(now);hour.setUTCMinutes(17,0,0);if(hour<=now)hour.setUTCHours(hour.getUTCHours()+1);
 if(a.id==='gerente'||a.id==='jefe')return 'Después de los cinco auditores';
 const full=new Date(now);full.setUTCHours(3,0,0,0);if(full<=now)full.setUTCHours(15);if(full<=now){full.setUTCDate(full.getUTCDate()+1);full.setUTCHours(3);}
 const next=full<hour?full:hour;return date(next.toISOString())+(next===full?' · completa':' · ligera');
}
function workingState(a){
 const name=a.id==='gerente'?'Nivel 2 · Gerente':a.id==='jefe'?'Nivel 1 · Jefe':'Auditor · '+a.id;
 const j=currentJobs.find(x=>x.name.startsWith(name));
 if(j?.status==='in_progress')return 'Trabajando';
 if(j?.status==='queued')return 'En espera · ronda en cola';
 if(j?.conclusion==='failure')return 'Con error · revisar ejecución';
 const r=resultFor(a);if(!r)return 'Bloqueado · sin reporte recibido';
 if(r.resultado==='no se pudo comprobar')return 'Bloqueado · cobertura incompleta';
 return 'En espera · revisión registrada';
}
function select(i){selected=i;if(activeFloor===1){renderFuture();return;}let a=agents[i],r=resultFor(a);$('agent-name').textContent=a.name;$('avatar').textContent=a.initials;$('avatar').style.background=`linear-gradient(135deg,#${a.color.toString(16)},#656078)`;$('role').textContent=a.role;$('mission').textContent=a.mission;$('agent-state').textContent=workingState(a);$('result').textContent=r?.resultado??'No se pudo comprobar';$('result').style.color=r?.resultado==='falló'?'#f2aaa6':r?.resultado==='funciona'?'#8bd9b3':'#d9c39c';$('evidence').textContent=r?.resumen??a.scope;$('last').textContent=date(r?.fecha??latest?.generado);$('cadence').textContent=nextReview(a);$('route-source').textContent=i<5?a.short:i===5?'Consolidado':'Reporte';document.querySelectorAll('.roster button').forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));labels.forEach((l,j)=>l.classList.toggle('selected',i===j));rings.forEach((m,j)=>{m.material.opacity=i===j?.65:.13;});}
agents.forEach((a,i)=>{let b=document.createElement('button');b.setAttribute('aria-pressed',String(i===0));b.innerHTML=`<span class="state-dot"></span><span class="initials">${a.initials}</span><span class="label">${a.short}</span><span class="small-state" data-state="${a.id}">Sin ejecución</span>`;b.onclick=()=>{setFloor(0);select(i);};$('roster').append(b);let l=document.createElement('div');l.className='agent-label';l.textContent=(i===6?'N1 · ':i===5?'N2 · ':'N3 · ')+a.short.toUpperCase();$('labels').append(l);labels.push(l);});
$('room-tab').onclick=()=>showView(false);$('report-tab').onclick=()=>showView(true);function showView(report){$('room-view').hidden=report;$('report-view').hidden=!report;$('room-tab').classList.toggle('active',!report);$('report-tab').classList.toggle('active',report);$('room-tab').setAttribute('aria-pressed',String(!report));$('report-tab').setAttribute('aria-pressed',String(report));if(!report)requestAnimationFrame(resize);}
$('detail').onclick=()=>{showView(true);$('coverage').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});};$('help').onclick=()=>$('info').showModal();document.querySelector('.dialog-close').onclick=()=>$('info').close();$('info').addEventListener('click',e=>{if(e.target===$('info'))$('info').close();});
function renderFuture(){
 $('agent-name').textContent='Segundo piso';$('avatar').textContent='02';$('avatar').style.background='linear-gradient(135deg,#a7bcd3,#7671a4)';
 $('role').textContent='ESPACIO PARA UN NUEVO SISTEMA DE AGENTES';$('agent-state').textContent='Vacío · sin agentes asignados';$('mission').textContent='Reservado para futuros equipos con funciones diferentes a la supervisión actual.';
 $('result').textContent='Disponible para ampliar';$('result').style.color='#b8c9e9';$('evidence').textContent='Todavía no hay tareas, herramientas ni automatizaciones en este piso. Los siete puestos actuales permanecen en la planta baja.';
 $('last').textContent='Sin actividad';$('cadence').textContent='Sin programación';$('route-source').textContent='Futuro equipo';$('detail').hidden=true;document.querySelector('.mini-route').hidden=true;
}
function setFloor(level){
 activeFloor=level;groundFloor&&(groundFloor.visible=level===0);upperFloor&&(upperFloor.visible=level===1);
 $('floor-ground').setAttribute('aria-pressed',String(level===0));$('floor-upper').setAttribute('aria-pressed',String(level===1));
 $('room-heading').textContent=level?'Un nuevo piso. Más posibilidades.':'Una sala. Siete agentes.';
 $('room-description').textContent=level?'Un espacio reservado para el siguiente equipo que quieras crear.':'Cada revisión tiene un responsable. Cada hallazgo, un siguiente paso.';
 $('floor-description').textContent=level?'Segundo piso · 0 agentes · sin tareas asignadas':'Siete agentes · auditoría y monitoreo';
 for(const id of ['team-levels','current-team','labels','flow-legend'])$(id).hidden=level===1;
 $('future-caption').hidden=level===0;$('future-plan').hidden=level===0;$('detail').hidden=level===1;document.querySelector('.mini-route').hidden=level===1;
 $('tour').disabled=level===1;$('tour').title=level?'No hay agentes en este piso':'Recorrer los siete agentes';
 $('flow-message').textContent=level?'Segundo piso reservado. Sin agentes activos ni automatizaciones.':'Auditores → Gerente → Jefe → Tú. Comprobaciones reales; movimiento ilustrativo.';
 if(renderer)renderer.domElement.setAttribute('aria-label',level?'Segundo piso vacío en 3D, reservado para futuros agentes':'Siete robots articulados en la planta baja de supervisión');
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)cameraFocusY=level*6;
 azimuth=.18;elevation=.60;if(camera)resize();level?renderFuture():select(selected);
}
$('floor-ground').onclick=()=>setFloor(0);$('floor-upper').onclick=()=>setFloor(1);
function renderData(){select(selected);$('coverage').innerHTML=agents.map(a=>{let r=resultFor(a);return `<div class="coverage-row"><b>${escapeHTML(a.name)}</b><div><strong>${escapeHTML(r?.resultado??'no se pudo comprobar')}</strong><p>${escapeHTML(r?.resumen??a.scope)}</p><p class="secondary">Cobertura: ${escapeHTML(a.scope)}</p><small>${escapeHTML(date(r?.fecha??latest?.generado))}</small><details><summary>Ver evidencia registrada</summary><pre>${escapeHTML(JSON.stringify(r??{resultado:"no se pudo comprobar"},null,2))}</pre></details></div></div>`;}).join('');renderFindings();$('chief-summary').textContent=latest?.jefe?.resumen??'No existe todavía una ejecución publicada por toda la cadena.';$('report-meta').textContent=latest?`Registro ${latest.ejecucion??'local'} · ${date(latest.generado)} · ${latest.origen??'sin origen'}`:'Sin origen de datos.';document.querySelectorAll('[data-state]').forEach(el=>{let a=agents.find(a=>a.id===el.dataset.state),r=resultFor(a);el.textContent=workingState(a);});if(latest?.generado){let age=Date.now()-new Date(latest.generado).getTime();$('freshness').textContent=`Último registro: ${date(latest.generado)}${age>90*60000?' · datos atrasados':''}`;$('operation').textContent=age>90*60000?'Registro atrasado':'Comprobaciones parciales';}else $('freshness').textContent='Aún no hay ejecución publicada.';}
function renderFindings(){
 const rows=latest?.jefe?.hallazgos??[];
 $('findings').innerHTML=rows.length?rows.map(f=>f.detalle_en_artefactos?'<p class="secondary">Hay más hallazgos; consulta las evidencias completas.</p>':`<article class="finding"><div><b>${escapeHTML(f.aplicacion)} · ${escapeHTML(f.funcion)}</b><span>${escapeHTML(f.gravedad)} · ${escapeHTML(f.estado)}</span></div><p>${escapeHTML(typeof f.observado==='string'?f.observado:f.observado?.flujo?`Proceso ${f.observado.flujo}: última ejecución ${f.observado.estado_github}, iniciada hace ${f.observado.minutos_desde_inicio} minutos. Umbral: ${f.observado.umbral_minutos} minutos. No certifica cada bot o cerebro.`:JSON.stringify(f.observado))}</p><small>${escapeHTML(f.naturaleza??'Pendiente de clasificar')} · Responsable: ${escapeHTML(f.responsable)} · ${escapeHTML(date(f.fecha))}</small><p class="secondary">${escapeHTML(f.siguiente_paso??'Reproducir y revisar evidencia sin modificar producción.')}</p><details><summary>Resultado esperado y reproducción</summary><p>${escapeHTML(f.esperado)}</p><p>${escapeHTML((f.pasos??[]).join(' → '))}</p></details></article>`).join(''):'<p class="secondary">Sin hallazgos en esta ronda. Revisa también el informe completo más reciente; una ronda ligera no repite las pruebas funcionales.</p>';
 $('receipts').innerHTML=(latest?.gerente?.recepciones??[]).map(r=>`<p>${escapeHTML(agents.find(a=>a.id===r.auditor)?.short??r.auditor)}: ${escapeHTML(r.reportes_recibidos)} reportes recibidos · ${escapeHTML(r.tipos.join(', '))}</p>`).join('')||'Sin recibos de entrega publicados.';
}
async function loadData(){
 if(loadingData)return;loadingData=true;$('refresh').disabled=true;
 try{
  const query=new URLSearchParams({check_name:'Sala · informe del Jefe',filter:'all',per_page:'50'});
  const base='https://api.github.com/repos/soobroon-beep/sala-de-agentes';
  const runsResponse=await fetch(base+'/actions/workflows/supervision.yml/runs?per_page=10',{headers:{Accept:'application/vnd.github+json'},cache:'no-store'});
  if(!runsResponse.ok)throw Error('HTTP '+runsResponse.status);
  const runList=await runsResponse.json();const runs=runList.workflow_runs??[];currentRun=runs[0]??null;currentJobs=[];
  if(currentRun&&currentRun.status!=='completed'){
   const jobsResponse=await fetch(currentRun.jobs_url,{headers:{Accept:'application/vnd.github+json'}});
   if(jobsResponse.ok)currentJobs=(await jobsResponse.json()).jobs??[];
  }
  const heads=[...new Set(runs.map(r=>r.head_sha))].slice(0,3);let collected=[];
  for(const head of heads){const response=await fetch(base+'/commits/'+head+'/check-runs?'+query,{headers:{Accept:'application/vnd.github+json'}});if(!response.ok)continue;const data=await response.json();collected.push(...(data.check_runs??[]).flatMap(c=>{try{const r=JSON.parse(c.output?.text??'{}');return r.version===4?[{...r,comprobante_url:c.html_url}]:[];}catch{return [];}}));}
  reportHistory=[...new Map(collected.map(r=>[r.ejecucion,r])).values()].sort((a,b)=>b.generado.localeCompare(a.generado));
  if(!reportHistory.length)throw Error('Aún no hay un informe validado con la nueva jerarquía.');
  latest=reportHistory[0];renderData();
  $('history').innerHTML=reportHistory.slice(0,30).map(r=>`<div class="history-row"><span>${escapeHTML(date(r.generado))} · ${escapeHTML(r.ronda)}</span><span>${escapeHTML(r.jefe.resumen)}</span><a href="${escapeHTML(r.url_ejecucion)}" target="_blank" rel="noopener">Evidencia ↗</a></div>`).join('');
  const points=latest.puntos??[];$('app-states').innerHTML=points.map(p=>`<div class="point-row"><b>${escapeHTML(p.aplicacion)}</b><span>${p.estado==='FUNCIONA'?'🟢':p.estado==='FALLÓ'?'🔴':'🟡'} ${escapeHTML(p.estado)}</span><small>Disponibilidad HTTP: ${escapeHTML(p.disponibilidad??'Ver evidencia')} · Funciones privadas: NO SE PUDO COMPROBAR. ${escapeHTML(p.alcance)}</small></div>`).join('');
  const critical=Object.entries(latest.incidencias??{}).filter(([,v])=>v.estado==='confirmado').map(([name])=>'CRÍTICO CONFIRMADO · '+name);
  const recovered=(latest.jefe.recuperaciones??[]).map(a=>'RECUPERACIÓN VERIFICADA · '+a.aplicacion);
  $('alerts').hidden=!critical.length&&!recovered.length;$('alerts').textContent=[...critical,...recovered].join(' · ');
  const scheduled=reportHistory.find(r=>r.origen==='schedule'&&r.jefe?.validacion?.integridad);
  const verified=Boolean(scheduled||latest.prueba_programada?.comprobada);
  $('scheduler-status').textContent=(verified?'Cadena programada registrada.':'NO SE PUDO COMPROBAR todavía una entrega por horario.')+' '+(currentRun?.status==='in_progress'?'Ronda en ejecución.':currentRun?.status==='queued'?'Ronda en cola.':currentRun?.conclusion==='failure'?'ERROR del monitor en la última ronda; revisa la ejecución.':'Última ronda finalizada.')+' Ligera cada hora, minuto 17 · completa 09:00 y 21:00 · semanal lunes 09:00 (America/Mexico_City).';
  const full=reportHistory.find(r=>r.ronda==='completa');
  const safeLink=(url,label)=>{try{let u=new URL(url);return u.protocol==='https:'&&u.hostname==='github.com'?`<a href="${escapeHTML(u.href)}" target="_blank" rel="noopener">${escapeHTML(label)} ↗</a>`:'';}catch{return '';}};
  $('proof-links').innerHTML=[safeLink(latest.url_ejecucion,'Última entrega y artefactos'),safeLink(full?.url_ejecucion,'Última auditoría completa'),safeLink(scheduled?.url_ejecucion,'Prueba programada')].filter(Boolean).join(' · ');
  $('chief-heading').textContent=latest.jefe.titulo??'Informe validado del Jefe';
 }catch(e){
  if(!latest)renderData();
  $('freshness').textContent='NO SE PUDO COMPROBAR la lectura del informe: '+e.message;
  $('operation').textContent='Lectura de informes pendiente';
 }finally{loadingData=false;$('refresh').disabled=false;}
}
$('refresh').onclick=loadData;renderData();loadData();setInterval(loadData,300000);
// Motor 3D real: profundidad, geometría redondeada, sombras y cámara limitada al lado frontal.
const material=(color,roughness=.48,metalness=.08)=>new THREE.MeshPhysicalMaterial({color,roughness,metalness,clearcoat:.28,clearcoatRoughness:.35});
function rounded(w,h,d,r=.1){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);const g=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSegments:softwareRenderer?1:4,steps:1,bevelSize:r,bevelThickness:r,curveSegments:softwareRenderer?2:8});g.translate(0,0,-(d-2*r)/2);return g;}
const white=material(0xf1eff7,.35),dark=material(0x272b40,.25,.15),silver=material(0x9395a8,.4,.3),deskMat=material(0xe8e6ef,.55),legMat=material(0xa3a2b5,.4,.3);
function mesh(geometry,mat,parent,x=0,y=0,z=0){let m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,w,h,d,mat,x=0,y=0,z=0,r=.05){return mesh(rounded(w,h,d,Math.min(r,w/3,h/3,d/3)),mat,parent,x,y,z);}
function sphere(parent,r,mat,x=0,y=0,z=0){return mesh(new THREE.SphereGeometry(r,12,8),mat,parent,x,y,z);}
function limb(parent,length,mat){return mesh(new THREE.CylinderGeometry(.065,.075,length,12),mat,parent);}
const vA=new THREE.Vector3(),vB=new THREE.Vector3(),vC=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
function boneBetween(m,a,b){vA.set(...a);vB.set(...b);m.position.copy(vA).add(vB).multiplyScalar(.5);vC.subVectors(vB,vA);m.scale.y=vC.length();m.quaternion.setFromUnitVectors(up,vC.normalize());}
function labelScreen(parent,color){let g=new THREE.Group();parent.add(g);g.position.set(-.57,1.28,-.35);box(g,.95,.62,.10,dark,0,.1,0,.05);const panel=material(0x282b44,.5);box(g,.84,.5,.025,panel,0,.1,.065,.015);let glow=new THREE.MeshBasicMaterial({color});g.userData.bars=[];for(let j=0;j<4;j++)g.userData.bars.push(box(g,.50-j*.07,.018,.012,glow,-.07,.28-j*.1,.083,.004));box(g,.08,.25,.08,silver,0,-.31,0,.02);box(g,.4,.035,.23,legMat,0,-.43,.05,.01);screenGroups.push(g);}
function workstation(a,index){let g=new THREE.Group();g.position.set(a.pos[0],0,a.pos[1]);scene.add(g);g.scale.setScalar(1.20);const accent=material(a.color,.4,.12);
 // Desk sits to the left of the agent so faces and hands remain visible from the camera.
 box(g,2.05,.13,1.16,deskMat,-.45,.93,-.05,.06);for(let x of [-1.25,.34])for(let z of [-.46,.35])box(g,.085,.89,.085,legMat,x,.45,z,.02);
 box(g,.65,.04,.24,dark,-.55,1.02,.24,.014);for(let n=0;n<6;n++)box(g,.055,.009,.15,legMat,-.80+n*.10,1.046,.24,.003);labelScreen(g,a.color);
 // Desk lamp and discreet plant.
 box(g,.12,.36,.12,legMat,-1.25,1.16,-.29,.03);sphere(g,.095,accent,-1.25,1.39,-.29);box(g,.17,.19,.17,white,.34,1.09,-.28,.035);for(let n=0;n<3;n++){let leaf=sphere(g,.09,material(0x8cae9c),.34+(n-1)*.055,1.25+Math.sin(n)*.05,-.28);leaf.scale.set(.55,1.5,.65);}
 const r=new THREE.Group();r.position.set(.52,0,.62);g.add(r);
 const root=new THREE.Group();r.add(root);const torso=box(root,.52,.55,.34,accent,0,.98,0,.09);box(root,.30,.22,.04,white,0,1.04,.19,.035);const core=sphere(root,.04,new THREE.MeshBasicMaterial({color:a.color}),0,1.05,.22);
 const head=new THREE.Group();head.position.set(0,1.51,0);root.add(head);box(head,.69,.51,.48,white,0,0,0,.12);box(head,.59,.31,.07,dark,0,-.012,.247,.075);let eyes=[];const eyeMat=new THREE.MeshBasicMaterial({color:a.color});for(let x of [-.145,.145])eyes.push(box(head,.075,.12,.025,eyeMat,x,.018,.294,.025));box(head,.11,.018,.015,eyeMat,0,-.087,.3,.004);
 for(let x of [-.375,.375]){sphere(head,.083,accent,x,0,0);box(head,.06,.18,.18,silver,x,0,0,.025);}mesh(new THREE.CylinderGeometry(.016,.016,.17,8),silver,head,0,.31,0);sphere(head,.041,eyeMat,0,.41,0);
 const legs=[];for(let x of [-.16,.16]){let leg=new THREE.Group();leg.position.set(x,.69,0);root.add(leg);box(leg,.16,.46,.18,white,0,-.23,0,.045);sphere(leg,.10,silver,0,-.12,0);box(leg,.24,.14,.35,dark,0,-.55,.07,.05);legs.push(leg);}
 const arm=[];for(let side of [-1,1]){let shoulder=[side*.33,1.18,0];sphere(root,.12,white,...shoulder);let upper=limb(root,1,white),lower=limb(root,1,silver),elbow=sphere(root,.09,accent),hand=sphere(root,.10,white);arm.push({side,shoulder,upper,lower,elbow,hand});}
 let ring=mesh(new THREE.RingGeometry(1.18,1.21,64),new THREE.MeshBasicMaterial({color:a.color,transparent:true,opacity:.13,side:THREE.DoubleSide}),scene,a.pos[0],.095,a.pos[1]+.35);ring.rotation.x=-Math.PI/2;rings.push(ring);
 const tablet=box(root,.42,.28,.045,dark,-.04,1.04,.44,.025);box(tablet,.29,.015,.013,eyeMat,0,.035,.035,.003);tablet.visible=false;
 robots.push({tablet,station:g,group:r,root,head,torso,core,eyes,legs,arms:arm,index,baseX:.52,baseZ:.62});return g;}
function createScene(){const viewport=$('viewport');scene=new THREE.Scene();scene.background=null;scene.fog=new THREE.Fog(0xd9d8e5,38,65);camera=new THREE.PerspectiveCamera(35,1,.1,90);try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){renderer=new SVGRenderer();renderer.setQuality('low');softwareRenderer=true;document.querySelector('.scene-tag').innerHTML='<i></i> VISTA 3D COMPATIBLE';}if(!softwareRenderer){renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;}viewport.append(renderer.domElement);createSkyline();renderer.domElement.style.position='relative';renderer.domElement.style.zIndex='1';if(!softwareRenderer)renderer.setClearColor(0x000000,0);renderer.domElement.setAttribute('aria-label','Siete robots articulados en una sala de supervisión 3D');renderer.domElement.setAttribute('role','img');scene.add(new THREE.HemisphereLight(0xf7f4ff,0x827b9d,2.2));let key=new THREE.DirectionalLight(0xfff8f2,3.2);key.position.set(-7,16,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:45});key.shadow.normalBias=.035;key.shadow.bias=-.0002;key.shadow.radius=6;scene.add(key);let fill=new THREE.DirectionalLight(0xd9d4ff,1.3);fill.position.set(8,8,-9);scene.add(fill);
 if(!softwareRenderer){box(scene,20.3,.28,18.7,material(0xdedce8,.65),0,-.10,.4,.1);box(scene,19.9,.04,18.3,material(0xf0edf5,.7),0,.055,.4,.02);}else{scene.add(new THREE.AmbientLight(0xb1bdd0,.75));key.intensity=.55;fill.intensity=.18;for(let x=-9;x<10;x+=1.5)for(let z=-8;z<10;z+=1.5){let tile=mesh(new THREE.PlaneGeometry(1.49,1.49,2,2),material(0xd4dee9),scene,x,.06,z);tile.rotation.x=-Math.PI/2;}}
 // Tile joints follow the actual floor plane. All robots stand upright on its upper face.
 const jointMat=new THREE.LineBasicMaterial({color:0xd4d0e0,transparent:true,opacity:.52});for(let x=-9.5;x<=9.5;x+=1.5){let g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,.083,-8.5),new THREE.Vector3(x,.083,9.5)]);scene.add(new THREE.Line(g,jointMat));}for(let z=-8.5;z<=9.5;z+=1.5){let g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-9.9,.083,z),new THREE.Vector3(9.9,.083,z)]);scene.add(new THREE.Line(g,jointMat));}
 // Low cutaway rear walls preserve the view and avoid covering agents.
 box(scene,20,.72,.18,material(0x929fb5),0,.42,-8.7,.06);box(scene,.18,.72,18,material(0x929fb5),-9.95,.42,.3,.06);
 box(scene,10.3,.025,.07,material(0xb2a1d8),0,.8,-7.05,.01);for(let i=0;i<5;i++){box(scene,.55,.11,.55,material(0xc8c1dc),-6.1+i*3.1,.15,-6.25,.04);}
 // El Gerente recibe los documentos en el centro; los colores se conservan al archivarlos.
 createArchiveHub();createChiefOffice();
 agents.forEach(workstation);if(softwareRenderer){for(const a of agents){for(let n=0;n<3;n++){let shadow=mesh(new THREE.CircleGeometry(.48+n*.17,24),new THREE.MeshBasicMaterial({color:0x645478,transparent:true,opacity:.045,depthWrite:false}),scene,a.pos[0]+.2,.086+n*.001,a.pos[1]+.55);shadow.rotation.x=-Math.PI/2;shadow.scale.set(1.5,.8,1);shadow.castShadow=false;}}}
 for(let i=0;i<6;i++){
  const from=i,to=i<5?5:6,a=agents[from].pos,b=agents[to].pos;
  const end=new THREE.Vector3(b[0]-.55,1.35,b[1]+.28),start=new THREE.Vector3(a[0]+.5,1.35,a[1]+.6);
  const curve=new THREE.CubicBezierCurve3(start,new THREE.Vector3(start.x*.7,2.0,start.z*.75),new THREE.Vector3(end.x,2.0,end.z+.8),end);
  const path=mesh(new THREE.TubeGeometry(curve,28,.021,4,false),new THREE.MeshBasicMaterial({color:agents[from].color,transparent:true,opacity:.38}),scene);path.castShadow=false;
  for(let n=0;n<2;n++){const packet=createFile(agents[from].color);scene.add(packet);routes.push({curve,packet,offset:i*.16+n*.5,auditor:i<5?i:null,end,archive:i<5?archiveSlots[i].target:null});}
 }
 createUpperFloor();$('loading').hidden=true;new ResizeObserver(resize).observe(viewport);resize();setupCamera();requestAnimationFrame(animate);}
function createFile(color){
 const g=new THREE.Group(),paint=new THREE.MeshBasicMaterial({color});
 mesh(new THREE.BoxGeometry(.45,.56,.065),paint,g);mesh(new THREE.BoxGeometry(.11,.10,.02),white,g,.15,.20,.045);
 for(let j=0;j<3;j++)mesh(new THREE.BoxGeometry(.28-j*.035,.02,.015),white,g,-.025,.10-j*.085,.048);
 return g;
}
function createArchiveHub(){
 const hub=agents[5].pos;
 let rug=mesh(new THREE.CircleGeometry(2.1,48),new THREE.MeshBasicMaterial({color:0x9dbdb4,transparent:true,opacity:.32}),scene,hub[0],.094,hub[1]+.45);rug.rotation.x=-Math.PI/2;
 box(scene,.72,.12,.55,dark,hub[0]-.65,1.26,hub[1]+.20,.035);
 // Cinco bandejas: una por auditor. La animación no cuenta archivos reales.
 box(scene,.83,1.5,.65,material(0x344b63),hub[0]+1.72,.86,hub[1]+.45,.055);
 for(let i=0;i<5;i++){
  const y=.35+i*.245;box(scene,.68,.025,.58,silver,hub[0]+1.72,y-.07,hub[1]+.45,.008);
  const folder=createFile(agents[i].color);folder.scale.set(.80,.40,1);folder.position.set(hub[0]+1.72,y,hub[1]+.73);scene.add(folder);
  const indicator=sphere(scene,.045,new THREE.MeshBasicMaterial({color:agents[i].color}),hub[0]+2.02,y,hub[1]+.82);
  archiveSlots.push({folder,indicator,target:new THREE.Vector3(hub[0]+1.72,y,hub[1]+.73),baseY:y});
 }
 const legend=$('flow-legend');legend.innerHTML='<span class="legend-title">ENVÍO Y ARCHIVO ILUSTRATIVOS</span>'+agents.slice(0,5).map(a=>`<span><i style="background:#${a.color.toString(16).padStart(6,'0')}"></i>${a.short}</span>`).join('')+'<b>→ Gerente → Jefe</b>';
}
function createChiefOffice(){
 const steel=material(0x8094ae),wall=material(0xc9d6e4),warm=material(0xb3a185);
 box(scene,8,.055,5.1,material(0xabbace),3.3,.105,-5.75,.025);
 box(scene,.12,.55,5.15,wall,-.7,.40,-5.75,.025);box(scene,5.9,.55,.12,wall,4.4,.40,-3.18,.025);
 for(const x of [-.7,7.3])box(scene,.075,2.65,.075,steel,x,1.48,-8.2,.012);
 box(scene,8,.08,.10,steel,3.3,2.79,-8.2,.012);
 if(!softwareRenderer){const glass=new THREE.MeshBasicMaterial({color:0xb7d8e9,transparent:true,opacity:.12,side:THREE.DoubleSide,depthWrite:false});mesh(new THREE.PlaneGeometry(7.9,2.5),glass,scene,3.3,1.5,-8.17);}
 // Entrada lateral abierta y un mueble del despacho.
 box(scene,1.1,1.0,.45,warm,6.25,.68,-7.65,.045);for(let i=0;i<3;i++)box(scene,.23,.3,.15,material(agents[i].color),5.95+i*.3,1.35,-7.63,.02);
 let label=document.createElement('div');label.id='office-label';label.className='office-label';label.textContent='OFICINA DEL JEFE';$('labels').append(label);
}
function createUpperFloor(){
 groundFloor=new THREE.Group();for(const child of [...scene.children])if(!child.isLight)groundFloor.add(child);scene.add(groundFloor);
 upperFloor=new THREE.Group();upperFloor.position.y=6;upperFloor.visible=false;scene.add(upperFloor);
 const stone=material(0xe3e2ec,.72),trim=material(0xa9a2c5,.55),accent=material(0x929fc4,.5),seams=new THREE.LineBasicMaterial({color:0xc7c4d7});
 if(softwareRenderer){for(let x=-9;x<10;x+=1.5)for(let z=-8;z<10;z+=1.5){let tile=mesh(new THREE.PlaneGeometry(1.49,1.49),stone,upperFloor,x,.06,z);tile.rotation.x=-Math.PI/2;}}
 else{box(upperFloor,20.3,.3,18.7,trim,0,-.12,.4,.09);box(upperFloor,19.9,.04,18.3,stone,0,.055,.4,.02);}
 for(let x=-9.5;x<=9.5;x+=1.5){let g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,.083,-8.5),new THREE.Vector3(x,.083,9.5)]);upperFloor.add(new THREE.Line(g,seams));}
 for(let z=-8.5;z<=9.5;z+=1.5){let g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-9.9,.083,z),new THREE.Vector3(9.9,.083,z)]);upperFloor.add(new THREE.Line(g,seams));}
 // Arquitectura del piso superior: barandal, acceso y luz. Sin puestos ni agentes ficticios.
 box(upperFloor,16,.6,.17,trim,0,.36,-7.2,.04);box(upperFloor,.17,.6,15,trim,-7.95,.36,.3,.04);
 for(let x=-7;x<=7;x+=2){box(upperFloor,.08,1.0,.08,accent,x,.64,-7.03,.015);}
 box(upperFloor,14.2,.065,.065,accent,0,1.15,-7.03,.015);
 box(upperFloor,3.4,2.7,.18,trim,-5.2,1.43,-6.98,.055);box(upperFloor,2.7,2.32,.12,material(0xb7b8d1),-5.2,1.49,-6.84,.035);
 box(upperFloor,.035,2.22,.035,accent,-5.2,1.49,-6.76,.006);
 box(upperFloor,2.5,.05,.75,accent,-5.2,.13,-6.15,.018);
 for(let i=0;i<3;i++)box(upperFloor,.8,.035,.08,accent,5.6,.12,-5.8+i*.2,.01);
 officeEnvironment(groundFloor);officeEnvironment(upperFloor);
}
function createSkyline(){
 let backdrop=$('city-backdrop');if(!backdrop){backdrop=document.createElement('div');backdrop.id='city-backdrop';backdrop.setAttribute('aria-hidden','true');$('viewport').prepend(backdrop);}
 const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=1050;const c=canvas.getContext('2d');
 let seed=73;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const sky=c.createLinearGradient(0,0,0,1050);sky.addColorStop(0,nightMode?'#0b142c':'#263451');sky.addColorStop(.45,nightMode?'#263451':'#68788f');sky.addColorStop(.78,nightMode?'#5a566d':'#d3aea2');sky.addColorStop(1,'#d2c7d3');c.fillStyle=sky;c.fillRect(0,0,1800,1050);
 const glow=c.createRadialGradient(1390,360,5,1390,360,340);glow.addColorStop(0,nightMode?'#d4e3f33b':'#ffd3a987');glow.addColorStop(1,'#ffd3a900');c.fillStyle=glow;c.fillRect(1000,0,800,800);
 c.beginPath();c.arc(1390,320,nightMode?25:43,0,Math.PI*2);c.fillStyle=nightMode?'#dce7f7':'#f9d5ae';c.fill();
 for(let i=0;i<40;i++){c.fillStyle='rgba(240,229,230,.025)';c.beginPath();c.ellipse(random()*1800,random()*440,80+random()*130,5+random()*10,0,0,Math.PI*2);c.fill();}
 for(let layer=0;layer<3;layer++){
  let x=-40;while(x<1840){const w=32+random()*72,h=90+random()*(170+layer*90),bottom=460+layer*30,y=bottom-h;
   const body=c.createLinearGradient(x,y,x+w,y);body.addColorStop(0,['#8191aa','#4f6583','#263d59'][layer]);body.addColorStop(.65,['#647b96','#364f6f','#1c314c'][layer]);body.addColorStop(1,['#586d88','#2e445f','#162a44'][layer]);c.fillStyle=body;c.fillRect(x,y,w,h);
   c.fillStyle=['#90a0b6','#658099','#496078'][layer];c.fillRect(x,y,w,2);c.fillRect(x+w*.78,y,2,h);
   if(random()>.75){c.fillStyle='#526984';c.fillRect(x+w*.28,y-13,w*.48,13);c.fillRect(x+w*.51,y-40,2,27);}
   for(let row=y+10;row<bottom-5;row+=11)for(let col=x+6;col<x+w-5;col+=10){if(random()>.48){c.fillStyle=random()>.32?(nightMode?'#f4c98ea8':'#ffdeac94'):'#badcf548';c.fillRect(col,row,3.5,5);}}
   c.fillStyle='#10223922';for(let row=y+7;row<bottom;row+=22)c.fillRect(x,row,w,1);
   x+=w+8+random()*18;
  }
 }
 const haze=c.createLinearGradient(0,470,0,1050);haze.addColorStop(0,'#c7c3d300');haze.addColorStop(1,'#c7c3d3');c.fillStyle=haze;c.fillRect(0,470,1800,580);
 backdrop.style.backgroundImage='url('+canvas.toDataURL('image/webp',.92)+')';document.documentElement.dataset.ambience=nightMode?'noche':'atardecer';
}
$('ambience').onclick=()=>{nightMode=!nightMode;createSkyline();$('ambience').textContent=nightMode?'Ambiente: noche':'Ambiente: atardecer';$('ambience').setAttribute('aria-pressed',String(nightMode));};
$('motion-style').onchange=e=>{motionRate=e.target.value==='activo'?1.35:.72;};
function officeEnvironment(parent){
 // Silueta urbana y arquitectura: geometría local, sin imágenes ni servicios externos.
 const flat=(color)=>new THREE.MeshBasicMaterial({color});
 const beam=(w,h,d,mat,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z);
 const solid=(w,h,d,color,x,y,z)=>{let o=mesh((softwareRenderer?new THREE.PlaneGeometry(w,h):new THREE.BoxGeometry(w,h,d)),flat(color),parent,x,y,z);o.castShadow=false;return o;};
 // Ventanales altos; se omite el cristal en el renderizador compatible para conservar nitidez.
 const frame=material(0x8e91aa,.35,.25),ivory=material(0xe9e6ef,.7);
 for(let x=-10;x<=10;x+=4){beam(.105,5.7,.14,frame,x,2.96,-8.7,.018);}
 beam(20.2,.14,.22,ivory,0,5.85,-8.7,.025);beam(20,.10,.13,frame,0,1.15,-8.6,.018);
 if(!softwareRenderer){const glass=new THREE.MeshBasicMaterial({color:0xc7e1ed,transparent:true,opacity:.085,side:THREE.DoubleSide,depthWrite:false});mesh(new THREE.PlaneGeometry(20,5.4),glass,parent,0,3,-8.66);}
 // Lateral abierto, columnas y luminarias suspendidas dejan ver a los robots.
 for(const x of [-9.8,9.8]){beam(.22,5.7,.22,ivory,x,2.95,-8.5,.035);}
 for(const x of [-5,2,7]){solid(2.4,.065,.20,0xf8edda,x,4.4,-.7);solid(.025,1.35,.025,0xa9a4bd,x,5.1,-.7);}
 for(const x of [-8.7,8.7]){beam(.52,.65,.52,ivory,x,.4,-6.6,.09);for(let n=0;n<5;n++){let leaf=sphere(parent,.20,material(0x789d93),x+Math.sin(n*2)*.2,1.0+n*.15,-6.6+Math.cos(n)*.15);leaf.scale.set(.65,1.9,.65);}}
 // Tráfico lejano: decorativo, independiente de las métricas de las aplicaciones.
 solid(35,.12,1.0,0xa4adc3,0,.15,-11.2);
 for(let i=0;i<7;i++){let car=solid(.25,.11,.14,i%2?0xf9dfb0:0xe6edff,-16+i*4.7,.26,-10.9);cityTraffic.push({car,offset:i*.14,direction:i%2?1:-1});}
}
let azimuth=.18,elevation=.60,distance=25,targetDistance=25;function updateCamera(){camera.position.set(Math.sin(azimuth)*distance*Math.cos(elevation),Math.sin(elevation)*distance+cameraFocusY,Math.cos(azimuth)*distance*Math.cos(elevation)+.5);camera.lookAt(0,1.1+cameraFocusY,.5);}
function resize(){if(!renderer)return;let r=$('viewport').getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();let narrow=r.width<550;targetDistance=narrow?42:34;distance=targetDistance;updateCamera();}
function setupCamera(){let dragging=false,startX=0,startY=0,moved=false;const el=$('viewport');el.addEventListener('pointerdown',e=>{dragging=true;moved=false;startX=e.clientX;startY=e.clientY;el.setPointerCapture(e.pointerId);el.classList.add('dragging')});el.addEventListener('pointermove',e=>{if(!dragging)return;let dx=e.clientX-startX,dy=e.clientY-startY;if(Math.abs(dx)+Math.abs(dy)>3)moved=true;azimuth=THREE.MathUtils.clamp(azimuth-dx*.006,-.7,.7);elevation=THREE.MathUtils.clamp(elevation+dy*.004,.53,1.05);startX=e.clientX;startY=e.clientY;updateCamera();});el.addEventListener('pointerup',e=>{dragging=false;el.classList.remove('dragging');if(!moved&&activeFloor===0){let rect=el.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);let hits=ray.intersectObjects(robots.map(r=>r.group),true);if(hits.length){let object=hits[0].object;while(object){let i=robots.findIndex(r=>r.group===object);if(i>=0){select(i);break;}object=object.parent;}}}});el.addEventListener('pointercancel',()=>{dragging=false;el.classList.remove('dragging')});el.addEventListener('wheel',e=>{e.preventDefault();targetDistance=THREE.MathUtils.clamp(targetDistance+e.deltaY*.015,24,45)},{passive:false});}
function animateRobot(r){
 const i=r.index,p=t+i*1.7,cycle=(t+i*4.1)%28,walk=i<5&&cycle>13&&cycle<20,progression=walk?Math.sin((cycle-13)/7*Math.PI):0;
 const direction=i%2?1:-1; r.group.position.x=r.baseX+progression*direction*1.0;r.group.position.z=r.baseZ+progression*.55;
 r.group.rotation.y=walk?direction*.35:Math.sin(p*.7)*.13;
 r.root.position.y=.06+Math.sin(p*1.9)*.022+(walk?Math.abs(Math.sin(p*8))*.06:0);r.root.rotation.z=Math.sin(p*.9)*.045;r.torso.rotation.x=.04+Math.sin(p*1.1)*.045;
 r.head.rotation.y=walk?direction*.14:Math.sin(p*.65)*.30;r.head.rotation.x=Math.sin(p*.95)*.075-.07;
 const blink=(p%5.7)>5.5?.13:1;r.eyes.forEach(e=>e.scale.y=blink);
 r.legs.forEach((leg,j)=>{leg.rotation.x=walk?Math.sin(p*8+j*Math.PI)*.43:Math.sin(p*.65+j)*.035;});
 r.tablet.visible=walk||cycle>22;r.tablet.rotation.x=-.12+Math.sin(p)*.05;
 r.arms.forEach((arm,j)=>{
  const wave=!walk&&cycle>8&&cycle<12&&j===1;
  let elbow=[arm.side*.45,wave?1.38:1.0,wave?.02:.27],hand=[wave?.50:arm.side*.24-.16,wave?1.75+Math.sin(p*7)*.10:1.02+Math.sin(p*10+j*2)*.055,wave?.14:.55];
  if(walk){elbow=[arm.side*.44,.96,.20];hand=[arm.side*.26,.98,.44+Math.sin(p*8+j)*.07];}
  boneBetween(arm.upper,arm.shoulder,elbow);boneBetween(arm.lower,elbow,hand);arm.elbow.position.set(...elbow);arm.hand.position.set(...hand);
 });
}
let lastFrame=0;function animate(ms){if(frameError)return;if(softwareRenderer&&lastFrame&&ms-lastFrame<170){requestAnimationFrame(animate);return;}let dt=lastFrame?Math.min((ms-lastFrame)/1000,.4):0;lastFrame=ms;if(!paused)t+=dt*motionRate;distance=THREE.MathUtils.lerp(distance,targetDistance,.10);cameraFocusY=THREE.MathUtils.lerp(cameraFocusY,activeFloor*6,.16);updateCamera();robots.forEach(animateRobot);routes.forEach(r=>{
 const phase=(t*.075+r.offset)%1;
 if(r.archive&&phase>.68){const v=Math.min(1,(phase-.68)/.27);r.packet.position.lerpVectors(r.end,r.archive,v);r.packet.position.y+=Math.sin(v*Math.PI)*.55;r.packet.scale.setScalar(1-v*.3);r.packet.visible=phase<.95;}
 else{const u=r.archive?phase/.68:phase;r.packet.position.copy(r.curve.getPointAt(u));r.packet.scale.setScalar(1);r.packet.visible=true;}
 r.packet.rotation.y=.18+Math.sin(t+r.offset)*.10;r.packet.rotation.z=Math.sin(t*1.2+r.offset)*.04;
 });archiveSlots.forEach((slot,i)=>{const phase=(t*.075+i*.16)%1,receiving=phase>.88&&phase<.99;slot.indicator.scale.setScalar(receiving?1.65:1);slot.folder.position.y=slot.baseY+(receiving?Math.sin((phase-.88)/.11*Math.PI)*.075:0);});screenGroups.forEach((g,i)=>(g.userData.bars??[]).forEach((bar,j)=>bar.scale.x=.6+.4*Math.sin(t*2.1+i+j)));cityTraffic.forEach(({car,offset,direction})=>{car.position.x=direction*(((t*.025+offset)%1)*34-17);});renderer.render(scene,camera);let rect=$('viewport').getBoundingClientRect();labels.forEach((el,i)=>{let a=agents[i],p=new THREE.Vector3(a.pos[0],.05,a.pos[1]+1.65).project(camera);el.style.left=(p.x*.5+.5)*rect.width+'px';el.style.top=(-p.y*.5+.5)*rect.height+'px';el.style.opacity=p.z>1?'0':'1';});const officeLabel=$('office-label');if(officeLabel){let p=new THREE.Vector3(3.4,2.5,-7.6).project(camera);officeLabel.style.left=(p.x*.5+.5)*rect.width+'px';officeLabel.style.top=(-p.y*.5+.5)*rect.height+'px';}if(softwareRenderer)setTimeout(()=>requestAnimationFrame(animate),180);else requestAnimationFrame(animate);}
function updatePause(){$('pause').textContent=paused?'▷':'Ⅱ';$('pause').setAttribute('aria-label',paused?'Reanudar animación':'Pausar animación');$('pause').title=paused?'Reanudar animación':'Pausar animación';$('pause').setAttribute('aria-pressed',String(paused));}$('pause').onclick=()=>{paused=!paused;updatePause()};updatePause();$('camera').onclick=()=>{azimuth=.18;elevation=.60;resize();};let tourStep=0;$('tour').onclick=()=>{select(tourStep++%7);$('flow-message').textContent=selected<5?`${agents[selected].short} → Gerente · el movimiento ilustra la entrega de evidencia.`:selected===5?'Gerente → Jefe · validación de cinco auditores.':'Jefe → Tú · resumen en el panel; sin commits ni despliegues de agentes.';};
try{createScene();select(0);}catch(error){frameError=true;$('loading').hidden=false;$('loading').textContent='No se pudo iniciar WebGL. Puedes consultar los agentes y reportes con los controles inferiores.';console.error(error);}
