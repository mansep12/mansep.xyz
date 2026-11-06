---
title: Pulso Urbano
summary: Urban simulator for Santiago that shows mobility scenarios and estimates their impact on CO2, PM2.5 and noise, built on real open data.
outcome: "Working prototype in 54 hours, team of 4: a Santiago map with metro, RED buses, cycle lanes, communes and noise, plus an impact comparator by transport mode."
order: 3
year: "2026"
status: done
role: The interactive map and its layers (metro, RED buses, cycle lanes, communes and noise), the GTFS data script and a CO2 simulation
team:
  size: 4
event:
  name: Indies Hack, May 2026
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
license: MIT (stated in the README)
featured: true
---

Pulso Urbano is an urban simulation tool for Santiago: an interactive map where planners, decision makers and citizens can see how the city moves and estimate the environmental impact of a transport change before it happens.

## Problem

Every transport infrastructure decision, such as closing a metro station or opening a new line, has an environmental cost in congestion, air pollution and noise. That cost is rarely estimated in time: when a station closes, thousands of people switch transport mode and nobody has worked out what that means in emissions.

The data to estimate it is open: Santiago's 2012 Origin-Destination Survey (EOD, by SECTRA), public transport routes and frequencies in GTFS, the cycle lane network from Observatorio de Ciudades UC, commune boundaries and environmental noise maps. The problem is putting them together into something people can look at and understand.

## Constraints

- **Time.** 54 hours, at Indies Hack, in May 2026.
- **Team.** Four people: Felipe Jara Ribet, Alejandra Campos Urbina, Alejandro Hernández and me. Felipe set up the repository with TanStack Start on Cloudflare Workers and D1; I built on top of it. 16 of the repository's commits are mine.
- **Stack.** No separate server: everything runs on Workers and static files, with MapLibre GL for the map.
- **Data.** Public sources in different formats (GTFS, GeoJSON, the EOD database), different coordinate systems and large files.

## Decisions

### Static files first, then D1

For the map I wrote `scripts/build-data.ts`, which downloads the current DTPM GTFS and the OCUC cycle lanes and emits static GeoJSON in `public/data/` (metro, buses, cycle lanes, frequencies and travel times), and I added the commune boundaries as another GeoJSON. The map loaded them as files, with no database. The same day the team moved communes, cycle lanes, frequencies and travel times into the `DTPMGEO` D1 database, and I switched the map to read communes from there through the `getComunasGeoJSON` server function. Static files need no server but stay frozen until the script runs again; D1 gives one source at the cost of a query before drawing each layer.

### Find the current GTFS, with a fallback URL

DTPM publishes new GTFS versions over time, so a fixed URL goes stale. The script reads the index page where DTPM links the current files and falls back to a hard-coded URL if that fails. It also caches the roughly 50 MB zip in `.cache/`. The cost: if DTPM changes its page, the fallback can go stale without anyone noticing.

### Noise per commune, only on selection

The noise layer paints georeferenced environmental noise (Lden) in 5 dB bands from 30 to 85 dB(A), with a gauge for each commune's average, minimum and maximum, precomputed in `noise-stats.json`. The layer only appears once a commune is selected, so someone who selects nothing never sees it.

### An explicit simulation that did not make the final version

I wrote a quick CO2 simulation for closing or opening a station: affected trips, share moving to cars, distance, occupancy and emission factor, all editable, with three scenarios (10, 25 and 40% moving to cars) instead of one number, plus an 800 m radius with nearby stations and stops. It has Vitest tests. In the final version the map page uses the comparator the rest of the team built and no longer imports this module; it remains in `src/simulation/`.

## Architecture

Open sources go through import and data scripts. Part ends up in two D1 databases, `EOD2012` (the survey) and `DTPMGEO` (transport geometry and communes), and part in static GeoJSON and JSON files. The TanStack Start app runs on Cloudflare Workers, serving the files and exposing server functions that read D1. In the browser, MapLibre GL draws the layers and the comparator splits trips between communes by mode and estimates CO2 and PM2.5. The diagram below shows the flow; the colored border marks where my work is.

## Result

**In 54 hours the team had a working Santiago map with metro, RED buses, cycle lanes, communes and noise, and a comparator that estimates CO2 and PM2.5 when trips between communes change mode.**

- My 16 commits cover the map's base and layers, the GTFS data script, loading communes from D1, the noise layer and gauge, a 3D terrain view per commune, metro station details and mobile layout fixes.
- The simulation module has unit tests for the CO2 calculation and the station impact radius.

## What I would change

- **The noise layer's weight.** `public/data/noise.geojson` is 11.5 MB. I would simplify it per commune or serve it as vector tiles.
- **Show uncertainty.** The final comparator uses fixed factors in `src/lib/emissions.ts` (15 km per liter, 2.67 kg of CO2 per liter, 0.005 g of PM2.5 per km). My simulation showed three scenarios; I would bring those ranges to the comparator.
- **Newer data.** The EOD used is from 2012, and the interface should say so next to every estimate.
- **Integrate earlier.** My simulation and the comparator compute impact separately and only one reached the final page. In 54 hours I would agree early on which piece owns that calculation.

## How to verify this

- **Code:** [github.com/fjararibet/pulsourbano](https://github.com/fjararibet/pulsourbano). The README lists the four authors and states an MIT license; the repository has no license file.
- **My part:** my commits show up as `mansep12` in the history. My work is mostly in `src/map/` (I created it and the team extended it), `scripts/build-data.ts` and `src/simulation/`.
- **Run it:** per the README, `npm install` and `npm run dev`. Communes and trips are read from D1, so a local copy needs access to the databases defined in `wrangler.jsonc`.
- **Tests:** `src/simulation/quick-simulation.test.ts` and `src/simulation/station-impact.test.ts`, with Vitest.
- **No public demo:** the repository links no deployment.
