/**
 * CV generator form (src/components/cv/CvGenerator.astro): character
 * counter, Turnstile loaded on first focus (explicit render), the request to
 * /api/cv with progress states, and the tailored CV shown in place of the
 * full one, ready for the browser's print dialog.
 */

import { type CvGeneratorKey, cvGeneratorCopy } from "../i18n/cv-generator";
import { isLang, type Lang, localeInfo } from "../i18n/locales";
import { LIMITS } from "../lib/cv-generator/config";
import { charCount } from "../lib/cv-generator/request";
import { TURNSTILE_ACTION } from "../lib/cv-generator/turnstile";
import { errorMessageKey, remainingMessageKey } from "../lib/cv-generator/ui";
import { decodeEmail } from "../lib/email";

/**
 * Turns the email placeholders of inserted HTML into links. On the page an
 * inline script next to each placeholder does this (src/lib/email.ts), but
 * scripts in HTML inserted with innerHTML do not run (and the Worker strips
 * them from the fragment).
 */
function revealEmails(root: HTMLElement): void {
  for (const placeholder of root.querySelectorAll<HTMLElement>("[data-email]")) {
    const encoded = placeholder.dataset.email;
    if (!encoded) continue;
    const address = decodeEmail(encoded);
    const link = document.createElement("a");
    link.href = `mailto:${address}`;
    link.textContent = address;
    placeholder.replaceChildren(link);
  }
}

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string | undefined;
  reset(widgetId?: string): void;
  getResponse(widgetId?: string): string | undefined;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const ENDPOINT = "/api/cv";
/** Rough timing of the steps behind one request, for the progress list. */
const STAGE_DELAYS_MS = [0, 3000, 9000];
const REQUEST_TIMEOUT_MS = 120_000;

interface SuccessBody {
  resume: {
    work: { highlights: { id: string; text: string }[] }[];
    projects: { highlights: { id: string; text: string }[] }[];
  };
  rationale: { id: string; reason: string }[];
  items: { id: string; rewritten: boolean }[];
  html: string | null;
  remainingToday: number;
}

/** The first match of `selector` under `root`, typed by the caller; throws if missing. */
function element<T>(root: HTMLElement | Document, selector: string): T {
  const found = root.querySelector(selector) as T | null;
  if (!found) throw new Error(`Missing ${selector}`);
  return found;
}

function init(root: HTMLElement): void {
  const pageLang: Lang = isLang(root.dataset.lang) ? root.dataset.lang : "es";
  const siteKey = root.dataset.siteKey ?? "";
  const copy = cvGeneratorCopy[pageLang];
  const numbers = new Intl.NumberFormat(localeInfo[pageLang].tag);

  const form = element<HTMLFormElement>(root, "[data-cvgen-form]");
  const textarea = element<HTMLTextAreaElement>(root, "[data-cvgen-job]");
  const count = element<HTMLElement>(root, "[data-cvgen-count]");
  const langSelect = element<HTMLSelectElement>(root, "[data-cvgen-lang]");
  const submit = element<HTMLButtonElement>(root, "[data-cvgen-submit]");
  const turnstileBox = element<HTMLElement>(root, "[data-cvgen-turnstile]");
  const stages = element<HTMLOListElement>(root, "[data-cvgen-stages]");
  const status = element<HTMLElement>(root, "[data-cvgen-status]");
  const errorBox = element<HTMLElement>(root, "[data-cvgen-error]");
  const result = element<HTMLElement>(root, "[data-cvgen-result]");
  const resultTitle = element<HTMLElement>(root, "#cvgen-result-title");
  const preview = element<HTMLElement>(root, "[data-cvgen-preview]");
  const why = element<HTMLOListElement>(root, "[data-cvgen-why]");
  const remaining = element<HTMLElement>(root, "[data-cvgen-remaining]");
  const fullCv = document.querySelector<HTMLElement>("[data-cv-full]");

  root.hidden = false;

  // Character counter.
  const updateCount = () => {
    const n = charCount(textarea.value.trim());
    count.textContent = copy.counter
      .replace("{n}", numbers.format(n))
      .replace("{max}", numbers.format(LIMITS.jobTextMaxChars));
    count.classList.toggle("over", n > LIMITS.jobTextMaxChars);
  };
  textarea.addEventListener("input", updateCount);
  updateCount();

  // Turnstile, loaded and rendered the first time the form gets focus.
  let widgetId: string | undefined;
  let loading: Promise<void> | undefined;
  const loadScript = () => {
    loading ??= new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TURNSTILE_SRC;
      script.async = true;
      script.addEventListener("load", () => resolve());
      script.addEventListener("error", () => reject(new Error("Turnstile failed to load")));
      document.head.appendChild(script);
    });
    return loading;
  };
  const ensureWidget = async (): Promise<boolean> => {
    if (widgetId !== undefined) return true;
    try {
      await loadScript();
    } catch {
      return false;
    }
    if (widgetId !== undefined) return true;
    const theme = document.documentElement.dataset.theme;
    widgetId = window.turnstile?.render(turnstileBox, {
      sitekey: siteKey,
      action: TURNSTILE_ACTION,
      language: pageLang,
      theme: theme === "light" || theme === "dark" ? theme : "auto",
      size: "flexible",
      callback: () => {
        if (errorBox.textContent === copy.verification) errorBox.textContent = "";
      },
      "expired-callback": () => window.turnstile?.reset(widgetId),
    });
    return widgetId !== undefined;
  };
  form.addEventListener("focusin", () => void ensureWidget(), { once: true });

  // Progress states.
  let timers: ReturnType<typeof setTimeout>[] = [];
  const items = [...stages.querySelectorAll("li")];
  const showStage = (index: number) => {
    items.forEach((item, i) => {
      if (i < index) item.dataset.state = "done";
      else delete item.dataset.state;
      if (i === index) item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
    });
    status.textContent = items[index]?.textContent ?? "";
  };
  const startStages = () => {
    stages.hidden = false;
    timers = STAGE_DELAYS_MS.map((delay, index) => setTimeout(() => showStage(index), delay));
  };
  const stopStages = () => {
    for (const timer of timers) clearTimeout(timer);
    stages.hidden = true;
  };

  const showError = (key: CvGeneratorKey, focus?: HTMLElement) => {
    status.textContent = "";
    errorBox.textContent = copy[key];
    focus?.focus();
  };

  const setBusy = (busy: boolean) => {
    submit.disabled = busy;
    form.setAttribute("aria-busy", String(busy));
  };

  const remainingText = (n: number) =>
    copy[remainingMessageKey(n)].replace("{n}", numbers.format(n));

  const showResult = (body: SuccessBody) => {
    preview.innerHTML = body.html ?? "";
    revealEmails(preview);

    const texts = new Map(
      [...body.resume.work, ...body.resume.projects].flatMap((entry) =>
        entry.highlights.map((highlight) => [highlight.id, highlight.text] as const),
      ),
    );
    const reasons = new Map(body.rationale.map((entry) => [entry.id, entry.reason]));
    why.replaceChildren(
      ...body.items.map((item) => {
        const li = document.createElement("li");
        const reason = document.createElement("p");
        reason.textContent = reasons.get(item.id) ?? copy.noReason;
        const ref = document.createElement("p");
        ref.className = "why-ref";
        ref.textContent = `${item.id} · ${item.rewritten ? copy.rewritten : copy.original}`;
        const text = document.createElement("p");
        text.textContent = texts.get(item.id) ?? "";
        li.replaceChildren(reason, text, ref);
        return li;
      }),
    );

    remaining.textContent = remainingText(body.remainingToday);
    result.hidden = false;
    if (fullCv) fullCv.hidden = true;
    status.textContent = copy.done;
    resultTitle.focus();
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    errorBox.textContent = "";

    const n = charCount(textarea.value.trim());
    if (n < LIMITS.jobTextMinChars) return showError("error.tooShort", textarea);
    if (n > LIMITS.jobTextMaxChars) return showError("error.tooLong", textarea);

    if (!(await ensureWidget())) return showError("error.turnstile");
    const token = window.turnstile?.getResponse(widgetId);
    if (!token) return showError("verification");

    const focus = [...form.querySelectorAll<HTMLInputElement>('input[name="focus"]:checked')].map(
      (input) => input.value,
    );
    setBusy(true);
    startStages();
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lang: langSelect.value,
          jobText: textarea.value,
          focus,
          turnstileToken: token,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      stopStages();
      if (!response.ok || typeof body.html !== "string") {
        showError(response.ok ? "error.generic" : errorMessageKey(response.status, body));
      } else {
        showResult(body as unknown as SuccessBody);
      }
    } catch {
      stopStages();
      showError("error.generic");
    } finally {
      setBusy(false);
      // Tokens are single use: get a fresh one for the next request.
      window.turnstile?.reset(widgetId);
    }
  });

  element<HTMLButtonElement>(root, "[data-cvgen-print]").addEventListener("click", () =>
    window.print(),
  );
  element<HTMLButtonElement>(root, "[data-cvgen-full]").addEventListener("click", () => {
    result.hidden = true;
    status.textContent = "";
    if (fullCv) {
      fullCv.hidden = false;
      fullCv.focus();
    }
  });
}

const root = document.querySelector<HTMLElement>("[data-cv-generator]");
if (root) init(root);
