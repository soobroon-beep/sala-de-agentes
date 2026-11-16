import unittest,datetime as dt,json
from unittest.mock import patch
import telemetry,monitor
class Telemetry(unittest.TestCase):
 def payload(self,minutes):return {'version_telemetria':1,'solo_lectura':True,'fecha':(dt.datetime.now(dt.timezone.utc)-dt.timedelta(minutes=minutes)).isoformat(),'bots':[{'alias':'bot-prueba','errores_observados':1}],'bloqueos':[]}
 def fake(self,payload):
  def call(path):
   if path.startswith('/actions/'):return {'workflow_runs':[{'head_sha':'abc'}]}
   return {'check_runs':[{'html_url':'https://github.com/example/check','output':{'text':json.dumps(payload)}}]}
  return call
 def test_stale_reading_never_becomes_current_success(self):
  with patch.object(telemetry,'api',side_effect=self.fake(self.payload(120))):r=telemetry.collect('bots')
  self.assertEqual(r['resultado'],'no se pudo comprobar');self.assertTrue(r['bloqueos'])
 def test_received_telemetry_does_not_certify_bot_execution(self):
  with patch.object(telemetry,'api',side_effect=self.fake(self.payload(1))):r=telemetry.collect('bots')
  base={'agente':'bots','aplicacion':'Bots Vortex','funcion':'Estado privado','fecha':monitor.stamp(),'resultado':'no se pudo comprobar','resumen':'Sin certificación operativa'}
  a=next(a for a in monitor.manager([base,r])['auditores'] if a['agente']=='bots')
  self.assertEqual(a['resultado'],'no se pudo comprobar');self.assertTrue(any(f['funcion']=='Estado persistido de bot-prueba' for f in a['hallazgos']))
 def test_ignores_unverified_payload(self):
  p=self.payload(1);p['solo_lectura']=False
  with patch.object(telemetry,'api',side_effect=self.fake(p)):self.assertFalse(telemetry.collect('bots')['telemetria'])
