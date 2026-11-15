"""Un aviso de GitHub agrupado; solo metadatos públicos del monitor, nunca mensajes ni credenciales."""
import json,os,hashlib,urllib.request,urllib.error
from pathlib import Path
root=Path(__file__).resolve().parents[1];latest=json.loads((root/'data/latest.json').read_text());token=os.getenv('GH_TOKEN');repo=os.getenv('GITHUB_REPOSITORY','soobroon-beep/sala-de-agentes');marker='[Sala de agentes · alertas]'
alerts=[]
for r in latest['auditores']:
 for f in r.get('hallazgos',[]):alerts.append({'aplicacion':f['aplicacion'],'funcion':f['funcion'],'gravedad':f['gravedad'],'estado':f['estado']})
if not token:print('Notificaciones bloqueadas: sin credencial del repositorio.');raise SystemExit(0)
def call(method,suffix,body=None):
 req=urllib.request.Request('https://api.github.com/repos/'+repo+suffix,method=method,data=json.dumps(body).encode() if body else None,headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','Content-Type':'application/json','User-Agent':'SalaAuditoria/3.0'})
 with urllib.request.urlopen(req,timeout=20) as r:return json.load(r)
alerts=sorted({(a['aplicacion'],a['funcion'],a['estado']):a for a in alerts}.values(),key=lambda a:(a['aplicacion'],a['funcion']))
fingerprint=hashlib.sha256(json.dumps(alerts,sort_keys=True).encode()).hexdigest()
issues=call('GET','/issues?state=all&per_page=100');issue=next((x for x in issues if x.get('title')==marker),None)
if not alerts and not issue:print('Sin incidencias que notificar.');raise SystemExit(0)
body='Reporte del Gerente para ti, como Jefe.\n\n'+latest['jefe']['resumen']+'\n\n'
body+='\n'.join('- '+a['aplicacion']+' · '+a['funcion']+' · '+a['gravedad']+' · '+a['estado'] for a in alerts) if alerts else 'Recuperación: los hallazgos anteriores ya no aparecen en las pruebas disponibles. Revisa las incidencias antes de considerarlas resueltas.'
body+='\n\nPanel: https://soobroon-beep.github.io/sala-de-agentes/\nEjecución: '+str(latest.get('url_ejecucion'))+'\n\nLa recepción de notificaciones depende de tus preferencias de GitHub. No se publican datos privados de los proyectos.\n\n<!-- estado:'+fingerprint+' -->'
if issue:
 if '<!-- estado:'+fingerprint+' -->' in (issue.get('body') or ''):print('Aviso idéntico agrupado; sin repetir.');raise SystemExit(0)
 call('POST','/issues/'+str(issue['number'])+'/comments',{'body':body});call('PATCH','/issues/'+str(issue['number']),{'body':body,'state':'open' if alerts else 'closed'})
else:call('POST','/issues',{'title':marker,'body':body,'assignees':[repo.split('/')[0]]})
print('Aviso registrado en GitHub para el propietario.')
