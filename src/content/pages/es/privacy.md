---
title: "Privacidad"
description: "Qué datos usa este sitio: sin cookies, visitas medidas en forma agregada con Cloudflare Web Analytics, la preferencia de tema guardada solo en tu navegador y qué envía a Anthropic el generador de CV."
---

Este sitio no usa cookies.

## Visitas

Mido las visitas con Cloudflare Web Analytics, que no usa cookies ni guarda datos que permitan identificarte. Solo veo cifras agregadas, como páginas vistas, sitios de origen o países.

El sitio está alojado en Cloudflare, que procesa los datos técnicos de cada solicitud, como la dirección IP, para entregar las páginas y protegerlas de abusos.

## Lo que se guarda en tu navegador

Si eliges el tema claro u oscuro, esa preferencia se guarda en el almacenamiento local de tu navegador (localStorage) y no sale de él. Si vuelves a la opción del sistema, se borra. El idioma no se guarda: depende de la dirección de la página, con español en la raíz e inglés bajo `/en/`.

## Videos

Si una página incluye un video de YouTube, el reproductor se carga solo cuando haces clic en él. Desde ese momento rige la política de privacidad de Google.

## Generador de CV

En la página del CV puedes pegar una oferta de trabajo o describir un rol para armar una versión adaptada del CV. Si lo usas:

- **Qué se envía a Anthropic.** El texto que pegas, el idioma y el foco que elijas, junto con los datos públicos de mi CV, se envían a la API de Anthropic, cuyos modelos Claude eligen los logros más relevantes. Anthropic no entrena sus modelos con lo que recibe por la API y, según [su política de retención para la API](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-commercial-api-data), borra las entradas y salidas dentro de 30 días, salvo que necesite guardarlas para hacer cumplir su política de uso o por obligación legal. No pegues datos personales de terceros.
- **Qué guarda este sitio.** El texto no se guarda. Cada uso deja un registro con la fecha, el idioma, una huella SHA-256 del texto (que no permite leerlo), los identificadores de los logros elegidos y el consumo de la API.
- **Límite diario.** Para limitar los usos por día, el sitio cuenta las solicitudes con un hash de tu dirección IP combinada con la fecha, que cambia cada día. La IP no se guarda, y el contador se borra al terminar el día (hora UTC).
- **Cloudflare Turnstile.** El formulario usa Turnstile para comprobar que lo envía una persona. Se carga solo cuando empiezas a usar el formulario, desde `challenges.cloudflare.com`, y Cloudflare procesa datos técnicos como la dirección IP y el navegador solo para detectar bots, según su [política de privacidad de Turnstile](https://www.cloudflare.com/turnstile-privacy-policy/).

## Contacto
