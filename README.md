# MantoFlota

App web instalable (PWA) para el control de mantenimiento de flota: maquinaria pesada, volquetes, camionetas, minibuses, cisternas de agua y combustible, generadores y luminarias.

## Módulos
- **Inicio:** indicadores, flota por tipo, backlogs por criticidad y lista de lo que requiere atención.
- **Backlogs:** fallas y trabajos pendientes (Pendiente → En proceso → Por validar → Completado).
- **Preventivos y Engrase:** planes por uso (km u horas) y/o por días, con semáforo Al día / Por vencer / Vencido.
- **Neumáticos:** stock, montados, recapado, descartados y profundidad de labrado.
- **Equipos:** inventario, ficha de detalle, importación CSV. Los vehículos usan km; generadores, luminarias y maquinaria usan horas.
- **Reportes:** vista imprimible / PDF y exportación CSV (Excel).
- **Supervisor:** valida lo que registran los operarios.
- **Admin:** usuarios y roles, respaldo/restauración JSON, datos de ejemplo.

## Cómo usarla
Abre `index.html` desde cualquier servidor estático (por ejemplo `python3 -m http.server` y entra a `http://localhost:8000`), o publícala en GitHub Pages.

## Datos
Modo local: todo se guarda en el navegador (`localStorage`). Descarga respaldos desde Admin.
Los roles (operario, supervisor, admin) controlan permisos en el dispositivo, pero **no son seguridad real**: para varios usuarios y sincronización hay que conectar un backend (p. ej. Firebase Auth + Firestore con reglas de seguridad). Todo el acceso a datos pasa por `js/store.js`, para facilitar ese cambio.

## Estructura
```
index.html   styles.css   sw.js   manifest.webmanifest
js/store.js  modelo de datos, tipos de equipo, cálculo de vencimientos
js/ui.js     modal, formularios, CSV, utilidades
js/app.js    acciones y vistas
```
