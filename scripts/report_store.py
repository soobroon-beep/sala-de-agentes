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
 # El panel recibe un índice explícito; los artefactos conservan el informe íntegro.
 def brief(value,depth=0):
  if isinstance(value,str):return value if len(value)<=400 else value[:400]+'… [detalle en artefactos]'
  if isinstance(value,list):return [brief(x,depth+1) for x in value[:6]]+([{'detalle_en_artefactos':True,'elementos_adicionales':len(value)-6}] if len(value)>6 else [])
  if isinstance(value,dict):
   if depth>=5:return {'detalle_en_artefactos':True}
   return {k:brief(v,depth+1) for k,v in value.items() if k not in ('inventario','detalle')}
  return value
 d=copy.deepcopy(report)
 d['evidencia_completa']={'ubicacion':report.get('url_ejecucion'),'seccion':'Artifacts / informe-jefe-y-recibo y auditor-*','panel':'Resumen acotado; consultar artefactos para evidencias y recorridos íntegros.'}
 for a in d.get('auditores',[]):
  components=a.pop('componentes',{})
  a['componentes']={k:{'resultado':v.get('resultado'),'resumen':v.get('resumen'),'detalle_en_artefactos':True} for k,v in components.items()}
  a['hallazgos']=brief(a.get('hallazgos',[]));a['evidencia']=brief(a.get('evidencia',{}))
 for section in ('gerente','jefe'):
  for key in ('hallazgos_consolidados','hallazgos','correlaciones'):
   if key in d.get(section,{}):d[section][key]=brief(d[section][key])
 text=json.dumps(d,ensure_ascii=False,separators=(',',':'))
 if len(text.encode('utf-8'))>60000:
  d['auditores']=[{k:a[k] for k in ('agente','aplicacion','resultado','fecha','resumen','componentes') if k in a} for a in d['auditores']]
  for section in ('gerente','jefe'):
   for key in ('hallazgos_consolidados','hallazgos','correlaciones'):
    if key in d.get(section,{}):d[section][key]=[{'detalle_en_artefactos':True}]
  text=json.dumps(d,ensure_ascii=False,separators=(',',':'))
 if len(text.encode('utf-8'))>64000:raise ValueError('Índice demasiado grande; informe completo conservado en artefactos.')
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
