import json,tempfile,unittest,os
from pathlib import Path
from unittest.mock import patch
import monitor,pipeline,report_store
class Pipeline(unittest.TestCase):
 def rows(self):return [{'agente':a,'aplicacion':v[0],'funcion':'HTTP','resultado':'funciona','fecha':monitor.stamp(),'resumen':'GET comprobado','evidencia':{'http':200,'intentos':1}} for a,v in monitor.TARGETS.items()]
 def manager(self,rows):return monitor.manager(rows)|{'ronda':'completa'}
 def test_exactly_five_auditors_and_two_levels(self):
  self.assertEqual(set(monitor.TARGETS),{'vortex','bots','neural','apps','discord'})
  result=pipeline.validate(self.manager(self.rows()))
  self.assertEqual(result['jefe']['validacion']['auditores_recibidos'],5)
  self.assertFalse(result['operacion_completa_24_7']);self.assertEqual(len(result['jerarquia']),7)
 def test_missing_auditor_cannot_be_certified(self):
  result=pipeline.validate(self.manager([r for r in self.rows() if r['agente']!='discord']))
  self.assertIn('discord',result['jefe']['validacion']['faltantes'])
  self.assertEqual(next(p['estado'] for p in result['puntos'] if p['auditor']=='discord'),'NO SE PUDO COMPROBAR')
 def test_apps_checks_four_distinct_projects(self):
  def probe(a,t):return {'agente':a,'aplicacion':t[0],'resultado':'funciona','fecha':monitor.stamp()}
  with patch.object(monitor,'_audit_target',side_effect=probe):r=monitor.audit('apps')
  self.assertEqual([x['aplicacion'] for x in r['objetivos']],['Nova HUB','INKBOT PRO','INKBOT VIDEO','Moldes Gabys'])
 def test_only_confirmed_critical_and_verified_recovery_alert(self):
  rows=self.rows();rows[0].update(resultado='falló',evidencia={'http':503,'intentos':1})
  r=pipeline.validate(self.manager(rows));self.assertFalse(r['jefe']['alertas_inmediatas'])
  rows[0]['evidencia'].update(intentos=2,respuestas_http=[503,503]);r=pipeline.validate(self.manager(rows));self.assertEqual(len(r['jefe']['alertas_inmediatas']),1)
  rows[0]['resultado']='no se pudo comprobar';r2=pipeline.validate(self.manager(rows),r);self.assertFalse(r2['jefe']['recuperaciones'])
  rows[0]['resultado']='funciona';r3=pipeline.validate(self.manager(rows),r2);self.assertFalse(r3['jefe']['recuperaciones'])
  r4=pipeline.validate(self.manager(rows),r3);self.assertEqual(len(r4['jefe']['recuperaciones']),1)
 def test_medium_findings_do_not_alert(self):
  r=pipeline.validate(self.manager(self.rows()));self.assertFalse(r['jefe']['alertas_inmediatas'])
 def test_light_and_complete_schedule(self):
  cases=[('17 * * * *','ligera'),('0 3,15 * * *','completa'),('0 15 * * 1','semanal')]
  for cron,expected in cases:
   with patch.dict(os.environ,{'GITHUB_EVENT_NAME':'schedule','SALA_CRON':cron}):self.assertEqual(pipeline.plan(),expected)
 def test_report_copy_does_not_leak_inventory_or_modify_original(self):
  r=pipeline.validate(self.manager(self.rows()));r['auditores'][0]['componentes']={'interfaz':{'paginas':[{'inventario':[{'etiqueta':'control'}],'recorridos':[]}]}}
  compact,text=report_store.compact(r)
  self.assertTrue(compact['auditores'][0]['componentes']['interfaz']['detalle_en_artefactos']);self.assertIn('inventario',r['auditores'][0]['componentes']['interfaz']['paginas'][0]);self.assertLess(len(text),64000)
 def test_large_evidence_keeps_valid_delivery_and_receipts(self):
  r=pipeline.validate(self.manager(self.rows()))
  for a in r['auditores']:
   a['componentes']={'interfaz':{'resultado':'falló','paginas':[{'inventario':['x'*20000]*30}]}}
   a['hallazgos']=[{'observado':'á'*30000,'estado':'investigando'}]*25
  r['jefe']['hallazgos']=r['auditores'][0]['hallazgos']
  d,text=report_store.compact(r)
  self.assertLess(len(text.encode()),64000);self.assertEqual(d['jefe']['validacion']['auditores_recibidos'],5)
  self.assertIn('evidencia_completa',d);self.assertEqual(r['auditores'][0]['hallazgos'][0]['observado'],'á'*30000)
 def test_report_schedules_have_no_repository_or_deploy_write(self):
  workflow=(pipeline.ROOT/'.github/workflows/supervision.yml').read_text()
  self.assertNotIn('contents: write',workflow);self.assertNotIn('pages: write',workflow);self.assertNotIn('git push',workflow);self.assertNotIn('deploy-pages',workflow);self.assertNotIn('issues: write',workflow)
 def test_synthetic_end_to_end_format_is_not_a_live_claim(self):
  with tempfile.TemporaryDirectory() as td:
   for r in self.rows():Path(td,r['agente']+'.json').write_text(json.dumps(r))
   manager=pipeline.consolidate(td);chief=pipeline.validate(manager)
  self.assertEqual(len(manager['recepciones']),5);self.assertEqual(chief['jefe']['validacion']['faltantes'],[]);self.assertFalse(chief['operacion_completa_24_7'])
if __name__=='__main__':unittest.main()

class Continuity(unittest.TestCase):
 def test_history_survives_new_commit(self):
  report={'version':4,'ejecucion':'old-run','generado':'2026-11-15T10:00:00-06:00'}
  def fake(method,path,body=None):
   if path.startswith('/actions/runs'):return {'workflow_runs':[{'path':'.github/workflows/supervision.yml','head_sha':'old'}]}
   return {'check_runs':[] if '/new/' in path else [{'output':{'text':json.dumps(report)}}]}
  with patch.dict(os.environ,{'GITHUB_SHA':'new'}),patch.object(report_store,'api',side_effect=fake):self.assertEqual(report_store.history(1),[report])
 def test_one_app_failure_does_not_mark_others_failed(self):
  app={'agente':'apps','aplicacion':'Apps','fecha':monitor.stamp(),'resultado':'funciona','funcion':'HTTP','objetivos':[{'aplicacion':n,'url':'https://example.org/'+n,'resultado':'funciona'} for n in ['Nova','Ink']]}
  ui={'agente':'apps','resultado':'falló','paginas':[{'aplicacion':'Nova','url':'https://example.org/Nova','resultado':'falló','errores_js':['Error de prueba'],'viewport':{'width':390}}]}
  m=monitor.manager([app,ui]);points=pipeline.points(m)
  self.assertEqual(next(p for p in points if p['aplicacion']=='Nova')['estado'],'FALLÓ')
  self.assertEqual(next(p for p in points if p['aplicacion']=='Ink')['estado'],'FUNCIONA')
  finding=next(a for a in m['auditores'] if a['agente']=='apps')['hallazgos'][0]
  self.assertEqual(finding['aplicacion'],'Nova');self.assertTrue(finding['fecha']);self.assertTrue(finding['pasos']);self.assertTrue(finding['evidencia'])
 def test_scheduled_proof_requires_complete_receipts(self):
  m=monitor.manager([])|{'ronda':'ligera'}
  bad={'origen':'schedule','jefe':{'validacion':{'integridad':False}}}
  good={'origen':'schedule','jefe':{'validacion':{'integridad':True}}}
  self.assertFalse(pipeline.validate(m,history=[bad])['prueba_programada']['comprobada'])
  self.assertTrue(pipeline.validate(m,history=[good])['prueba_programada']['comprobada'])

class ConfirmedOutage(unittest.TestCase):
 def test_one_http_error_after_timeout_is_not_confirmed_outage(self):
  row={'agente':'vortex','aplicacion':'Vortex','fecha':monitor.stamp(),'funcion':'HTTP','resultado':'falló','evidencia':{'http':503,'intentos':2,'respuestas_http':[503]}}
  r=pipeline.validate(monitor.manager([row])|{'ronda':'ligera'})
  self.assertFalse(r['jefe']['alertas_inmediatas'])
