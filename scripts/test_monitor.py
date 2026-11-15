import unittest
from unittest.mock import patch
import monitor
class Monitoring(unittest.TestCase):
 def test_seven_role_chain_and_blockers(self):
  with patch.object(monitor,'audit',side_effect=lambda a:{'agente':a,'aplicacion':a,'fecha':monitor.stamp(),'resultado':'no se pudo comprobar','resumen':'Sin acceso'}):
   m=monitor.manager([monitor.audit(a) for a in monitor.TARGETS]);j=monitor.chief(m)
  self.assertEqual(len(j['auditores']),5);self.assertEqual(j['gerente']['agente'],'gerente');self.assertEqual(j['jefe']['agente'],'jefe');self.assertFalse(j['operacion_completa_24_7'])
 def test_missing_auditor_visible(self):
  m=monitor.manager([]);self.assertEqual(len(m['auditores']),5);self.assertTrue(all(r['resultado']=='no se pudo comprobar' for r in m['auditores']))
 def test_incident_confirmation_and_recovery(self):
  prev={}
  for result,state in [('falló','investigando'),('falló','confirmado'),('no se pudo comprobar','confirmado'),('funciona','investigando'),('funciona','verificado')]:
   m=monitor.manager([{'agente':'vortex','aplicacion':'Vortex','resultado':result}]);prev=monitor.chief(m,prev);self.assertEqual(prev['incidencias']['vortex']['estado'],state)
 def test_private_integrations_stay_blocked(self):
  self.assertEqual(monitor.audit('discord')['resultado'],'no se pudo comprobar');self.assertEqual(monitor.audit('bots')['resultado'],'no se pudo comprobar')
class DeliveryReceipts(unittest.TestCase):
 def test_components_reach_manager_without_overwriting_http(self):
  rows=[]
  for a,v in monitor.TARGETS.items():
   rows.extend([{'agente':a,'aplicacion':v[0],'resultado':'funciona','funcion':'HTTP','resumen':'HTTP OK'}, {'agente':a,'resultado':'funciona','pruebas':['simulación']}, {'agente':a,'flujos':[]}, {'agente':a,'resultado':'funciona','paginas':[]}])
  manager=monitor.manager(rows)
  self.assertEqual(len(manager['recepciones']),5)
  self.assertTrue(all(r['reportes_recibidos']==4 and r['salud_recibida'] for r in manager['recepciones']))
  self.assertTrue(all(r['resultado_http']=='funciona' and len(r['componentes'])==3 for r in manager['auditores']))
  report=monitor.chief(manager)
  self.assertEqual(report['jefe']['identidad'],'Propietario humano · tú')
  self.assertEqual(report['cadencia_minutos'],60)
class NetworkCoverage(unittest.TestCase):
 def test_provider_error_is_visible_without_claiming_app_outage(self):
  m=monitor.manager([{'agente':'vortex','aplicacion':'Vortex','resultado':'funciona','funcion':'HTTP','resumen':'OK'}, {'agente':'vortex','resultado':'funciona','paginas':[{'viewport':{'width':390},'red_fallida':[{'url':'https://provider.example/data','http':403}]}]}])
  a=m['auditores'][0]
  self.assertEqual(a['resultado'],'no se pudo comprobar')
  self.assertTrue(any(f['funcion']=='APIs y solicitudes de red' for f in a['hallazgos']))
if __name__=='__main__':unittest.main()
