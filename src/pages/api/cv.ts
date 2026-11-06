/**
 * POST /api/cv: tailors the CV to a job description. The only route that
 * runs on demand; every page stays prerendered. The logic lives in
 * src/lib/cv-generator/handler.ts; this file wires the Worker environment.
 */

import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { renderTailoredCv } from "../../components/cv/render-tailored";
import { loadResumes, type Resume } from "../../data/resume.schema";
import { CV_BUDGET_INSTANCE } from "../../durable-objects/cv-budget";
import { cvGeneratorCopy } from "../../i18n/cv-generator";
import type { Lang } from "../../i18n/locales";
import { createCvModelClient } from "../../lib/cv-generator/client";
import { readGeneratorConfig } from "../../lib/cv-generator/env";
import { handleCvRequest } from "../../lib/cv-generator/handler";

export const prerender = false;

let resumes: Record<Lang, Resume> | undefined;

export const ALL: APIRoute = ({ request }) => {
  const config = readGeneratorConfig(env as unknown as Record<string, unknown>);
  resumes ??= loadResumes();
  return handleCvRequest(request, {
    config,
    resumes,
    budget: { consume: (input) => env.CV_BUDGET.getByName(CV_BUDGET_INSTANCE).consume(input) },
    createModels: () =>
      createCvModelClient({ apiKey: config.anthropicApiKey, baseURL: config.anthropicBaseUrl }),
    render: (lang, tailored) => renderTailoredCv(lang, tailored, cvGeneratorCopy[lang].disclosure),
    clientIp: request.headers.get("cf-connecting-ip") ?? "unknown",
  });
};
