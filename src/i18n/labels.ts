/** UI string keys for enum values stored in content frontmatter. */

import type { ProjectStatus, ResearchKind } from "../lib/content/schemas";
import type { UiKey } from "./ui";

export const projectStatusLabels = {
  done: "status.done",
  mvp: "status.mvp",
  "in-progress": "status.in-progress",
  paused: "status.paused",
} as const satisfies Record<ProjectStatus, UiKey>;

export const researchKindLabels = {
  thesis: "research.kind.thesis",
  capsule: "research.kind.capsule",
  course: "research.kind.course",
} as const satisfies Record<ResearchKind, UiKey>;
