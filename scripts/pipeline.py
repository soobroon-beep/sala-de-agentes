"""Reutiliza los auditores existentes con cinco puestos y niveles Gerente/Jefe separados."""
import argparse,datetime as dt,hashlib,json,os
from pathlib import Path
from zoneinfo import ZoneInfo
import monitor
import report_store
ROOT=Path(__file__).resolve().parents[1]
CONFIG=json.loads((ROOT/'config-sala.json').read_text())
def save(path,data):monitor.write(path,data)
def plan():
 event=os.getenv('GITHUB_EVENT_NAME');cron=os.getenv('SALA_CRON','');requested=os.getenv('SALA_RONDA','completa')
 mode='semanal' if cron=='0 15 * * 1' else 'completa' if cron=='0 3,15 * * *' else 'ligera' if event=='schedule' else requested
 print(mode)
 if os.getenv('GITHUB_OUTPUT'):
  with open(os.environ['GITHUB_OUTPUT'],'a') as f:f.write('ronda='+mode+'\n')
 return mode
def normalize(x):return {'funciona':'FUNCIONA','falló':'FALLÓ','no se pudo comprobar':'NO SE PUDO COMPROBAR'}.get(x,'NO SE PUDO COMPROBAR')
def consolidate(folder):
 raw=[]
 for p in sorted(Path(folder).rglob('*.json')):
  d=monitor.read(p,{})
  if isinstance(d,dict) and d.get('agente') in monitor.TARGETS:raw.append(d)
 report=monitor.manager(raw);report['nivel']=2;report['destinatario']='Jefe · nivel 1'
 unique={}
 for a in report['auditores']:
  for f in a.get('hallazgos',[]):
   observed=f.get('observado');repo=observed.get('repositorio') if isinstance(observed,dict) else a['aplicacion']
   key=str(repo)+':'+f.get('funcion','')
   if key not in unique:
    x=f.copy();x['gravedad']={'critica':'Crítico','crítica':'Crítico','alta':'Alto','media':'Medio','baja':'Bajo'}.get(str(f.get('gravedad','')).lower(),'Medio');x['afectados']=[a['aplicacion']];x['naturaleza']='inferencia' if f.get('estado')!='confirmado' else 'hecho confirmado';x['evidencias']=[f.get('evidencia',f.get('observado'))];unique[key]=x
   else:
    unique[key]['afectados'].append(a['aplicacion']);unique[key]['evidencias'].append(f.get('evidencia',f.get('observado')))
 report['hallazgos_consolidados']=list(unique.values())
 report['ronda']=os.getenv('SALA_RONDA','ligera')
 report['recibido_de']=list(monitor.TARGETS)
 return report
def points(report):
 rows=[]
 for a in report['auditores']:
  for t in a.get('objetivos') or [a]:
   state=normalize(t.get('resultado'));coverage=t.get('cobertura','Solo comprobaciones disponibles; no es certificado de funcionamiento total.')
   if a['agente']=='apps':coverage='Salud HTTP; funciones privadas y guardado real requieren entorno de prueba.'
   rows.append({'auditor':a['agente'],'aplicacion':t.get('aplicacion',a['aplicacion']),'estado':state,'alcance':coverage,'fecha':t.get('fecha',a['fecha']),'url':t.get('url')})
 return rows
def validate(report,previous=None,history=None):
 previous=previous or {};history=history or [];roundtype=report.get('ronda','ligera')
 expected=set(monitor.TARGETS);receipts={r['auditor']:r for r in report.get('recepciones',[])};missing=sorted(a for a in expected if not receipts.get(a,{}).get('salud_recibida'))
 p=points(report);oldpoints={x['aplicacion']:x for x in previous.get('puntos',[])}
 changes=[{'aplicacion':x['aplicacion'],'antes':oldpoints.get(x['aplicacion'],{}).get('estado','SIN REVISIÓN'),'ahora':x['estado']} for x in p if oldpoints.get(x['aplicacion'],{}).get('estado')!=x['estado']]
 states=previous.get('incidencias',{}).copy();alerts=[];recoveries=[]
 # Crítico solo si el documento público respondió 5xx en dos intentos; no por 403, límites ni errores del ejecutor.
 for a in report['auditores']:
  for check in a.get('objetivos') or [a]:
   app=check.get('aplicacion',a['aplicacion']);ev=check.get('evidencia') or {};prev=states.get(app,{})
   if check.get('resultado')=='falló' and ev.get('http',0)>=500 and ev.get('intentos',0)>=2:
    states[app]={'estado':'confirmado','severidad':'Crítico','exitos':0,'funcion':'Disponibilidad HTTP','fecha':monitor.stamp()}
    if prev.get('estado')!='confirmado':alerts.append({'aplicacion':app,'funcion':'Disponibilidad HTTP','severidad':'Crítico','confirmacion':'Dos respuestas 5xx en intentos separados','evidencia':ev})
   elif check.get('resultado_http',check.get('resultado'))=='funciona' and prev.get('estado')=='confirmado':
    n=prev.get('exitos',0)+1;states[app]={**prev,'exitos':n}
    if n>=2:states[app]['estado']='verificado';recoveries.append({'aplicacion':app,'estado':'RECUPERACIÓN VERIFICADA','evidencia':'Dos rondas consecutivas con disponibilidad HTTP correcta.'})
 counts={s:sum(x['estado']==s for x in p) for s in ['FUNCIONA','FALLÓ','NO SE PUDO COMPROBAR']}
 summary=f"{counts['FUNCIONA']} comprobaciones disponibles funcionan; {counts['FALLÓ']} fallaron; {counts['NO SE PUDO COMPROBAR']} no se pudieron comprobar. Cobertura parcial, sin certificar funciones privadas."
 findings=report.get('hallazgos_consolidados',[])
 correlations=[]
 for f in findings:
  if len(set(f.get('afectados',[])))>1:correlations.append({'naturaleza':'inferencia','aplicaciones':sorted(set(f['afectados'])),'observacion':'Comparten el hallazgo '+f['funcion']+'. No demuestra pérdida de datos.','evidencia':f.get('evidencias',[])[:2]})
 trend={}
 for old in history:
  for a in old.get('auditores',[]):
   for f in a.get('hallazgos',[]):
    key=a['agente']+' · '+f.get('funcion','');trend[key]=trend.get(key,0)+1
 title={'ligera':'Revisión ligera horaria','completa':'Resumen ejecutivo · auditoría completa','semanal':'Informe semanal de tendencias'}[roundtype]
 report_id=os.getenv('GITHUB_RUN_ID','prueba-local');runurl=f"https://github.com/{os.getenv('GITHUB_REPOSITORY','soobroon-beep/sala-de-agentes')}/actions/runs/{report_id}" if os.getenv('GITHUB_RUN_ID') else None
 return {'version':4,'generado':monitor.stamp(),'zona_horaria':'America/Mexico_City','ejecucion':report_id,'origen':os.getenv('GITHUB_EVENT_NAME','prueba local'),'url_ejecucion':runurl,'ronda':roundtype,'operacion_completa_24_7':False,'puntos':p,'auditores':report['auditores'],'gerente':{k:v for k,v in report.items() if k!='auditores'},'jefe':{'agente':'jefe','nivel':1,'resultado':'validado' if not missing else 'validado con auditores faltantes','titulo':title,'resumen':summary,'validacion':{'auditores_esperados':5,'auditores_recibidos':len(expected-set(missing)),'faltantes':missing,'integridad':not missing},'cambios':changes,'correlaciones':correlations,'alertas_inmediatas':alerts,'recuperaciones':recoveries,'hallazgos':findings,'tendencias':sorted([{'hallazgo':k,'apariciones':v} for k,v in trend.items()],key=lambda x:-x['apariciones'])[:20] if roundtype=='semanal' else [],'muestras_tendencias':len(history) if roundtype=='semanal' else None,'recomendaciones':['Revisar los hallazgos con evidencia antes de corregir.','Conectar cuentas de prueba, analítica y lector autorizado de Discord.'],'entrega':'Panel de la sala mediante GitHub Checks; sin commits ni despliegues desde agentes.','politica_alertas':'Solo críticos confirmados y recuperación verificada; los demás se incluyen en resúmenes.'},'incidencias':states,'cadencia_minutos':60,'horarios':CONFIG['horarios'],'canal':'panel de la sala','trafico_real':None,'ia_automatica':False,'costos_ia':0,'cobertura_completa':False,'faltantes':CONFIG['pendientes'],'jerarquia':CONFIG['puestos']}
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('mode',choices=['plan','auditor','gerente','jefe']);parser.add_argument('--agent');parser.add_argument('--input',default='reports');parser.add_argument('--output',default='out');a=parser.parse_args();out=Path(a.output)
 if a.mode=='plan':plan()
 elif a.mode=='auditor':
  row=monitor.audit(a.agent);row['ronda']=os.getenv('SALA_RONDA','ligera');save(out/(a.agent+'.json'),row)
 elif a.mode=='gerente':save(out/'gerente.json',consolidate(a.input))
 else:
  manager=monitor.read(Path(a.input)/'gerente.json',{});previous=[]
  try:previous=report_store.history(200 if manager.get('ronda')=='semanal' else 1)
  except Exception as e:print('Historial previo no disponible:',type(e).__name__)
  result=validate(manager,previous[0] if previous else None,previous)
  result['jefe']['historial_previo_disponible']=bool(previous)
  save(out/'reporte-jefe.json',result)
  receipt=report_store.deliver(result);save(out/'entrega.json',receipt);print(json.dumps(receipt,ensure_ascii=False))
