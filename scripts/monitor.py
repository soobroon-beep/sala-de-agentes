"""Comprobaciones de solo lectura; evidencias públicas sin cuerpos ni credenciales."""
import argparse,datetime as dt,hashlib,json,os,time,urllib.request,urllib.error
from pathlib import Path
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]
TARGETS={'vortex':('Vortex','Vortex-By-Nova-Nexus','VORTEX'),'novahub':('Nova Hub','Nova-HUB','NOVA HUB'),'neural':('Neural Brain','Neural-Brain','NEURAL BRAIN'),'discord':('Discord',None,None),'bots':('Bots Vortex',None,None)}
def stamp():return dt.datetime.now(ZoneInfo('America/Mexico_City')).isoformat()
def read(path,default):
 try:return json.loads(Path(path).read_text())
 except (FileNotFoundError,json.JSONDecodeError):return default
def write(path,obj):
 p=Path(path);p.parent.mkdir(exist_ok=True,parents=True);p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def audit(agent):
 name,repo,contains=TARGETS[agent];r={'agente':agent,'aplicacion':name,'fecha':stamp(),'resultado':'no se pudo comprobar','entorno':'producción pública · solo lectura','funcion':'Entrega del documento HTML','esperado':'HTTP 200 y título esperado','pasos':[],'gravedad':'sin determinar','evidencia':{},'cobertura':'No verifica botones, sesiones, IA, tráfico real ni lógica de negocio.'}
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
def manager(rows):
 by_id={r['agente']:r for r in rows};rows=[by_id.get(a,{'agente':a,'aplicacion':v[0],'fecha':stamp(),'resultado':'no se pudo comprobar','resumen':'El auditor no entregó su reporte; revisar ejecución.'}) for a,v in TARGETS.items()]
 return {'agente':'gerente','fecha':stamp(),'resultado':'consolidado','resumen':'Cinco auditores consolidados; cada bloqueo conserva su motivo. No se presume funcionamiento de lo no comprobado.','auditores':rows,'responsables':{a:'Auditor de '+v[0] for a,v in TARGETS.items()},'siguiente_paso':'Conectar pruebas funcionales y fuentes privadas; configurar notificaciones externas.'}
def chief(report,previous=None):
 rows=report['auditores'];good=sum(r['resultado']=='funciona' for r in rows);bad=sum(r['resultado']=='falló' for r in rows);blocked=len(rows)-good-bad
 summary=f'{good} páginas cumplen el sondeo HTTP; {bad} comprobaciones fallaron; {blocked} auditores no pudieron comprobar su objetivo. Pruebas funcionales y entrega externa pendientes.'
 previous=previous or {};prior={r['agente']:r for r in previous.get('auditores',[])};changes=[{'agente':r['agente'],'anterior':prior.get(r['agente'],{}).get('resultado','sin revisión'),'actual':r['resultado']} for r in rows if prior.get(r['agente'],{}).get('resultado')!=r['resultado']]
 incident_history=previous.get('incidencias',{}).copy()
 for r in rows:
  a=r['agente'];old=incident_history.get(a,{'fallos':0,'exitos':0,'estado':'sin incidencia'})
  if r['resultado']=='falló':
   n=old['fallos']+1;incident_history[a]={'fallos':n,'exitos':0,'estado':'confirmado' if n>=2 else 'investigando','responsable':'Auditor de '+r['aplicacion'],'siguiente_paso':'Revisar respuesta HTTP y reproducir; no modificar producción.'}
  elif r['resultado']=='funciona' and old['estado']!='sin incidencia':
   n=old['exitos']+1;incident_history[a]={'fallos':0,'exitos':n,'estado':'verificado' if n>=2 else 'investigando','responsable':'Auditor de '+r['aplicacion'],'siguiente_paso':'Mantener observación.'}
  # Las revisiones bloqueadas no resuelven ni confirman incidencias.
 return {'version':2,'generado':stamp(),'zona_horaria':'America/Mexico_City','ejecucion':os.getenv('GITHUB_RUN_ID','preparacion-local'),'origen':os.getenv('GITHUB_EVENT_NAME','ejecucion local verificable'),'url_ejecucion':f"https://github.com/{os.getenv('GITHUB_REPOSITORY','soobroon-beep/sala-de-agentes')}/actions/runs/{os.getenv('GITHUB_RUN_ID','')}" if os.getenv('GITHUB_RUN_ID') else None,'operacion_completa_24_7':False,'auditores':rows,'gerente':{k:v for k,v in report.items() if k!='auditores'},'jefe':{'agente':'jefe','fecha':stamp(),'resultado':'reporte preparado','resumen':summary,'cambios':changes,'entrega':'Publicado en data/latest.json para consulta en el panel; sin notificación externa.','decisiones':['Canal de notificación y horario diario/semanal.','Fuentes privadas y cuentas de prueba.']},'incidencias':incident_history,'trafico_real':None,'costos_ia':0,'ia_automatica':False}
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('mode',choices=['auditor','gerente','jefe','local']);p.add_argument('--agent',choices=list(TARGETS));p.add_argument('--input',default='reports');p.add_argument('--output',default='out');args=p.parse_args();out=Path(args.output)
 if args.mode=='auditor':write(out/(args.agent+'.json'),audit(args.agent))
 elif args.mode=='gerente':write(out/'gerente.json',manager([read(p,{}) for p in Path(args.input).rglob('*.json')]))
 else:
  report=manager([audit(a) for a in TARGETS]) if args.mode=='local' else read(Path(args.input)/'gerente.json',{})
  previous=read(ROOT/'data/latest.json',{});result=chief(report,previous);write(ROOT/'data/latest.json',result);history=read(ROOT/'data/history.json',[]);history.append({'fecha':result['generado'],'ejecucion':result['ejecucion'],'resumen':result['jefe']['resumen']});write(ROOT/'data/history.json',history[-300:]);print(result['jefe']['resumen'])
