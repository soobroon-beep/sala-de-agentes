# Sala de agentes · Nova Nexus

Sala 3D con siete robots articulados, sombras, piso y cámara frontal, selección de agentes y reportes en español. Motor Three.js 0.170.0 incluido localmente con su licencia MIT.

## Qué funciona
- Sondeos HTTPS de las páginas públicas de Vortex, Nova Hub y Neural Brain, sin escrituras en las aplicaciones.
- Cinco trabajos auditores separados, Gerente que consolida y Jefe que prepara el reporte. Discord y bots Vortex registran su bloqueo de acceso, no resultados inventados.
- `data/latest.json`, historial de 300 revisiones, evidencias por ejecución en GitHub Actions y control de concurrencia. Dos fallos en revisiones distintas confirman una incidencia HTTP y dos éxitos verifican recuperación.
- GitHub Actions solicita una revisión cada cinco minutos. GitHub puede retrasar o suspender programaciones; no es un servicio con garantía de tiempo real.
- El panel consulta el último reporte cada minuto mientras está abierto y señala registros atrasados. La animación es ilustrativa y nunca genera métricas.

## Lo pendiente
No hay siete modelos de IA conectados: los siete roles ejecutan reglas deterministas. No se comprueban aún botones, sesiones, recorridos de navegador, resultados de IA, tráfico real ni bots individuales. Discord no tiene conector de lectura privada. No hay notificaciones externas ni informes diario/semanal entregados. Tampoco monitor externo del propio sistema. Por eso no se declara activo el monitoreo completo 24/7.

## Publicación
El workflow `.github/workflows/supervision.yml` revisa las aplicaciones y publica `dist/` en GitHub Pages. La opción Pages del repositorio debe estar configurada en **GitHub Actions**. No se guardan tokens ni datos privados en este repositorio. Solo se publican respuestas de sondeos de URLs públicas; no se almacenan cuerpos de páginas.

## Desarrollo local
Python 3.12 o posterior. Para recopilar evidencias locales: `python3 scripts/monitor.py local`. Para preparar el sitio: `python3 scripts/package_site.py`. Servir `dist/` con un servidor HTTP local; los módulos JavaScript no se abren directamente con file://.

## Accesibilidad y movimiento
Controles de teclado para elegir los siete agentes, pausar, restaurar cámara y recorrer la cadena. La preferencia de movimiento reducido pausa la animación inicialmente. La cámara permanece por encima del piso y del lado frontal; no invierte los personajes.

## Seguridad y cobertura
Pruebas GET de lectura con User-Agent `SalaAuditoria/2.0` y cabecera `X-Synthetic-Monitor: sala-de-agentes`. Estas señales deben excluirse explícitamente en la fuente de analítica antes de afirmar separación de tráfico. No hay órdenes financieras, cambios de roles, mensajes a miembros ni modificaciones de producción. Presupuesto de IA: 0, al no haber modelos conectados. Costos de alojamiento y acciones: no medidos por este panel.
