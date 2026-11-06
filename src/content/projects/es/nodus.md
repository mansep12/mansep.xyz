---
title: Nodus
summary: Compensación multilateral de deudas entre pymes sobre Stellar, con liquidación atómica y cuentas controladas por passkey.
outcome: "Primer lugar del University Track en Find Your Way Hackathon. En testnet, un círculo de 20 negocios se liquidó en una sola transacción con 20 firmas de passkey."
order: 1
year: "2026"
status: done
role: Diseño y desarrollo del producto completo (contratos, backend, aplicación web, pruebas de punta a punta, despliegue y documentación)
team:
  size: 2
  note: con Felipe Jara Ribet
event:
  name: Find Your Way Hackathon (Tellus y Stellar), octubre de 2026
  award: Best University Project (primer lugar del University Track)
stack:
  - Rust
  - Soroban SDK
  - TypeScript
  - Next.js 16
  - React 19
  - PostgreSQL
  - Drizzle ORM
  - OpenZeppelin smart accounts
  - OpenZeppelin Relayer
  - WebAuthn (passkeys)
  - Bun
links:
  repo: https://github.com/mansep12/nodus
  demo: https://nodus-stellar.vercel.app
  video: https://www.youtube.com/watch?v=HY0Obkx1N60
  youtubeId: HY0Obkx1N60
license: MIT
featured: true
---

Nodus es una aplicación para pymes que se deben dinero en círculo: encuentra esos círculos, cancela todas las deudas a la vez y mueve solo el saldo neto, con cada negocio firmando su parte con una passkey.

## Problema

En Chile la ley da 30 días para pagar una factura, pero el promedio real es de 44, y cuando una pyme le paga a otra llega a 53 (Ranking de Pagadores de la Bolsa de Productos; Radiografía Pyme 2025 de Xepelin). El atraso suele venir en cadena: quien te debe también está esperando que le paguen.

Muchas de esas deudas forman círculos. La panadería le debe 100 al molino, el molino le debe 80 al transportista y el transportista le debe 90 a la panadería. Los tres tienen dinero por cobrar y ninguno tiene suficiente para pagar. Hay dos formas de deshacer el nudo:

- **Liquidar todo:** se cancelan los 270 moviendo 20. La panadería y el transportista pagan 10 cada uno y el molino recibe 20.
- **Sin mover dinero:** se descuenta lo que las tres deudas tienen en común. Se cancelan 240 y quedan abiertas deudas por 20 y por 10.

En los dos casos nadie queda mejor ni peor que antes: lo que cada negocio deja de cobrar es igual a lo que deja de deber más lo que recibe.

## Restricciones

- **Tiempo.** Lo construí para Find Your Way Hackathon, organizada por Tellus sobre la red Stellar. El repositorio tiene 53 commits entre el 5 y el 10 de octubre de 2026, y la entrega exigía un video de tres minutos como máximo.
- **Equipo.** Dos personas, con Felipe Jara Ribet. Yo diseñé y programé el producto: contratos, backend, aplicación web, pruebas, despliegue y documentación.
- **Stack.** La hackatón pedía un uso significativo de Stellar, así que el núcleo es un contrato Soroban en Rust.
- **Dominio.** Es dinero entre negocios: la liquidación pasa entera o no pasa, y nadie puede firmar algo distinto de lo que ve. La compensación en la cadena no tiene por sí sola efecto legal ni contable.

## Decisiones

### Un contrato en vez de una cámara de compensación

Compensar deudas no es nuevo, pero siempre hay alguien en el medio: una cámara de compensación, o un factoring que compra la factura a entre 1 % y 2,2 % mensual. Descarté ese intermediario porque en Stellar puede ser un contrato de código abierto que no se queda con nada. `settle` recibe las deudas a cancelar, calcula el neto de cada dirección, llama `require_auth` para cada parte (también para las que quedan en cero) y mueve los netos. Todas las firmas viajan en la misma transacción: si falta una, o si a alguien no le alcanza para su neto, no cambia nada.

### El contrato calcula los netos; el buscador no es de confianza

La búsqueda de círculos corre fuera de la cadena, dentro de la aplicación, cada vez que cambian las deudas. Recorre ciclos de hasta 8 negocios, los ordena por la deuda que liberan más allá del dinero que mueven y se detiene a los 2 segundos. Fuera de la cadena puede equivocarse, así que el contrato no recibe los netos: los calcula y vuelve a validar cada deuda. Lo peor que logra un buscador malo es proponer algo que nadie firma o que el contrato rechaza.

### Cuentas con passkey, sin frases semilla

Cada negocio es una smart account de OpenZeppelin controlada por una passkey, para firmar desde su propio dispositivo sin frases semilla ni extensiones. Se puede agregar una passkey de respaldo y la de un contador, limitada por una policy propia (`contracts/allowlist`) a registrar, aceptar y rechazar deudas. El costo: esa policy compara solo el nombre de la función y confía en estar instalada en la regla del contrato Nodus.

### Comisiones pagadas por un relayer

Ningún negocio debería comprar XLM para firmar una compensación. Todas las transacciones pasan por OpenZeppelin Relayer (Channels), que paga la comisión. El costo: `/api/relay` patrocina cualquier llamada a Nodus con límites solo por IP, aceptable en testnet y no en mainnet.

### El navegador revisa lo que firma

El servidor arma la propuesta y guarda las firmas, pero no decide qué se firma. Antes de pedir la passkey, `assertMatches` comprueba que la entrada invoca `settle` con exactamente las deudas del círculo en pantalla y que la única transferencia es el neto mostrado. El servidor, a su vez, verifica cada firma antes de reenviarla. El costo es de privacidad: para comprobar lo que firma, el navegador recibe la lista completa de deudas del círculo, así que ocultar a los terceros en la interfaz es solo presentación.

## Arquitectura

Es un monorepo con Bun. El contrato (`contracts/nodus`) es la fuente de verdad y emite un evento por cada cambio. La aplicación Next.js tiene la interfaz y las rutas `/api`, y dentro de esas rutas corren el indexador, que copia los eventos a Postgres, y el buscador. No hay procesos aparte: sin visitas, solo corre un cron diario que llama a `/api/sync`.

Una liquidación sigue este camino: una parte abre la propuesta y el servidor exige que el círculo esté entre los que ofrece el buscador; cada parte revisa su entrada y firma con su passkey; con la última firma, una sola petición la envía al relayer. El diagrama de abajo muestra qué corre dónde.

## Resultado

**Un círculo de 20 negocios se liquidó en testnet en una sola transacción, con 20 firmas de passkey.** Usó el 33 % del cómputo y el 44 % del tamaño que la red permite por transacción.

- Un círculo de 3 negocios se compensó sin mover dinero desde la aplicación web, con la comisión pagada por el relayer.
- Ganó Best University Project, el primer lugar del University Track de Find Your Way Hackathon.
- La demo corre en testnet con mundos de ejemplo: 11 cuentas reales por mundo y un círculo de tres listo para firmar.
- Hay pruebas del contrato, del buscador, del indexador, de las firmas y de la interfaz, más pruebas de punta a punta contra testnet. La CI corre formato, lint, typecheck, las pruebas unitarias y el build.

## Qué cambiaría

- **Privacidad.** Cada deuda queda en eventos públicos: cualquiera puede leer quién le debe a quién y cuánto. La referencia de una deuda es el SHA-256 del texto sin sal, y un número de factura corto se encuentra probando. Lo primero sería ponerle sal y decidir si los montos de terceros pueden llegar al navegador.
- **Origen de las deudas.** Hoy las declaran las partes y la identidad de los negocios no se verifica. Las tomaría de las facturas electrónicas del SII.
- **Antes de mainnet.** El relayer necesita una cuota por cuenta y un presupuesto, y las sesiones, una forma de revocarlas.
- **Círculos grandes.** La aplicación propone círculos de hasta 8 negocios; el de 20 lo armé con un script.

Nada de esto está auditado. La lista completa de supuestos a revisar está en `docs/seguridad.md`.

## Cómo verificar esto

- **Código:** [github.com/mansep12/nodus](https://github.com/mansep12/nodus), licencia MIT. El contrato está en `contracts/nodus/src/lib.rs`, la revisión de lo que se firma en `apps/web/src/lib/actions.ts` y la verificación de passkeys en `packages/stellar/src/passkey.ts`.
- **Transacciones en testnet:** el [círculo de 20 negocios](https://stellar.expert/explorer/testnet/tx/da968b3a8e5ec4a1008d67e5f6ef1bc9df330bf922fbb0e58862245558039b63) y el [círculo de 3 sin mover dinero](https://stellar.expert/explorer/testnet/tx/a2f068a9bf2dbdf736ddabf5860edcce487f0bf3230af49e246881f819558fdd). Testnet se reinicia de vez en cuando; si un enlace deja de resolver, `bun run e2e:settle 20` repite la medición del círculo de 20.
- **Demo:** [nodus-stellar.vercel.app](https://nodus-stellar.vercel.app), en testnet y con un activo de prueba, no USDC real.
- **Correrlo:** con Bun, Rust (target `wasm32v1-none`) y la Stellar CLI: `bun install`, `bun run contract:build`, `bun run contract:test` y `bun run test`. Con la llave del relayer en `packages/e2e/.env`, `bun run deploy:testnet` despliega token, contrato y policy.
- **Video:** el [pitch en YouTube](https://www.youtube.com/watch?v=HY0Obkx1N60). En su demo los negocios son cuentas de prueba creadas por scripts y las firmas las responde el autenticador virtual del navegador; las transacciones son reales, en testnet.
