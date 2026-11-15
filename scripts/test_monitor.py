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
if __name__=='__main__':unittest.main()
