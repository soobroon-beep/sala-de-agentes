"""Almacén de informes: GitHub Checks + artefactos. Nunca commits, pushes ni despliegues."""
import copy,datetime as dt,json,os,urllib.request,urllib.parse
NAME='Sala · informe del Jefe'
BASE='https://api.github.com/repos/'+os.getenv('GITHUB_REPOSITORY','soobroon-beep/sala-de-agentes')
def api(method,path,body=None):
 headers={'User-Agent':'SalaInformes/4.0','Accept':'application/vnd.github+json','Content-Type':'application/json'}
 token=os.getenv('GH_REPORT_TOKEN') or os.getenv('GH_READ_TOKEN')
 if token:headers['Authorization']='Bearer '+token
 request=urllib.request.Request(BASE+path,method=method,headers=headers,data=json.dumps(body,ensure_ascii=False).encode() if body is not None else None)
 with urllib.request.urlopen(request,timeout=25) as r:return json.load(r)
def history(limit=100):
 sha=os.getenv('GITHUB_SHA','main');rows=[]
 for page in range(1,1+(limit+99)//100):
  data=api('GET','/commits/'+sha+'/check-runs?'+urllib.parse.urlencode({'check_name':NAME,'filter':'all','per_page':100,'page':page}))
  checks=data.get('check_runs',[])
  for c in checks:
   try:
    d=json.loads(c.get('output',{}).get('text') or '{}')
    if d.get('version')==4:rows.append(d)
   except (json.JSONDecodeError,TypeError):pass
  if len(checks)<100:break
 rows.sort(key=lambda x:x.get('generado',''),reverse=True);return rows[:limit]
def compact(report):
 d=copy.deepcopy(report)
 for a in d.get('auditores',[]):
  for p in a.get('componentes',{}).get('interfaz',{}).get('paginas',[]):
   p['controles_inventariados']=len(p.pop('inventario',[]));p['recorridos']=p.get('recorridos',[])[:20];p['red_fallida']=p.get('red_fallida',[])[:12]
  code=a.get('componentes',{}).get('codigo',{});code.pop('detalle',None)
 text=json.dumps(d,ensure_ascii=False,separators=(',',':'))
 if len(text)>60000:
  for a in d.get('auditores',[]):
   for p in a.get('componentes',{}).get('interfaz',{}).get('paginas',[]):p.pop('recorridos',None)
  text=json.dumps(d,ensure_ascii=False,separators=(',',':'))
 if len(text)>64000:raise ValueError('Informe demasiado grande; se conserva en artefactos, no se trunca silenciosamente.')
 return d,text
def deliver(report):
 d,text=compact(report);lines=['# Informe del Jefe',report['jefe']['resumen'],'','| Aplicación | Estado |','|---|---|']
 for p in report.get('puntos',[]):lines.append('| '+p['aplicacion']+' | '+p['estado']+' |')
 lines.extend(['','Ronda: '+report['ronda']+' · '+report['generado'],'','Cadena: Auditores → Gerente → Jefe → panel.','Los robots son ilustrativos; no hay modelos de IA conectados ni datos privados publicados.'])
 summary='\n'.join(lines)
 body={'name':NAME,'head_sha':os.environ['GITHUB_SHA'],'status':'completed','conclusion':'failure' if report['jefe'].get('alertas_inmediatas') else 'neutral','completed_at':dt.datetime.now(dt.timezone.utc).isoformat(),'details_url':report['url_ejecucion'],'output':{'title':report['jefe']['titulo'],'summary':summary,'text':text}}
 result=api('POST','/check-runs',body)
 summary_path=os.getenv('GITHUB_STEP_SUMMARY')
 if summary_path:
  with open(summary_path,'a') as f:f.write(summary)
 return {'id':result['id'],'url':result['html_url'],'destino':'GitHub Checks, leído por el panel','fecha':dt.datetime.now(dt.timezone.utc).isoformat()}
