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
  "home.description":
    "Software engineer en Santiago: backend, criptografía aplicada y seguridad. Proyectos, investigación, CV y contacto.",
  "home.intro":
    "Construyo backends y contratos inteligentes donde importan las firmas, la privacidad y el origen de los datos.",
  "home.projects": "Proyectos",
  "home.allProjects": "Todos los proyectos",
  "home.research": "Investigación",
  "home.researchLink": "Más sobre la investigación",
  "home.contact": "Contacto",
  "home.updated": "Actualizado:",
  "contact.email": "Correo",
  "contact.location": "Ubicación",
  "contact.availability":
    "Busco trabajo como backend, full-stack o security engineer, en Santiago, remoto o híbrido, de preferencia en equipos que trabajen en inglés.",
  "projects.title": "Proyectos",
  "projects.description":
    "Proyectos de Manuel Sepúlveda: resultado, rol, stack y enlaces al código o a la demo de cada uno.",
  "projects.intro":
    "Cada proyecto con su resultado, mi rol, el stack y un enlace al código o a la demo.",
  "projects.inProgress":
    "En curso: Salud Hub, que junta datos de Garmin, Hevy, Zepp Life y un registro de comidas, con un coach de IA encima que los lee y me escribe primero. Corre en local; publico el repo cuando esté listo.",
  "projects.empty":
    "Las fichas de los proyectos todavía no están publicadas aquí. Mientras tanto, el código está en",
  "projects.year": "Año",
  "projects.status": "Estado",
  "projects.role": "Rol",
  "projects.stack": "Stack",
  "projects.repo": "Código",
  "projects.demo": "Demo",
  "projects.video": "Video",
  "status.done": "terminado",
  "status.mvp": "MVP",
  "status.in-progress": "en curso",
  "research.title": "Investigación",
  "research.description":
    "Tesis de magíster de Manuel Sepúlveda en el CLCERT de la Universidad de Chile, sobre estadísticas de votaciones electrónicas verificables, y formación en ciberseguridad.",
  "research.intro":
    "Mi tesis de magíster en el CLCERT de la Universidad de Chile y formación complementaria en ciberseguridad.",
  "research.institution": "Institución",
  "research.advisors": "Profesores guía",
  "research.status": "Estado",
  "research.year": "Año",
  "research.repo": "Código",
  "research.pdf": "PDF",
  "research.doi": "DOI",
  "about.experience": "Experiencia",
  "about.education": "Formación",
  "about.stack": "Stack",
  "about.stackList":
    "Python, TypeScript, Rust, FastAPI, Next.js, PostgreSQL, Soroban, Docker, Google Cloud",
  "about.offTheClock": "Al margen",
  "about.cvLink": "CV completo",
  "cv.title": "CV",
  "cv.description":
    "CV de Manuel Sepúlveda: experiencia, proyectos, formación, premios y habilidades. Se puede guardar como PDF.",
  "cv.download": "Descargar PDF",
  "cv.hint": "Se descarga con el diálogo de impresión del navegador: elige «Guardar como PDF».",
  "cv.summary": "Perfil",
  "cv.work": "Experiencia",
  "cv.projects": "Proyectos",
  "cv.education": "Educación",
  "cv.awards": "Premios",
  "cv.certificates": "Formación complementaria",
  "cv.skills": "Habilidades",
  "cv.languages": "Idiomas",
  "cv.interests": "Intereses",
  "research.kind.thesis": "Tesis de magíster",
  "research.kind.capsule": "Cápsula de investigación",
  "research.kind.course": "Formación",
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
  "home.description":
    "Software engineer in Santiago, Chile: backend, applied cryptography and security. Projects, research, CV and contact.",
  "home.intro":
    "I build backends and smart contracts where signatures, privacy and data provenance matter.",
  "home.projects": "Projects",
  "home.allProjects": "All projects",
  "home.research": "Research",
  "home.researchLink": "More about the research",
  "home.contact": "Contact",
  "home.updated": "Updated:",
  "contact.email": "Email",
  "contact.location": "Location",
  "contact.availability":
    "I'm looking for work as a backend, full-stack or security engineer, in Santiago, remote or hybrid, preferably on teams that work in English.",
  "projects.title": "Projects",
  "projects.description":
    "Projects by Manuel Sepúlveda: the result, role, stack and a link to the code or demo of each one.",
  "projects.intro":
    "Each project with its result, my role, the stack and a link to the code or demo.",
  "projects.inProgress":
    "In progress: Salud Hub brings together data from Garmin, Hevy, Zepp Life and food logs, with an AI coach on top that reads them and reaches out first. It runs locally; I'll publish the repo when it's ready.",
  "projects.empty":
    "The project write-ups are not published here yet. In the meantime, the code is at",
  "projects.year": "Year",
  "projects.status": "Status",
  "projects.role": "Role",
  "projects.stack": "Stack",
  "projects.repo": "Code",
  "projects.demo": "Demo",
  "projects.video": "Video",
  "status.done": "done",
  "status.mvp": "MVP",
  "status.in-progress": "in progress",
  "research.title": "Research",
  "research.description":
    "Manuel Sepúlveda's master's thesis at CLCERT, Universidad de Chile, on statistics of verifiable electronic votes, and cybersecurity training.",
  "research.intro":
    "My master's thesis at CLCERT, Universidad de Chile, and additional training in cybersecurity.",
  "research.institution": "Institution",
  "research.advisors": "Advisors",
  "research.status": "Status",
  "research.year": "Year",
  "research.repo": "Code",
  "research.pdf": "PDF",
  "research.doi": "DOI",
  "about.experience": "Experience",
  "about.education": "Education",
  "about.stack": "Stack",
  "about.stackList":
    "Python, TypeScript, Rust, FastAPI, Next.js, PostgreSQL, Soroban, Docker, Google Cloud",
  "about.offTheClock": "Off the clock",
  "about.cvLink": "Full CV",
  "cv.title": "CV",
  "cv.description":
    "Manuel Sepúlveda's CV: experience, projects, education, awards and skills. It can be saved as a PDF.",
  "cv.download": "Download PDF",
  "cv.hint": "It downloads through the browser's print dialog: choose “Save as PDF”.",
  "cv.summary": "Summary",
  "cv.work": "Experience",
  "cv.projects": "Projects",
  "cv.education": "Education",
  "cv.awards": "Awards",
  "cv.certificates": "Additional training",
  "cv.skills": "Skills",
  "cv.languages": "Languages",
  "cv.interests": "Interests",
  "research.kind.thesis": "Master's thesis",
  "research.kind.capsule": "Research capsule",
  "research.kind.course": "Training",
} as const satisfies Record<UiKey, string>;

export const ui: Record<Lang, Record<UiKey, string>> = { es, en };

export function t(lang: Lang, key: UiKey): string {
  return ui[lang][key];
}

/** `t` bound to one locale, for components that render many strings. */
export function useTranslations(lang: Lang): (key: UiKey) => string {
  return (key) => t(lang, key);
}
