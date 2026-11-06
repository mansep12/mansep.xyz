---
title: "Colofón"
description: "Cómo está hecho este sitio y por qué: Astro, Cloudflare Workers con static assets, CSS propio con tokens, IBM Plex alojada en el sitio y rutas en dos idiomas."
---

Este sitio es estático: cada página se genera una vez, al compilar, y se sirve como un archivo. No hay base de datos ni servidor que arme cada visita, así que carga rápido y tiene poco que mantener.

## Cómo está hecho

- **[Astro](https://astro.build)** genera las páginas. El sitio es contenido, y Astro produce HTML sin JavaScript salvo donde hace falta (el tema, el correo, el botón del CV). Los textos y las fichas de proyecto pasan por esquemas: si a un proyecto le falta un enlace al código o a una demo, la compilación falla.
- **[Cloudflare Workers](https://developers.cloudflare.com/workers/) con static assets** sirve los archivos. El plan gratuito cubre lo que el sitio necesita, el dominio y el DNS están en la misma cuenta, y ya había usado Workers en Pulso Urbano.
- **CSS propio con tokens**, sin framework. El sitio es chico y el CSS cabe en pocos archivos. Los colores se definen una vez por tema con `light-dark()`; el tema sigue al sistema salvo que elijas otro.
- **IBM Plex Sans e IBM Plex Mono**, alojadas en el propio sitio en vez de pedirlas a un servicio de fuentes. Son una sola familia, y la mono marca lo que es dato: fechas, stack, estados.
- **Dos idiomas con rutas propias**: español en la raíz e inglés bajo `/en/`, porque lo leen equipos en Chile y equipos que trabajan en inglés. Cada página enlaza a su versión en el otro idioma, sin redirección automática.
- **El CV** sale de un archivo JSON con la forma de JSON Resume, el mismo que alimenta la experiencia de Sobre mí, así que hay una sola fuente para ambos.

Las visitas se miden con Cloudflare Web Analytics, sin cookies. El detalle está en [Privacidad](/privacidad).

## Código y versión

El código es público en [github.com/mansep12/mansep.xyz](https://github.com/mansep12/mansep.xyz). El pie de cada página muestra el commit desde el que se compiló, con enlace a GitHub, para saber exactamente qué versión estás leyendo.

## Licencias

El código está bajo [licencia MIT](https://github.com/mansep12/mansep.xyz/blob/main/LICENSE). El contenido (textos, CV e imágenes) tiene todos los derechos reservados; el detalle está en [LICENSE-CONTENT.md](https://github.com/mansep12/mansep.xyz/blob/main/LICENSE-CONTENT.md).
