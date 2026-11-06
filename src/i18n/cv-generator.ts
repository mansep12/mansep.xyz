/**
 * Copy of the CV generator (form, states, errors, disclosure). Kept apart
 * from ui.ts because it only ships when the generator is enabled; the types
 * still require every key in every locale.
 */

import type { Lang } from "./locales";

const es = {
  disclosure:
    "CV armado por un asistente a partir de datos verificados por mí: el modelo solo eligió y reordenó, no agregó hechos. Versión completa: mansep.xyz/cv",
} as const;

export type CvGeneratorKey = keyof typeof es;

const en = {
  disclosure:
    "CV put together by an assistant from data I verified: the model only selected and reordered, it added no facts. Full version: mansep.xyz/en/cv",
} as const satisfies Record<CvGeneratorKey, string>;

export const cvGeneratorCopy: Record<Lang, Record<CvGeneratorKey, string>> = { es, en };
