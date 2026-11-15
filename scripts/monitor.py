"""Comprobaciones de solo lectura; evidencias públicas sin cuerpos ni credenciales."""
import argparse,datetime as dt,hashlib,json,os,time,urllib.request,urllib.error
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
TARGETS={'vortex':('Vortex','Vortex-By-Nova-Nexus','VORTEX'),'apps':('Apps: Nova HUB, INKBOT PRO, INKBOT VIDEO y Moldes Gabys','Nova-HUB','NOVA HUB'),'neural':('Neural Brain','Neural-Brain-Claude','Neural Brain'),'discord':('Discord',None,None),'bots':('Bots Vortex',None,None)}
def stamp():return dt.datetime.now(ZoneInfo('America/Mexico_City')).isoformat()
def read(path,default):
 try:return json.loads(Path(path).read_text())
 except (FileNotFoundError,json.JSONDecodeError):return default
def write(path,obj):
 p=Path(path);p.parent.mkdir(exist_ok=True,parents=True);p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def _audit_target(agent,target=None):
 name,repo,contains=target or TARGETS[agent];r={'agente':agent,'aplicacion':name,'fecha':stamp(),'resultado':'no se pudo comprobar','entorno':'producción pública · solo lectura','funcion':'Entrega del documento HTML','esperado':'HTTP 200 y título esperado','pasos':[],'gravedad':'sin determinar','evidencia':{},'cobertura':'No verifica botones, sesiones, IA, tráfico real ni lógica de negocio.'}
 if repo is None:
  r['resumen']='Bloqueado: falta conector de lectura privada del servidor.' if agent=='discord' else 'Bloqueado: falta inventario operativo y telemetría por bot.';return r
 url='https://soobroon-beep.github.io/'+repo+'/';r['pasos']=['GET HTTPS con User-Agent SalaAuditoria/2.0 y cabecera X-Synthetic-Monitor: sala-de-agentes.'];r['url']=url
 for attempt in range(2):
  start=time.monotonic()
  try:
   request=urllib.request.Request(url,headers={'User-Agent':'SalaAuditoria/2.0 (synthetic-monitor)','X-Synthetic-Monitor':'sala-de-agentes'})
   with urllib.request.urlopen(request,timeout=12) as response:
    body=response.read(1500000);status=response.status;final=response.url
   ok=status==200 and contains.encode() in body
   r.update(resultado='funciona' if ok else 'falló',gravedad='sin incidencia HTTP' if ok else 'media',resumen='La página respondió HTTP 200 y contiene el identificador esperado.' if ok else 'El documento no cumplió la respuesta o el contenido esperado.',observado=f'HTTP {status}; identificador presente: {contains.encode() in body}',evidencia={'http':status,'ms':round((time.monotonic()-start)*1000),'bytes_muestreados':len(body),'sha256_muestra':hashlib.sha256(body).hexdigest(),'url_final':final,'intentos':attempt+1});break
  except urllib.error.HTTPError as error:
   if error.code in (401,403,429):
    r.update(resumen=f'No comprobable: acceso restringido o límite HTTP {error.code}.',observado=f'HTTP {error.code}');break
   if attempt==1:r.update(resultado='falló',resumen=f'Respuesta HTTP {error.code} después de dos intentos.',observado=f'HTTP {error.code}',gravedad='media',evidencia={'http':error.code,'intentos':2})
  except (OSError,TimeoutError) as error:
   if attempt==1:r.update(resumen='No comprobable: error de transporte desde este ejecutor. No confirma una caída.',observado=type(error).__name__,evidencia={'intentos':2})
  if attempt==0:time.sleep(2)
 return r
APP_TARGETS=[('Nova HUB','Nova-HUB','NOVA HUB'),('INKBOT PRO','InkBot','INKBOT PRO'),('INKBOT VIDEO','INKBOT-VIDEO-','INKBOT VIDEO'),('Moldes Gabys','moldesgabys',"Moldes Gaby")]
def audit(agent):
 if agent!='apps':return _audit_target(agent)
 checks=[_audit_target(agent,t) for t in APP_TARGETS]
 result='falló' if any(c['resultado']=='falló' for c in checks) else 'funciona' if all(c['resultado']=='funciona' for c in checks) else 'no se pudo comprobar'
 return {'agente':'apps','aplicacion':TARGETS['apps'][0],'fecha':stamp(),'resultado':result,'funcion':'Entrega HTML de cuatro aplicaciones','objetivos':checks,'resumen':'Salud HTTP de cuatro aplicaciones; guardado real, IA y datos privados no certificados.','cobertura_completa':False}
def manager(rows):
 grouped={a:[] for a in TARGETS}
 for row in rows:
  if row.get('agente') in grouped:grouped[row['agente']].append(row)
 output=[];receipts=[]
 for a,v in TARGETS.items():
  group=grouped[a];base=next((r.copy() for r in group if not any(k in r for k in ['paginas','pruebas','flujos','bloqueo'])),None)
  if base is None:base={'agente':a,'aplicacion':v[0],'fecha':stamp(),'resultado':'no se pudo comprobar','resumen':'El auditor no entregó su reporte de salud; revisar ejecución.'}
  components={};findings=[]
  for r in group:
   if 'paginas' in r:
    components['interfaz']=r
    for page in r['paginas']:
     for error in page.get('errores_js',[]):findings.append({'aplicacion':v[0],'funcion':'JavaScript de interfaz','entorno':page.get('viewport'),'esperado':'Sin excepciones JavaScript','observado':error,'pasos':['Abrir '+page.get('url',''),'Navegar con los controles permitidos del inventario'],'gravedad':'media','estado':'investigando','responsable':'Auditor de '+v[0]})
     network=[x for x in page.get('red_fallida',[]) if x.get('error')!='net::ERR_ABORTED']
     if network:
      unique=list({(x.get('url'),x.get('http'),x.get('error')):x for x in network}.values())
      findings.append({'aplicacion':v[0],'funcion':'APIs y solicitudes de red','esperado':'Los proveedores responden o se comprueba la recuperación con un respaldo','observado':'Se observaron solicitudes fallidas desde el ejecutor de pruebas. Puede tratarse de restricciones del proveedor o del entorno; no se confirma una caída general. Rutas: '+str(unique[:12]),'evidencia':unique,'entorno':page.get('viewport'),'gravedad':'media','estado':'investigando','responsable':'Auditor de '+v[0],'siguiente_paso':'Reproducir la conexión y comprobar si el proveedor de respaldo completa la función.'})
     if page.get('desbordamiento_horizontal'):findings.append({'aplicacion':v[0],'funcion':'Diseño adaptable','esperado':'Sin desbordamiento horizontal','observado':'El documento excede el ancho de la pantalla','entorno':page.get('viewport'),'gravedad':'baja','estado':'investigando','responsable':'Auditor de '+v[0]})
   elif 'pruebas' in r or 'bloqueo' in r:
    components['codigo']=r
    if r.get('resultado')=='falló':findings.append({'aplicacion':v[0],'funcion':'Pruebas de código','esperado':'Suite satisfactoria','observado':r.get('detalle',r.get('evidencia',[])),'entorno':'Simulación aislada','gravedad':'alta' if a=='bots' else 'media','estado':'investigando','responsable':'Auditor de '+v[0]})
   elif 'flujos' in r:
    components['integraciones']=r
    for f in r['flujos']:
     if f['resultado']!='funciona':findings.append({'aplicacion':v[0],'funcion':f['flujo'],'esperado':'Ejecución reciente y sin fallo','observado':f,'entorno':'GitHub Actions','gravedad':'media','estado':'investigando' if f['resultado']=='falló' else 'pendiente de decisión','responsable':'Auditor de '+v[0]})
  manual=read(ROOT/'data/revision-manual.json',{})
  findings.extend(f for f in manual.get('hallazgos',[]) if f.get('agente')==a)
  base['componentes']=components;base['hallazgos']=findings;base['cobertura_completa']=False;base['resultado_http']=base['resultado']
  if any(r.get('resultado')=='falló' for r in components.values()):base['resultado']='falló';base['resumen']='Se detectaron fallos en las comprobaciones disponibles; ver hallazgos y evidencia.'
  elif any(f.get('funcion')=='APIs y solicitudes de red' for f in findings):base['resultado']='no se pudo comprobar';base['resumen']='Navegación comprobada, pero hubo solicitudes de red fallidas. Falta verificar los respaldos o restricciones del ejecutor; consulta los hallazgos.'
  elif components.get('interfaz',{}).get('resultado')=='no se pudo comprobar':base['resultado']='no se pudo comprobar';base['resumen']='Renderizado comprobado, pero los recorridos no pudieron verificarse (por ejemplo, falta sesión). Ver cobertura y evidencia.'
  elif components:base['resumen']+=' Interfaz, código e integraciones: consultar cobertura; las funciones privadas siguen sin certificar.'
  output.append(base);receipts.append({'auditor':a,'reportes_recibidos':len(group),'tipos':list(components),'fecha':stamp(),'salud_recibida':any('funcion' in r for r in group)})
 return {'agente':'gerente','fecha':stamp(),'resultado':'consolidado','resumen':'Cinco auditorías organizadas y enviadas al agente Jefe para validación. Los bloqueos no se marcan como funcionamiento correcto.','auditores':output,'recepciones':receipts,'destinatario':'Agente Jefe · nivel 1','responsables':{a:'Auditor de '+v[0] for a,v in TARGETS.items()},'siguiente_paso':'Revisar hallazgos y conectar cuentas de prueba, telemetría y analítica faltantes.'}
def chief(report,previous=None):
 rows=report['auditores'];good=sum(r['resultado']=='funciona' for r in rows);bad=sum(r['resultado']=='falló' for r in rows);blocked=len(rows)-good-bad
 summary=f'{good} auditores sin fallos en las pruebas disponibles; {bad} con fallos detectados; {blocked} bloqueados. Cobertura parcial: no se certifican todas las funciones privadas. El Gerente lo consolida; el Jefe valida y entrega al propietario.'
 previous=previous or {};prior={r['agente']:r for r in previous.get('auditores',[])};changes=[{'agente':r['agente'],'anterior':prior.get(r['agente'],{}).get('resultado','sin revisión'),'actual':r['resultado']} for r in rows if prior.get(r['agente'],{}).get('resultado')!=r['resultado']]
 incident_history=previous.get('incidencias',{}).copy()
 for r in rows:
  a=r['agente'];old=incident_history.get(a,{'fallos':0,'exitos':0,'estado':'sin incidencia'})
  if r['resultado']=='falló':
   n=old['fallos']+1;incident_history[a]={'fallos':n,'exitos':0,'estado':'confirmado' if n>=2 else 'investigando','responsable':'Auditor de '+r['aplicacion'],'siguiente_paso':'Revisar respuesta HTTP y reproducir; no modificar producción.'}
  elif r['resultado']=='funciona' and old['estado']!='sin incidencia':
   n=old['exitos']+1;incident_history[a]={'fallos':0,'exitos':n,'estado':'verificado' if n>=2 else 'investigando','responsable':'Auditor de '+r['aplicacion'],'siguiente_paso':'Mantener observación.'}
  # Las revisiones bloqueadas no resuelven ni confirman incidencias.
 return {'version':4,'generado':stamp(),'zona_horaria':'America/Mexico_City','ejecucion':os.getenv('GITHUB_RUN_ID','preparacion-local'),'origen':os.getenv('GITHUB_EVENT_NAME','ejecucion local verificable'),'url_ejecucion':f"https://github.com/{os.getenv('GITHUB_REPOSITORY','soobroon-beep/sala-de-agentes')}/actions/runs/{os.getenv('GITHUB_RUN_ID','')}" if os.getenv('GITHUB_RUN_ID') else None,'operacion_completa_24_7':False,'auditores':rows,'gerente':{k:v for k,v in report.items() if k!='auditores'},'jefe':{'agente':'jefe','identidad':'Agente validador · nivel 1','fecha':stamp(),'resultado':'reporte validado por el Jefe','resumen':summary,'cambios':changes,'entrega':'Informe registrado en GitHub Checks para lectura del panel, sin commits ni despliegues automáticos.','decisiones':['Canal de notificación y horario diario/semanal.','Fuentes privadas y cuentas de prueba.']},'incidencias':incident_history,'cadencia_minutos':60,'entrega_comprobada_en_panel':False,'alertas_github':'Sin envío de issues. Alertas visibles en el panel solo ante crítico confirmado y recuperación.','trafico_real':None,'costos_ia':0,'ia_automatica':False}
if __name__=='__main__':
 raise SystemExit('Entrada anterior retirada. Usa scripts/pipeline.py; los agentes no escriben en el repositorio.')
