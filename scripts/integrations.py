"""Metadatos de workflows públicos. No lee Firestore ni publica mensajes de Discord."""
import datetime as dt,json,urllib.request,urllib.error,os
from pathlib import Path
BASE='https://api.github.com/repos/soobroon-beep/'
CONFIG={
'vortex':[('Vortex-By-Nova-Nexus','brain-sync.yml',150),('Vortex-By-Nova-Nexus','motor.yml',360)],
'apps':[('Nova-HUB','brain-sync.yml',150),('Nova-HUB','backup-firestore.yml',1800)],
'neural':[('Vortex-By-Nova-Nexus','brain-sync.yml',150),('Nova-HUB','brain-sync.yml',150),('Vortex-By-Nova-Nexus','brain-learn.yml',1800)],
'bots':[('Vortex-By-Nova-Nexus','motor.yml',360),('Vortex-By-Nova-Nexus','bots-status.yml',120)],
'discord':[('Vortex-By-Nova-Nexus','discord-screener.yml',600)]}
def check(agent):
 rows=[]
 for repo,flow,limit in CONFIG[agent]:
  url=BASE+repo+'/actions/workflows/'+flow+'/runs?per_page=10'
  try:
   headers={'User-Agent':'SalaAuditoria/3.0','Accept':'application/vnd.github+json'}
   if os.getenv('GH_READ_TOKEN'):headers['Authorization']='Bearer '+os.environ['GH_READ_TOKEN']
   req=urllib.request.Request(url,headers=headers)
   with urllib.request.urlopen(req,timeout=15) as r:data=json.load(r)
   runs=data.get('workflow_runs') or []
   run=runs[0] if runs else None
   if flow=='motor.yml':run=next((x for x in runs if x.get('status')=='in_progress'),run)
   if not run:rows.append({'flujo':flow,'repositorio':repo,'resultado':'no se pudo comprobar','motivo':'No hay ejecuciones.'});continue
   age=(dt.datetime.now(dt.timezone.utc)-dt.datetime.fromisoformat(run['created_at'].replace('Z','+00:00'))).total_seconds()/60
   state='falló' if run['conclusion'] in ['failure','timed_out','action_required'] else 'no se pudo comprobar' if age>limit else 'funciona' if run['conclusion']=='success' or run['status']=='in_progress' else 'no se pudo comprobar'
   rows.append({'flujo':flow,'repositorio':repo,'resultado':state,'estado_github':run['status'],'conclusion':run['conclusion'],'fecha':run['created_at'],'minutos_desde_inicio':round(age),'umbral_minutos':limit,'url':run['html_url'],'cobertura':'Estado de ejecución; no certifica llegada de cada documento ni la calidad del aprendizaje.'})
  except Exception as e:rows.append({'flujo':flow,'repositorio':repo,'resultado':'no se pudo comprobar','motivo':('HTTP '+str(e.code)+'; revisar acceso o cuota de la API' if isinstance(e,urllib.error.HTTPError) else type(e).__name__)})
 return {'agente':agent,'fecha':dt.datetime.now(dt.timezone.utc).isoformat(),'flujos':rows,'bloqueos':['Sin fuente de analítica de visitantes conectada.','Sin acceso de lectura al estado privado actual de cada cerebro, bot y sesión.']}
if __name__=='__main__':
 import sys
 agent=sys.argv[1];out=Path(sys.argv[2] if len(sys.argv)>2 else 'out');out.mkdir(exist_ok=True,parents=True);data=check(agent);(out/(agent+'-integrations.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2));print(agent,[(f['flujo'],f['resultado']) for f in data['flujos']])
