---
title: Pulso Urbano
summary: Simulador urbano para Santiago que muestra escenarios de movilidad y estima su impacto en CO2 y PM2.5, con datos abiertos reales y un mapa de ruido por comuna.
outcome: "Prototipo funcional en 54 horas, en equipo de 4: mapa de Santiago con comunas, viajes entre comunas y ruido, y un comparador de impacto por modo de transporte."
order: 3
year: "2026"
status: done
role: Mapa interactivo y sus capas (metro, buses RED, ciclovías, comunas y ruido), script de datos GTFS y una simulación de CO2
team:
  size: 4
event:
  name: Indies Hack, mayo de 2026
  hours: 54
stack:
  - TypeScript
  - React
  - TanStack Start
  - MapLibre GL
  - Cloudflare Workers
  - Cloudflare D1
  - Drizzle ORM
  - Tailwind CSS v4
  - Vitest
links:
  repo: https://github.com/fjararibet/pulsourbano
license: MIT (declarada en el README)
featured: true
---

Pulso Urbano es una herramienta de simulación urbana para Santiago: un mapa interactivo donde planificadores, tomadores de decisiones y cualquier persona pueden ver cómo se mueve la ciudad y estimar el impacto ambiental de un cambio en el transporte antes de que ocurra.

## Problema

Cada decisión sobre infraestructura de transporte, como cerrar una estación de metro o abrir una línea nueva, tiene un costo ambiental en congestión, contaminación del aire y ruido. Ese costo rara vez se calcula a tiempo: cuando una estación cierra, miles de personas cambian de modo de transporte sin que nadie haya estimado qué significa eso en emisiones.

Los datos para estimarlo existen y son abiertos: la Encuesta Origen-Destino de Santiago (EOD 2012, de SECTRA), los recorridos y frecuencias del transporte público en formato GTFS, la red de ciclovías del Observatorio de Ciudades UC, los límites comunales de la Región Metropolitana y mapas de ruido ambiental. El problema es juntarlos en algo que se pueda mirar y entender.

## Restricciones

- **Tiempo.** 54 horas, en Indies Hack, en mayo de 2026.
- **Equipo.** Cuatro personas: Felipe Jara Ribet, Alejandra Campos Urbina, Alejandro Hernández y yo. Felipe creó el repositorio con TanStack Start sobre Cloudflare Workers y D1; trabajé sobre esa base. 16 de los commits del repositorio son míos.
- **Stack.** TanStack Start y React en Cloudflare Workers, D1 (SQLite) con Drizzle ORM y MapLibre GL para el mapa. No hay un servidor aparte: todo corre en Workers y en archivos estáticos.
- **Datos.** Fuentes públicas con formatos distintos (GTFS, GeoJSON, la base de la EOD), coordenadas en sistemas distintos y archivos grandes.

## Decisiones

### Primero archivos estáticos, después D1

Para el mapa escribí `scripts/build-data.ts`, que descarga el GTFS vigente del DTPM y las ciclovías del OCUC y emite GeoJSON y JSON estáticos en `public/data/` (metro, buses, ciclovías, frecuencias y tiempos de viaje), y agregué los límites comunales como otro GeoJSON. El mapa los cargaba como archivos, sin base de datos. Ese mismo día el equipo migró comunas, ciclovías, frecuencias y tiempos de viaje a la base `DTPMGEO` en D1, y al día siguiente cambié el mapa para leer las comunas desde ahí con la función de servidor `getComunasGeoJSON`. Los archivos estáticos no necesitan servidor, pero quedan congelados hasta correr el script otra vez; D1 deja una sola fuente a cambio de una consulta antes de dibujar cada capa.

### Buscar el GTFS vigente, con una URL de respaldo

El DTPM publica versiones nuevas del GTFS cada cierto tiempo, así que una URL fija queda vieja. El script lee la página índice donde el DTPM publica los enlaces vigentes y, si eso falla, usa una URL escrita en el código. También guarda el zip en `.cache/` para no descargar cerca de 50 MB en cada corrida. El costo: si el DTPM cambia su página, el respaldo puede quedar desactualizado sin que nadie lo note.

### Ruido por comuna, solo al seleccionar

La capa de ruido usa datos georreferenciados de ruido ambiental (Lden) pintados en bandas de 5 dB entre 30 y 85 dB(A), con un medidor del promedio de cada comuna y su rango mínimo y máximo, precalculados en `noise-stats.json`. La capa aparece recién cuando se elige una comuna. La consecuencia es que quien no selecciona nada no ve el ruido.

### Una simulación explícita, que no llegó a la versión final

Escribí una simulación rápida de CO2 para el cierre o la apertura de una estación: viajes afectados, porcentaje que pasa al auto, distancia, ocupación y factor de emisión, todos editables, con tres escenarios (10, 25 y 40 % de cambio al auto) en vez de un solo número, más un radio de 800 m con las estaciones y paraderos cercanos. Tiene pruebas con Vitest. En la versión final, la página del mapa usa el comparador que hizo el resto del equipo y ya no importa ese módulo; queda en `src/simulation/`.

## Arquitectura

Las fuentes abiertas pasan por scripts de importación y de datos. Una parte termina en dos bases D1, `EOD2012` (la encuesta) y `DTPMGEO` (geometrías del transporte y comunas), y otra en archivos GeoJSON y JSON estáticos. La aplicación TanStack Start corre en Cloudflare Workers: sirve los archivos y expone funciones de servidor que leen D1. En el navegador, MapLibre GL dibuja las capas y el comparador reparte los viajes entre comunas por modo de transporte y estima CO2 y PM2.5.

El diagrama de abajo muestra ese recorrido; el borde de color marca dónde está mi trabajo.

## Resultado

**En 54 horas quedó funcionando un mapa de Santiago con comunas, viajes entre comunas y ruido, y un comparador que estima CO2 y PM2.5 al cambiar el modo de transporte de esos viajes.**

- Mis 16 commits cubren la base del mapa y sus capas (las de metro, buses y ciclovías no quedaron en la versión final), el script de datos GTFS, las comunas en D1, la capa y el medidor de ruido, una vista 3D del terreno por comuna, la información de cada estación de metro y ajustes para pantallas móviles.
- El módulo de simulación quedó con pruebas unitarias para el cálculo de CO2 y para el radio de impacto de una estación.
- También subí al repositorio el material de la presentación (`presentacion/`): estructura, guion del video e investigación sobre el jurado.

## Qué cambiaría

- **El peso de la capa de ruido.** `public/data/noise.geojson` pesa 11,6 MB. La simplificaría por comuna o la serviría como teselas vectoriales en vez de un GeoJSON completo.
- **Mostrar la incertidumbre.** El comparador final usa factores fijos en `src/lib/emissions.ts` (15 km por litro, 2,67 kg de CO2 por litro y 0,005 g de PM2.5 por kilómetro). Mi simulación mostraba tres escenarios; llevaría esos rangos al comparador para que el resultado no parezca más preciso de lo que es.
- **Datos más recientes.** La EOD usada es de 2012. Cualquier estimación hereda esa antigüedad, y la interfaz debería decirlo junto al resultado.
- **Integrar antes.** Mi simulación y el comparador calculan el impacto por separado, y solo uno llegó a la página final. En una hackatón de 54 horas, acordaría al principio qué pieza calcula el impacto, para no escribir dos.

## Cómo verificar esto

- **Código:** [github.com/fjararibet/pulsourbano](https://github.com/fjararibet/pulsourbano). El README lista a los cuatro autores y declara licencia MIT; el repositorio no incluye un archivo de licencia.
- **Mi parte:** mis commits aparecen con el usuario `mansep12` en el historial. Mi trabajo está sobre todo en `src/map/` (lo creé y después el equipo lo extendió), `scripts/build-data.ts` y `src/simulation/`.
- **Correrlo:** según el README, `npm install` y `npm run dev`. Las comunas y los viajes se leen de D1, así que una copia local necesita acceso a las bases definidas en `wrangler.jsonc`.
- **Pruebas:** `src/simulation/quick-simulation.test.ts` y `src/simulation/station-impact.test.ts`, con Vitest.
- **Sin demo enlazada:** el README no enlaza un despliegue.
