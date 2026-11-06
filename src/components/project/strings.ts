/**
 * UI strings for project case study pages. Kept next to the components that
 * use them; page prose lives in src/content/projects.
 */

import type { Lang } from "../../i18n/locales";
import type { ProjectStatus } from "../../lib/content/schemas";

export interface ProjectStrings {
  readonly status: Record<ProjectStatus, string>;
  readonly backToProjects: string;
  readonly factsLabel: string;
  readonly team: (size: number) => string;
  readonly solo: string;
  readonly hours: (hours: number) => string;
  readonly myPart: string;
  readonly role: string;
  readonly event: string;
  readonly stack: string;
  readonly license: string;
  readonly links: string;
  readonly repo: string;
  readonly demo: string;
  readonly video: string;
  /** Text of the Markdown heading the diagram goes under. */
  readonly architectureHeading: string;
  /** Text of the Markdown heading rendered as the verification block. */
  readonly verifyHeading: string;
  readonly playVideo: (title: string) => string;
  /** Accessible title of the embedded player. */
  readonly videoTitle: (title: string) => string;
  readonly videoCaption: string;
  readonly watchOnYouTube: string;
}

const es: ProjectStrings = {
  status: { done: "Terminado", mvp: "MVP", "in-progress": "En curso" },
  backToProjects: "Todos los proyectos",
  factsLabel: "Ficha del proyecto",
  team: (size) => `Equipo de ${size}`,
  solo: "Proyecto individual",
  hours: (hours) => `${hours} horas`,
  myPart: "Mi parte",
  role: "Rol",
  event: "Evento",
  stack: "Stack",
  license: "Licencia",
  links: "Enlaces",
  repo: "Repositorio",
  demo: "Demo",
  video: "Video",
  architectureHeading: "Arquitectura",
  verifyHeading: "Cómo verificar esto",
  playVideo: (title) => `Reproducir el video de ${title} (se carga desde YouTube)`,
  videoTitle: (title) => `Video de ${title}`,
  videoCaption:
    "El video se carga desde youtube-nocookie.com solo cuando lo reproduces; antes no se contacta a YouTube.",
  watchOnYouTube: "Ver en YouTube",
};

const en: ProjectStrings = {
  status: { done: "Done", mvp: "MVP", "in-progress": "In progress" },
  backToProjects: "All projects",
  factsLabel: "Project facts",
  team: (size) => `Team of ${size}`,
  solo: "Solo project",
  hours: (hours) => `${hours} hours`,
  myPart: "My part",
  role: "Role",
  event: "Event",
  stack: "Stack",
  license: "License",
  links: "Links",
  repo: "Repository",
  demo: "Demo",
  video: "Video",
  architectureHeading: "Architecture",
  verifyHeading: "How to verify this",
  playVideo: (title) => `Play the ${title} video (loads from YouTube)`,
  videoTitle: (title) => `${title} video`,
  videoCaption:
    "The video loads from youtube-nocookie.com only when you play it; YouTube is not contacted before that.",
  watchOnYouTube: "Watch on YouTube",
};

export const projectStrings: Record<Lang, ProjectStrings> = { es, en };
