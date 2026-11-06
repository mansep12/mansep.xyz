/**
 * UI strings (chrome, labels, accessibility text). Page prose lives in
 * content collections, not here. Spanish is the reference; the types require
 * every key in every locale.
 */

import type { Lang } from "./locales";

const es = {
  "skip.toContent": "Saltar al contenido",
  "nav.label": "Principal",
  "nav.projects": "Proyectos",
  "nav.research": "Investigación",
  "nav.about": "Sobre mí",
  "nav.cv": "CV",
  "lang.switch": "English",
  "lang.switchTitle": "Leer esta página en inglés",
  "theme.system": "Sistema",
  "theme.light": "Claro",
  "theme.dark": "Oscuro",
  "theme.aria.system": "Tema: sistema. Cambiar a claro",
  "theme.aria.light": "Tema: claro. Cambiar a oscuro",
  "theme.aria.dark": "Tema: oscuro. Cambiar a sistema",
  "footer.contact": "Contacto",
  "footer.email": "Correo",
  "footer.location": "Ubicación",
  "footer.timeZone": "Zona horaria",
  "footer.siteLinks": "Sobre este sitio",
  "footer.colophon": "Colofón",
  "footer.privacy": "Privacidad",
  "footer.license": "Código bajo licencia MIT. Contenido con todos los derechos reservados.",
  "footer.builtFrom": "Compilado desde",
  "home.status": "Este sitio está en construcción.",
} as const;

export type UiKey = keyof typeof es;

const en = {
  "skip.toContent": "Skip to content",
  "nav.label": "Main",
  "nav.projects": "Projects",
  "nav.research": "Research",
  "nav.about": "About",
  "nav.cv": "CV",
  "lang.switch": "Español",
  "lang.switchTitle": "Read this page in Spanish",
  "theme.system": "System",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.aria.system": "Theme: system. Switch to light",
  "theme.aria.light": "Theme: light. Switch to dark",
  "theme.aria.dark": "Theme: dark. Switch to system",
  "footer.contact": "Contact",
  "footer.email": "Email",
  "footer.location": "Location",
  "footer.timeZone": "Time zone",
  "footer.siteLinks": "About this site",
  "footer.colophon": "Colophon",
  "footer.privacy": "Privacy",
  "footer.license": "Code under the MIT License. Content all rights reserved.",
  "footer.builtFrom": "Built from",
  "home.status": "This site is under construction.",
} as const satisfies Record<UiKey, string>;

export const ui: Record<Lang, Record<UiKey, string>> = { es, en };

export function t(lang: Lang, key: UiKey): string {
  return ui[lang][key];
}

/** `t` bound to one locale, for components that render many strings. */
export function useTranslations(lang: Lang): (key: UiKey) => string {
  return (key) => t(lang, key);
}
