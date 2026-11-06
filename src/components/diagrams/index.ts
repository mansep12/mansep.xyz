/**
 * Architecture diagram per project slug. The project page renders it at the
 * end of the body's "Architecture" section, so the Markdown can refer to
 * "the diagram below".
 */

import NodusDiagram from "./NodusDiagram.astro";
import PasswordManagerDiagram from "./PasswordManagerDiagram.astro";
import PulsoFiscalDiagram from "./PulsoFiscalDiagram.astro";
import PulsoUrbanoDiagram from "./PulsoUrbanoDiagram.astro";

export type DiagramComponent = typeof NodusDiagram;

const diagrams: Readonly<Record<string, DiagramComponent>> = {
  nodus: NodusDiagram,
  "pulso-fiscal": PulsoFiscalDiagram,
  "pulso-urbano": PulsoUrbanoDiagram,
  "password-manager": PasswordManagerDiagram,
};

export function diagramFor(slug: string): DiagramComponent | undefined {
  return diagrams[slug];
}
