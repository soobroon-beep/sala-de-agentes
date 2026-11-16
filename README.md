# Sala de agentes · Nova Nexus

La sala existente conserva su escena 3D y siete puestos, reorganizados en tres niveles:
1. Jefe: valida evidencia, correlaciona aplicaciones y entrega al propietario.
2. Gerente: consolida, deduplica y verifica la llegada de cinco auditorías.
3. Auditores: Vortex, Bots de Vortex, Neural Brain, Apps y Discord.

El Auditor de Apps cubre Nova HUB, INKBOT PRO, INKBOT VIDEO y Moldes Gabys. NovaQ no se incorpora ni se trata como alias de Nova HUB sin confirmar su URL y alcance.

## Horarios — America/Mexico_City
- Ligera: cada hora, minuto 17. Salud HTTP y metadatos de procesos disponibles.
- Completa: 09:00 y 21:00. Añade navegador anónimo en escritorio/móvil y pruebas de código aisladas.
- Semanal: lunes 09:00. Revisión ligera y tendencias del historial realmente disponible; muestra cuántas muestras se utilizaron.
- Discord: pendiente el lector autorizado por eventos. No se consume un bucle frecuente sin conexión ni se simula lectura de mensajes.

GitHub Actions puede retrasar ejecuciones. No se declara el alcance completo activo 24/7 hasta verificar ronda programada, entrega y fuentes privadas necesarias.

## Permisos y entrega
Los auditores y el Gerente solo tienen lectura del repositorio. El Jefe tiene `checks: write` únicamente para registrar informes en GitHub Checks. Ningún trabajo de auditoría tiene `contents: write`, `pages: write` ni permisos de moderación. No se ejecutan commits, pushes, compras, órdenes financieras, cambios de estrategia ni despliegues desde los auditores.

Los reportes completos se conservan como artefactos de Actions durante 90 días. El resumen con evidencia pública se registra en el check «Sala · informe del Jefe». El panel lee esa API pública sin credenciales. No necesita un despliegue para actualizar los informes. Los archivos antiguos de data/ se conservan como historial anterior; no se usan como fuente en vivo.

El workflow `publicar-panel.yml` es independiente, solo manual y para una solicitud expresa del propietario. El workflow de auditoría no lo puede disparar. Publicar una modificación autorizada de la sala no concede a sus agentes permiso de publicar cambios en las aplicaciones.

## Honestidad y límites
Cada punto lleva FUNCIONA / FALLÓ / NO SE PUDO COMPROBAR y su alcance. Un HTTP 200 no prueba botones, IA ni persistencia. Los controles no ejercitados permanecen identificados como no comprobados; no se fuerzan acciones de guardar, borrar, comprar o autenticar.

Las pruebas de sincronización, respaldo, stop loss, take profit y riesgo son simulaciones aisladas. No certifican la ejecución de cada sesión privada ni de órdenes en exchanges. No hay modelo de IA conectado ni entrenamiento automático de esta sala: las responsabilidades se implementan con reglas deterministas, presupuesto de modelos 0.

Pendientes: cuentas/entornos de prueba, telemetría privada por cerebro y bot, fuente de analítica real, conector de Discord y confirmación de NovaQ. No se publican mensajes, correos, montos ni credenciales. Para consultar evidencias privadas hará falta un canal con control de acceso.

Solo dos respuestas HTTP 5xx en intentos separados pueden generar un crítico de disponibilidad. Los errores de autenticación, cuotas, transporte y proveedores se distinguen de una caída confirmada. La recuperación requiere dos rondas consecutivas correctas. Los hallazgos medios o pendientes aparecen en los resúmenes, no generan issues repetidos.

## Validación
`python3 -m unittest discover -s scripts -p 'test_*.py' -v`
`python3 scripts/package_site.py`

Abrir el sitio con un servidor HTTP; no con file://. Three.js está incluido con licencia MIT. Se respeta movimiento reducido y hay una vista compatible sin WebGL.

## Continuidad y lectura del panel
El historial busca informes en los commits de las últimas 100 ejecuciones (hasta 12 commits y 200 muestras en tendencias); no se borra al actualizar el código. El informe indica cuántas muestras estuvieron disponibles. Las incidencias críticas conservan su estado entre rondas. La confirmación de una caída exige dos respuestas HTTP 5xx reales; un timeout seguido de un 5xx no basta.

El panel muestra próxima revisión prevista, trabajos en ejecución o en cola, fallo del último proceso y enlaces a los artefactos. El estado por aplicación combina solo pruebas correspondientes a su URL y distingue disponibilidad de funciones privadas. Un hallazgo confirmado de consola no implica que toda la aplicación esté caída. No se corrigen automáticamente los proyectos supervisados.

## Pisos de la sala
Planta baja: los siete puestos actuales de supervisión. Segundo piso: espacio arquitectónico vacío, reservado para futuros sistemas con funciones distintas. El selector cambia el grupo visible y la altura de cámara en la escena 3D. No crea agentes ni tareas ni concede herramientas o permisos. La vista de reportes mantiene los datos del equipo existente.

La escena de oficina incluye ventanales con ciudad geométrica, tráfico decorativo, luminarias, robots más separados, gestos de escritura, saludo y recorridos cortos con tabletas. Los paquetes ilustran la jerarquía; las animaciones no indican que una auditoría esté ejecutándose. Se conserva la pausa, el movimiento reducido y el segundo piso sin agentes.

## Interfaz y calidad visual
Interfaz compacta en azul profundo, fondos y tarjetas con mayor contraste, controles de ambiente atardecer/noche y ritmo activo/suave. La ciudad se dibuja una vez en alta resolución y se reutiliza como fondo; evita miles de polígonos en el modo compatible. WebGL usa materiales con capa de acabado, bordes suaves, sombras filtradas y mayor resolución. Las animaciones respetan pausa y movimiento reducido.

## Distribución y documentos de colores
Los cinco auditores rodean al Gerente, situado al centro. Cada auditor conserva un color propio en su robot, sus documentos y la bandeja de archivo correspondiente. Los archivos recorren la ruta al Gerente y después entran en las bandejas; el Gerente remite un consolidado al Jefe, que tiene un despacho separado al fondo. Todo ese archivado es ilustrativo, no crea archivos ni modifica los reportes persistentes. No se muestran contadores inventados.

## Recorrido entre pisos y explicación gráfica
El cambio de piso recorre tres tramos con aceleración y frenado suaves: salida del ventanal, vista exterior del edificio con ascenso/descenso y entrada al nivel de destino. Incluye indicador de fase, botón para omitir y cambio inmediato cuando se prefiere movimiento reducido. La pausa de robots no impide navegar.

El panel «Esquema visual» explica cuatro pasos de cada responsabilidad mediante iconos y conexiones de colores. Está etiquetado como esquema, no como telemetría. Debajo muestra el resultado y la fecha del informe real disponible; nunca grafica aprendizajes ni cantidades inventadas. El segundo piso permanece vacío.


### Telemetría y vigilancia del monitor

El recolector `sala-telemetry.yml` de Vortex consulta Firestore por lectura con su conexión existente; no ejecuta motores, conectores de escritura, aprendizaje ni órdenes. Publica un índice sanitizado en GitHub Checks: alias HMAC de bots/cerebros, estados, fechas y conteos; nunca montos, correos, textos privados ni credenciales. La sala lo lee en cada ronda con `scripts/telemetry.py`. Muestras mayores a 90 minutos quedan sin comprobar. Una lectura recibida no certifica que un bot opere correctamente ni que un aprendizaje mejore su calidad. Los cambios de fecha se comparan con la muestra previa.

La revisión ligera se volvió a registrar al minuto 23 de cada hora; GitHub puede retrasarla u omitirla. El panel separa la antigüedad del informe de la salud de las apps. Se configuró un vigilante horario independiente en ChatGPT para avisos por falta de entrega de más de 90 minutos; su primera ejecución debe verificarse por separado. La causa exacta de huecos del cron no está demostrada. Las entregas manuales no se presentan como prueba de puntualidad del cron.
