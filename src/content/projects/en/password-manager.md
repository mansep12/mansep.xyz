---
title: Password manager
summary: Web password manager with in-browser encryption, PBKDF2-derived AES keys and RSA-OAEP for sharing between users.
outcome: "Saved passwords reach the server only encrypted, and sharing one never shows the server its text. Known limitations are documented."
order: 4
year: "2024"
status: done
role: FastAPI backend (models, routes and CRUD) and frontend views
team:
  size: 2
  note: per the repository history
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

A web password manager built for the Introduction to Modern Cryptography course in 2024: each user stores, generates and shares passwords, and encryption happens in their browser.

## Problem

A password manager has to keep secrets on a server the server cannot read, and also let one user share a password with another. The goal was to solve it with cryptographic mechanisms on the client: the server stores and returns data but should not be able to decrypt it.

## Constraints

- **Time.** A course project. The course commits run from December 7 to 10, 2024.
- **Team.** Two people per the history: Felipe Jara and me. My part was the FastAPI backend structure (models, schemas, routes and CRUD for users, groups, passwords and shared passwords) and the frontend views: login, sign-up, password table, users and sharing. Felipe wrote the encryption modules and their use inside the sign-up and password views, the password generator and JWT authentication.
- **Stack.** React with Vite and MUI; FastAPI, SQLModel and SQLite; for cryptography, only the browser's Web Crypto API.

## Decisions

### Encrypt in the browser with the Web Crypto API

All encryption runs in the browser through `crypto.subtle`, with no dependencies. The server receives ciphertext, IVs and salt and stores them in SQLite. The upside is no third-party crypto code; the cost is being limited to what the API offers. For deriving a key from a password that means PBKDF2: Argon2 is not available in Web Crypto.

### One key derived from the master password

At sign-up the browser generates a random 16-byte salt and derives a 256-bit AES-CBC key with PBKDF2 (SHA-256, 100,000 iterations). Saved passwords are encrypted with that key, each with a fresh IV. The README states the limitations: AES-CBC is not authenticated, so the client has no reliable way to detect a ciphertext tampered with by a malicious server, and 100,000 iterations is below current OWASP guidance.

### An RSA-OAEP key pair per user for sharing

Each user has a 2048-bit RSA-OAEP key pair with SHA-256, generated in the browser. The private key is encrypted with the AES key and stored that way on the server. To share, the browser decrypts the password and re-encrypts it with the recipient's public key. At that key size OAEP fits up to 190 bytes: enough for a password, not for a file. Two costs show in the code: the shared copy is a separate row, so it does not follow later changes, and the server hands out the recipient's public key with no way to verify it.

### The same password to log in and to encrypt

Sessions use JWT and the server stores a bcrypt hash of the password. But it is the same master password the key is derived from: the browser sends it at sign-up and at login. This is the most serious limitation, and the README states it too.

## Architecture

`frontend/` is the React app: `encryptionAESCBC.js` and `encryptionRSAOAEP.js` wrap the Web Crypto API, `signup.jsx` creates the salt and key pair, and `passwords.jsx` encrypts, decrypts and shares. `backend/` is the FastAPI API, with SQLModel models for users, groups, passwords and shared passwords, one router per resource and 30-minute JWTs. The diagram below shows where keys are derived and what the server stores; the highlighted arrow is the master password reaching the server.

## Result

**The server never receives a saved or shared password in clear, nor a user's private key. It does receive the master password.**

- Sign-up, login, saved passwords, the generator and sharing between users work end to end locally.
- In November 2026 I went back to the code and wrote in the README what it encrypts, how, and with which limitations.

## What I would change

- **Split logging in from encrypting.** Derive two keys from the user's secret, one to authenticate and one to encrypt, so the server never sees what decrypts.
- **Keep the master password out of storage.** Today it sits in `localStorage` to derive the key for every operation. I would keep only a non-extractable `CryptoKey` in memory; the current one is created extractable.
- **AES-GCM and more iterations.** Authenticated encryption instead of AES-CBC, and the PBKDF2 iterations OWASP asks for.
- **Backend authorization.** This part is mine: apart from sign-up and login, 13 of the 22 routes do not require a session. Updating or deleting a password (`PATCH` and `DELETE` on `/passwords/{id}`) checks neither the caller nor ownership.
- **What stays in clear.** Each password's name, URL and username are stored unencrypted, and the JWT secret is hard-coded.
- **The generator.** It uses `Math.random`; it should use `crypto.getRandomValues`.

## How to verify this

- **Code:** [github.com/mansep12/password-manager](https://github.com/mansep12/password-manager). The repository declares no license.
- **Encryption:** `frontend/src/encryptionAESCBC.js`, `frontend/src/encryptionRSAOAEP.js`, `frontend/src/pages/signup.jsx` and `frontend/src/pages/passwords.jsx`.
- **What the server stores:** the models in `backend/models/`; the routes without sessions in `backend/routers/`.
- **Who did what:** the commit history shows both authors and the files each touched.
- **Run it:** per the README, in `backend/`, `pip install -r requirements.txt` and `uvicorn main:app --reload` (API docs at `localhost:8000/docs`); in `frontend/`, a `.env` with `VITE_API_URL`, `npm install` and `npm run dev`.
- **No demo:** there is no published version.
