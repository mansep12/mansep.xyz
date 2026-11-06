/**
 * Copy of the CV generator (form, states, errors, disclosure). Kept apart
 * from ui.ts because it only ships when the generator is enabled; the types
 * still require every key in every locale. `{n}` and `{max}` are filled in
 * by the form script.
 */

import type { Lang } from "./locales";

const es = {
  disclosure:
    "CV armado por un asistente a partir de datos verificados por mí: el modelo solo eligió y reordenó, no agregó hechos. Versión completa: mansep.xyz/cv",
  title: "Adaptar este CV a una oferta",
  how1: "Pegas una oferta o describes el rol, y Claude, un modelo de Anthropic, elige de este CV los logros que mejor calzan.",
  how2: "Solo puede citar logros que verifiqué, por su identificador. Un validador descarta cualquier cifra, nombre o tecnología que no esté en el original.",
  how3: "Nombre, contacto, fechas, empresas y enlaces salen siempre de mis datos, nunca del modelo.",
  code: "Ver el código",
  jobLabel: "Oferta o descripción del rol",
  jobHint:
    "Sirve la oferta completa o unas líneas, como «backend con Python para una fintech». Máximo 6000 caracteres.",
  counter: "{n} de {max} caracteres",
  langLabel: "Idioma del CV",
  focusLegend: "Foco (opcional)",
  "focus.backend": "Backend",
  "focus.security": "Seguridad y criptografía",
  "focus.fullstack": "Full-stack",
  "focus.research": "Investigación",
  privacy: "El texto se envía a Anthropic para armar el CV y este sitio no lo guarda.",
  privacyLink: "Más en Privacidad",
  submit: "Armar CV",
  stage1: "Leyendo la oferta",
  stage2: "Eligiendo lo relevante",
  stage3: "Armando el CV",
  progressLabel: "Avance",
  verification: "Antes de enviar, espera a que termine la verificación de Cloudflare.",
  done: "Listo: el CV adaptado está abajo.",
  resultTitle: "CV adaptado a la oferta",
  print: "Guardar como PDF",
  full: "Prefiero el CV completo",
  why: "Por qué estos ítems",
  rewritten: "reformulado",
  original: "texto original",
  noReason: "Sin explicación del modelo.",
  remaining: "Te quedan {n} intentos hoy.",
  remainingOne: "Te queda 1 intento hoy.",
  remainingNone: "Ya no te quedan intentos hoy.",
  "error.tooShort": "Escribe al menos 30 caracteres sobre el rol.",
  "error.tooLong": "El texto supera los 6000 caracteres. Recórtalo y vuelve a intentar.",
  "error.disabled": "El generador está en pausa. Mientras tanto, el CV completo está abajo.",
  "error.clientLimit": "Ya usaste tus intentos de hoy. Vuelve mañana o usa el CV completo.",
  "error.dailyLimit": "El generador llegó a su límite de hoy. Vuelve mañana o usa el CV completo.",
  "error.turnstile":
    "No se pudo verificar que eres una persona. Recarga la página e intenta de nuevo.",
  "error.notJob":
    "Eso no parece una oferta ni la descripción de un rol. Pega la oferta o describe el puesto en unas líneas.",
  "error.rejected":
    "El texto trae instrucciones para un modelo, así que no lo procesé. Pega solo la oferta.",
  "error.declined": "El modelo no procesó esta oferta. Prueba con otra descripción del rol.",
  "error.generic": "Algo falló al armar el CV. Intenta de nuevo en un rato o usa el CV completo.",
} as const;

export type CvGeneratorKey = keyof typeof es;

const en = {
  disclosure:
    "CV put together by an assistant from data I verified: the model only selected and reordered, it added no facts. Full version: mansep.xyz/en/cv",
  title: "Tailor this CV to a job posting",
  how1: "You paste a job posting or describe the role, and Claude, a model by Anthropic, picks the achievements from this CV that fit it best.",
  how2: "It can only cite achievements I verified, by their id. A validator throws out any number, name or technology that is not in the original.",
  how3: "Name, contact details, dates, employers and links always come from my data, never from the model.",
  code: "See the code",
  jobLabel: "Job posting or role description",
  jobHint:
    "A full posting works, and so do a few lines such as “Python backend for a fintech”. Up to 6,000 characters.",
  counter: "{n} of {max} characters",
  langLabel: "CV language",
  focusLegend: "Focus (optional)",
  "focus.backend": "Backend",
  "focus.security": "Security and cryptography",
  "focus.fullstack": "Full-stack",
  "focus.research": "Research",
  privacy: "The text is sent to Anthropic to put the CV together, and this site does not store it.",
  privacyLink: "More in Privacy",
  submit: "Tailor CV",
  stage1: "Reading the posting",
  stage2: "Picking what’s relevant",
  stage3: "Putting the CV together",
  progressLabel: "Progress",
  verification: "Before sending, wait for the Cloudflare check to finish.",
  done: "Done: the tailored CV is below.",
  resultTitle: "CV tailored to the posting",
  print: "Save as PDF",
  full: "I’d rather see the full CV",
  why: "Why these items",
  rewritten: "rephrased",
  original: "original text",
  noReason: "No explanation from the model.",
  remaining: "You have {n} tries left today.",
  remainingOne: "You have 1 try left today.",
  remainingNone: "You have no tries left today.",
  "error.tooShort": "Write at least 30 characters about the role.",
  "error.tooLong": "The text is over 6,000 characters. Trim it and try again.",
  "error.disabled": "The generator is paused. In the meantime, the full CV is below.",
  "error.clientLimit": "You have used today’s tries. Come back tomorrow or use the full CV.",
  "error.dailyLimit": "The generator reached today’s limit. Come back tomorrow or use the full CV.",
  "error.turnstile": "We could not verify that you are a person. Reload the page and try again.",
  "error.notJob":
    "That does not look like a job posting or a role description. Paste the posting or describe the position in a few lines.",
  "error.rejected":
    "The text carries instructions for a model, so I did not process it. Paste only the posting.",
  "error.declined": "The model did not process this posting. Try another description of the role.",
  "error.generic":
    "Something went wrong while putting the CV together. Try again later or use the full CV.",
} as const satisfies Record<CvGeneratorKey, string>;

export const cvGeneratorCopy: Record<Lang, Record<CvGeneratorKey, string>> = { es, en };
