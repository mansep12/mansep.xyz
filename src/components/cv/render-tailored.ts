/**
 * Renders a tailored resume to an HTML fragment in the Worker, with the same
 * <CvDocument> component the /cv page uses, through Astro's Container API
 * (`experimental_AstroContainer`). The /cv page already ships the
 * component's scoped CSS, so the fragment is styled once inserted there.
 *
 * Script tags are removed: scripts inserted with innerHTML never run, and the
 * Content-Security-Policy only allows the inline scripts of the built pages.
 * The generator script reveals the email address itself.
 */

import { experimental_AstroContainer } from "astro/container";
import type { Lang } from "../../i18n/locales";
import type { TailoredResume } from "../../lib/cv-generator/tailor";
import CvDocument from "./CvDocument.astro";

let container: Promise<experimental_AstroContainer> | undefined;

export function stripScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/giu, "");
}

export async function renderTailoredCv(
  lang: Lang,
  tailored: TailoredResume,
  footnote: string,
): Promise<string> {
  container ??= experimental_AstroContainer.create();
  const html = await (await container).renderToString(CvDocument, {
    props: {
      lang,
      resume: tailored.resume,
      sectionOrder: tailored.sectionOrder,
      showSourceIds: true,
      footnote,
    },
  });
  return stripScripts(html);
}
