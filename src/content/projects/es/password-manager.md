---
title: Gestor de contraseñas
summary: Gestor de contraseñas web con cifrado en el navegador, llaves AES derivadas con PBKDF2 y RSA-OAEP para compartir entre usuarios.
outcome: "Las contraseñas guardadas llegan al servidor solo cifradas, y compartir una no le muestra el texto al servidor. Tiene limitaciones conocidas y documentadas."
order: 4
year: "2024"
status: done
role: Backend en FastAPI (modelos, rutas y CRUD) y vistas del frontend
team:
  size: 2
  note: según el historial del repositorio
stack:
  - Web Crypto API
  - React
  - Vite
  - MUI
  - FastAPI
  - SQLModel
  - SQLite
  - PyJWT
  - bcrypt
links:
  repo: https://github.com/mansep12/password-manager
featured: false
---

Un gestor de contraseñas web, hecho para el curso Introducción a la Criptografía Moderna en 2024: cada usuario guarda, genera y comparte contraseñas, y el cifrado ocurre en su navegador.

## Problema

Un gestor de contraseñas tiene que guardar secretos en un servidor sin que el servidor pueda leerlos, y además permitir que un usuario le comparta una contraseña a otro. El curso pedía resolverlo aplicando mecanismos criptográficos en el cliente: el servidor guarda y entrega datos, pero no debería poder descifrarlos.

## Restricciones

- **Tiempo.** Un proyecto de curso. El historial del repositorio va del 7 al 10 de diciembre de 2024.
- **Equipo.** Dos personas según el historial: Felipe Jara y yo. Mi parte fue la estructura del backend en FastAPI (modelos, esquemas, rutas y CRUD de usuarios, grupos, contraseñas y compartidas) y las vistas del frontend: inicio de sesión, registro, tabla de contraseñas, usuarios y compartir. Los módulos de cifrado, el generador de contraseñas y la autenticación con JWT los escribió Felipe.
- **Stack.** React con Vite y MUI en el frontend; FastAPI, SQLModel y SQLite en el backend; para el cifrado, solo la Web Crypto API del navegador, sin bibliotecas externas.

## Decisiones

### Cifrar en el navegador con la Web Crypto API

Todo el cifrado corre en el navegador con `crypto.subtle`, sin dependencias. El servidor recibe texto cifrado, IV y sal, y los guarda en SQLite. La ventaja es no sumar código criptográfico de terceros; el costo es quedar limitado a lo que ofrece la API. Para derivar una llave desde una contraseña, eso es PBKDF2: Argon2 no está disponible en Web Crypto.

### Una llave derivada de la contraseña maestra

Al registrarse, el navegador genera una sal de 16 bytes al azar y deriva con PBKDF2 (SHA-256, 100.000 iteraciones) una llave AES-CBC de 256 bits. Con esa llave se cifran las contraseñas guardadas, cada una con un IV nuevo. Las limitaciones están declaradas en el README: AES-CBC no está autenticado, así que el cliente no tiene cómo detectar de forma confiable que un servidor malicioso alteró un texto cifrado, y 100.000 iteraciones está por debajo de lo que recomienda OWASP hoy.

### Un par RSA-OAEP por usuario para compartir

Cada usuario tiene un par RSA-OAEP de 2048 bits con SHA-256 generado en el navegador. La llave privada se cifra con la llave AES y el servidor la guarda cifrada. Para compartir, el navegador descifra la contraseña y la vuelve a cifrar con la llave pública del destinatario. Con ese tamaño de llave y SHA-256, OAEP admite hasta 190 bytes de texto: alcanza para una contraseña, no para un archivo. Hay dos costos visibles en el código: la copia compartida es una fila aparte, así que no se actualiza si el dueño cambia la contraseña, y la llave pública del destinatario la entrega el servidor sin forma de verificarla.

### La misma contraseña para entrar y para cifrar

La sesión usa JWT y el servidor guarda un hash bcrypt de la contraseña. Pero esa contraseña es la misma maestra de la que se deriva la llave: el navegador la envía al registrarse y al iniciar sesión. Es la limitación más seria y también está declarada en el README.

## Arquitectura

`frontend/` es la aplicación React: `encryptionAESCBC.js` y `encryptionRSAOAEP.js` envuelven la Web Crypto API, `signup.jsx` genera la sal y el par de llaves, y `passwords.jsx` cifra, descifra y comparte. `backend/` es la API en FastAPI, con modelos SQLModel para usuarios, grupos, contraseñas y contraseñas compartidas, rutas por recurso y tokens JWT de 30 minutos. El diagrama de abajo muestra dónde se derivan las llaves y qué guarda el servidor; la flecha resaltada es la contraseña maestra llegando al servidor.

## Resultado

**El servidor nunca recibe en claro una contraseña guardada ni una compartida, ni la llave privada de un usuario. Sí recibe la contraseña maestra.**

- Registro, inicio de sesión, contraseñas guardadas, generador y contraseñas compartidas entre usuarios funcionan de punta a punta en local.
- En noviembre de 2026 volví al código y escribí en el README qué se cifra, cómo y con qué limitaciones, a partir de `signup.jsx`, `passwords.jsx` y los módulos de cifrado.

## Qué cambiaría

- **Separar entrar de cifrar.** Derivaría del secreto del usuario dos llaves distintas, una para autenticarse y otra para cifrar, de modo que el servidor nunca vea lo que permite descifrar.
- **No guardar la contraseña maestra en el navegador.** Hoy queda en `localStorage` para derivar la llave en cada página. Guardaría solo una `CryptoKey` no exportable en memoria; la de ahora se crea exportable.
- **AES-GCM y más iteraciones.** Cifrado autenticado en vez de AES-CBC, y las iteraciones de PBKDF2 que pide OWASP.
- **Autorización en el backend.** Esta parte es mía: aparte del registro y el inicio de sesión, 13 de las 22 rutas no exigen sesión. Por ejemplo, modificar o borrar una contraseña (`PATCH` y `DELETE` en `/passwords/{id}`) no verifica quién llama ni si la contraseña es suya. Pondría sesión y dueño en cada ruta.
- **Lo que queda en claro.** El nombre, la URL y el usuario de cada contraseña se guardan sin cifrar, y el secreto de los JWT está escrito en el código. Cifraría esos campos y movería el secreto a una variable de entorno.
- **El generador.** Usa `Math.random`; debería usar `crypto.getRandomValues`.

## Cómo verificar esto

- **Código:** [github.com/mansep12/password-manager](https://github.com/mansep12/password-manager). El repositorio no declara una licencia.
- **Cifrado:** `frontend/src/encryptionAESCBC.js` (PBKDF2 y AES-CBC), `frontend/src/encryptionRSAOAEP.js` (RSA-OAEP), `frontend/src/pages/signup.jsx` (sal y par de llaves) y `frontend/src/pages/passwords.jsx` (descifrar y compartir).
- **Qué guarda el servidor:** los modelos en `backend/models/`; las rutas sin sesión, en `backend/routers/`.
- **Quién hizo qué:** el historial de commits muestra a los dos autores y qué archivos tocó cada uno.
- **Correrlo:** según el README, en `backend/`, `pip install -r requirements.txt` y `uvicorn main:app --reload` (la documentación de la API queda en `localhost:8000/docs`); en `frontend/`, un `.env` con `VITE_API_URL`, `npm install` y `npm run dev`.
- **Sin demo:** no hay una versión publicada.
