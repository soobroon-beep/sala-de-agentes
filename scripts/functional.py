"""Pruebas de código de proyectos públicos en entorno aislado sin credenciales."""
import argparse,datetime as dt,json,re,subprocess
from pathlib import Path
TESTS={
'vortex':('Vortex-By-Nova-Nexus',['tests/ai.test.js','tests/indicators.test.js','tests/news.test.js','tests/brain-sync.test.js']),
'apps':('Nova-HUB',['tests/sync.test.js','tests/backup.test.js','tests/brain-sync.test.js','tests/briefing.test.js']),
'neural':('Neural-Brain-Claude',['tests/brain-learn.test.js']),
'bots':('Vortex-By-Nova-Nexus',['tests/botlab.test.js','tests/botlab-paper.test.js','tests/botlab-risk.test.js','tests/botlab-retrain.test.js','tests/botlab-brain.test.js','tests/botlab-coach.test.js'])}
def run(agent,out):
 p=Path(out);p.mkdir(exist_ok=True,parents=True);row={'agente':agent,'fecha':dt.datetime.now(dt.timezone.utc).isoformat(),'entorno':'Código público clonado; simulación sin credenciales ni órdenes','resultado':'no se pudo comprobar'}
 if agent not in TESTS:row['bloqueo']='Sin suite autorizada de Discord ni conector privado.'
 else:
  repo,tests=TESTS[agent];dest=Path('sources')/agent;dest.parent.mkdir(exist_ok=True)
  try:
   c=subprocess.run(['git','clone','--quiet','--depth','1','https://github.com/soobroon-beep/'+repo+'.git',str(dest)],capture_output=True,text=True,timeout=90)
   if c.returncode:raise RuntimeError('No se pudo clonar el repositorio público.')
   row.update(repositorio=repo,commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=dest,text=True).strip(),pruebas=tests)
   done=subprocess.run(['node','--test',*tests],cwd=dest,capture_output=True,text=True,timeout=150);text=done.stdout+done.stderr
   row.update(resultado='funciona' if done.returncode==0 else 'falló',salida=done.returncode,resumen='Pruebas de código satisfactorias; no certifican datos ni sesiones de producción.' if done.returncode==0 else 'La suite de código detectó una prueba fallida; revisar el detalle.',evidencia=[line for line in text.splitlines() if re.search(r'(?i)(pass |fail |tests |pruebas pasaron|error:|not ok|✖)',line)][-15:])
   if done.returncode:row['detalle']=re.sub(r'[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}','[oculto]',text[-3000:],flags=re.I)
  except Exception as e:row['bloqueo']=type(e).__name__+': '+str(e)[:200]
 (p/(agent+'-functional.json')).write_text(json.dumps(row,ensure_ascii=False,indent=2));print(agent,row['resultado'])
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('agent');p.add_argument('--output',default='out');a=p.parse_args();run(a.agent,a.output)
