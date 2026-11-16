"""Consume exclusivamente el índice sanitizado del recolector; nunca credenciales Firebase."""
import datetime as dt,json,os,urllib.request,urllib.parse
BASE='https://api.github.com/repos/soobroon-beep/Vortex-By-Nova-Nexus'
def api(path):
 headers={'Accept':'application/vnd.github+json','User-Agent':'SalaTelemetria/1.0'}
 if os.getenv('GH_READ_TOKEN'):headers['Authorization']='Bearer '+os.environ['GH_READ_TOKEN']
 with urllib.request.urlopen(urllib.request.Request(BASE+path,headers=headers),timeout=20) as r:return json.load(r)
def collect(agent):
 row={'agente':agent,'fecha':dt.datetime.now(dt.timezone.utc).isoformat(),'telemetria':{},'resultado':'no se pudo comprobar','resumen':'Sin lectura de telemetría disponible.'}
 try:
  runs=api('/actions/workflows/sala-telemetry.yml/runs?per_page=5').get('workflow_runs',[])
  snapshots=[]
  for sha in dict.fromkeys(r['head_sha'] for r in runs):
   q=urllib.parse.urlencode({'check_name':'Sala · telemetría de solo lectura','filter':'all','per_page':50})
   for c in api('/commits/'+sha+'/check-runs?'+q).get('check_runs',[]):
    try:
     t=json.loads(c.get('output',{}).get('text') or '{}')
     if t.get('version_telemetria')==1 and t.get('solo_lectura') is True:snapshots.append((t,c['html_url']))
    except (ValueError,KeyError):pass
  if not snapshots:return row
  t,url=max(snapshots,key=lambda x:x[0]['fecha']);age=max(0,(dt.datetime.now(dt.timezone.utc)-dt.datetime.fromisoformat(t['fecha'].replace('Z','+00:00'))).total_seconds()/60)
  fields=['bots','motor'] if agent=='bots' else ['cerebros','conexiones']
  row['telemetria']={k:t.get(k) for k in fields};row.update(fuente=url,fecha_fuente=t['fecha'],antiguedad_minutos=round(age),bloqueos=t.get('bloqueos',[]),cobertura_completa=False)
  records=t.get('bots' if agent=='bots' else 'cerebros',[])
  row['resultado']='funciona' if age<=90 and records and not t.get('bloqueos') else 'no se pudo comprobar'
  row['resumen']=f'{len(records)} registros observados; muestra de hace {round(age)} minutos. Solo estado persistido; no certifica órdenes reales ni calidad del aprendizaje.'
  if age>90:row['bloqueos'].append('Telemetría atrasada: no describe necesariamente el estado actual.')
 except Exception as e:row['resumen']='No se pudo consultar el índice de telemetría: '+type(e).__name__
 return row
if __name__=='__main__':
 import sys
 from pathlib import Path
 agent=sys.argv[1];p=Path(sys.argv[2]);p.mkdir(exist_ok=True,parents=True);r=collect(agent);(p/(agent+'-telemetry.json')).write_text(json.dumps(r,ensure_ascii=False,indent=2));print(agent,r['resultado'],r['resumen'])
