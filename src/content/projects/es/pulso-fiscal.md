---
title: Pulso Fiscal
summary: Plataforma abierta de transparencia que convierte los gastos operacionales del Senado de Chile en rankings y tablas comparables.
outcome: "MVP con datos del Senado desde 2021: cada dato guarda la URL de la fuente, la fecha de captura y el hash SHA-256. En pausa desde junio de 2026."
order: 2
year: "2026"
status: paused
role: Diseño y desarrollo completo (ETL en Python, base de datos en Supabase, web en Next.js y documentación)
team:
  size: 1
stack:
  - Python 3.12
  - uv
  - httpx
  - Polars
  - PostgreSQL (Supabase)
  - Cloudflare R2
  - Next.js
  - TypeScript
  - Tailwind CSS
links:
  repo: https://github.com/mansep12/pulso-fiscal
license: Código MIT, datos CC-BY-4.0
featured: true
---

Pulso Fiscal es una plataforma abierta para que cualquier persona revise y compare los gastos operacionales que publica el Senado de Chile, con cada cifra trazable hasta la fuente oficial.

## Problema

Que un dato sea público no lo hace accesible. El Senado publica los gastos operacionales de cada senador en su página de Transparencia Activa, mes a mes, en un formato difícil de revisar y de comparar. El tema tiene interés público; en marzo de 2026, por ejemplo, [BioBioChile publicó un reportaje](https://www.biobiochile.cl/especial/bbcl-investiga/noticias/articulos/2026/03/25/mas-de-300-millones-al-mes-en-combustible-quienes-son-los-senadores-que-mas-gastan-en-traslado.shtml) sobre los senadores que más gastan en traslado.

Quería una herramienta que tomara esos datos tal como los publica el Senado, los ordenara en rankings y tablas, y dejara a la vista de dónde sale cada número, para que cualquiera pueda comprobarlo en vez de creerme.

## Restricciones

- **Tiempo.** Es un proyecto personal de tiempo libre. El primer commit es del 24 de mayo de 2026 y el último cambio de código, del 19 de junio. Desde entonces está en pausa.
- **Equipo.** Lo hice solo.
- **Fuente.** Hay una sola: la API JSON pública que consume la página de gastos operacionales del Senado. No está documentada como API, así que puede cambiar de URL o de formato, y los datos pueden venir incompletos.
- **Dominio.** Son datos sobre autoridades. El proyecto mide y muestra; no acusa. Un monto alto no implica por sí solo una irregularidad, y no se publican datos personales innecesarios como RUT, domicilio o teléfono.

## Decisiones

### Solo el Senado, por ahora

La idea de fondo es explicar en lenguaje normal muchos datos del Estado que nadie usa. Abrir varias fuentes a la vez era la alternativa obvia; la descarté y fijé el alcance por escrito en `docs/decisiones.md` (Senado, gastos operacionales, desde enero de 2021) para evitar cambios de alcance prematuros. La extensión a otros datos públicos del Estado queda abierta para después.

### Trazabilidad por dato, con el crudo fuera de Git

Cada respuesta descargada se guarda tal cual, con su URL fuente, la fecha de captura en UTC y el SHA-256 del cuerpo, y cada fila del CSV normalizado arrastra esas columnas. Los archivos crudos y procesados van a Cloudflare R2, no al repositorio. El costo es depender de un almacenamiento externo para reproducir un run.

### Promedio mensual en vez de total

Comparar montos totales pone arriba a quien tiene más meses publicados. El ranking por defecto usa `total_monto / meses_con_datos`, contando solo meses con al menos un registro comparable. Las filas que no son seguras de sumar quedan fuera y marcadas: montos vacíos, montos escritos dentro de texto, duplicados por `source_id` y ajustes negativos, que se reportan aparte. Las categorías se agrupan en un catálogo canónico, porque la fuente escribe la misma categoría de varias formas.

### Ningún run se publica sin manifiesto público

La regla está en tres capas. El normalizador corre un quality gate que detiene el run si, por ejemplo, faltan meses en el rango público o hay duplicados con contenido distinto. El loader exige que el manifiesto del run esté publicado en R2, lo descarga y verifica que coincida con el run local antes de abrir la conexión a la base. Y una constraint en Postgres impide que un run marcado `ok` quede sin URL de manifiesto. No hay atajo local: el runbook lo dice explícitamente. El costo es que sin R2 no se puede cargar nada, ni siquiera para probar.

### La web solo ve vistas

Las tablas base tienen RLS activado y ningún permiso para los roles públicos de Supabase. Lo único público son siete vistas sobre el último run correcto y tres funciones SQL agregadas, y la web consulta solo eso. Revertir un run es cambiar su estado a `error`: las vistas vuelven solas al run anterior. El costo es que cada consulta nueva necesita su vista o función, con su permiso explícito en una migración.

## Arquitectura

El repositorio tiene tres partes. `etl/` es el pipeline en Python: un scraper que descarga la API y escribe un manifiesto de descarga, un normalizador que genera el CSV limpio, el ranking mensual, las categorías y el reporte de calidad, y un loader que carga Supabase. `supabase/migrations/` tiene cinco migraciones versionadas: el esquema base, el cierre del acceso público, las constraints de calidad, permisos por defecto para objetos futuros y la exigencia de manifiesto. `web/` es la aplicación Next.js, con el ranking, una ficha por senador y páginas de metodología y fuentes.

El diagrama de abajo muestra el recorrido de un run, del Senado a la web.

## Resultado

**Cada fila publicada se puede rastrear hasta la respuesta exacta del Senado que la originó: URL, fecha de captura y SHA-256.** Y ningún run llega a la web sin pasar el quality gate y sin un manifiesto público que lo describa.

- Datos del Senado desde enero de 2021 hasta la última carga.
- 29 pruebas automáticas en el ETL, para el scraper, el normalizador y las validaciones del loader.
- Cinco migraciones versionadas, aplicables con la CLI de Supabase.
- Metodología, fuentes, decisiones y runbook de publicación y rollback escritos en `docs/`.
- Código bajo MIT y datos publicados bajo CC-BY-4.0.

## Qué cambiaría

- **Publicarlo.** El MVP no tiene una versión pública: el dominio y el hosting quedaron diferidos. Sin una URL, la trazabilidad solo la ve quien clona el repositorio. Es lo primero que haría al retomarlo.
- **La carga es manual.** Hoy un run se publica corriendo dos comandos a mano. Lo programaría, con el mismo quality gate y el mismo requisito de manifiesto.
- **Constraints sin validar.** Las de calidad se agregaron como `NOT VALID` para no bloquear datos ya cargados; Postgres las exige solo en filas nuevas o actualizadas. Después de recargar desde cero, las validaría.
- **La web no tiene pruebas.** El ETL sí; la web solo tiene `typecheck`. Agregaría pruebas de las consultas y de los estados de error, que hoy reviso a mano.
- **Detectar cambios en la fuente.** Si el Senado cambia el formato de su API, hoy lo noto recién al correr el pipeline. Una prueba programada contra la fuente lo avisaría antes.

## Cómo verificar esto

- **Código:** [github.com/mansep12/pulso-fiscal](https://github.com/mansep12/pulso-fiscal), código MIT y datos CC-BY-4.0. El historial muestra las fechas de trabajo y la pausa.
- **Trazabilidad:** el scraper (`etl/src/pulso_fiscal/scrapers/senado_gastos_operacionales.py`) guarda URL, fecha y SHA-256 por respuesta; el quality gate está en `enforce_quality_gate`, en el normalizador; el loader (`etl/src/pulso_fiscal/loaders/supabase.py`) valida el manifiesto público antes de conectarse.
- **Base de datos:** `supabase/migrations/20260603000000_lockdown_public_access.sql` cierra las tablas y `20260605020000_require_public_manifest_for_ok_runs.sql` agrega la constraint del manifiesto.
- **Correrlo:** desde `etl/`, `uv sync --group dev` instala el entorno y `uv run senado-gastos-operacionales --max-periods 1` descarga el primer periodo disponible desde la fuente oficial. Las pruebas están en `etl/tests` y corren con pytest.
- **Fuente oficial:** [senado.cl/transparencia/gastos-operacionales-senadores](https://www.senado.cl/transparencia/gastos-operacionales-senadores), para comparar cualquier cifra con su origen.
- **Sin demo:** no hay una versión publicada; el repositorio no enlaza ningún despliegue.
