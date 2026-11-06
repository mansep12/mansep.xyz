/**
 * Client behavior for <ThemeToggle>: cycles system, light and dark, stores
 * the choice and keeps every toggle (and other tabs) in sync. The initial
 * data-theme is set earlier by the inline head script.
 */

import {
  nextThemeChoice,
  parseThemeChoice,
  THEME_STORAGE_KEY,
  type ThemeChoice,
  themeColorFor,
} from "../lib/theme";

const root = document.documentElement;
const buttons = document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]");

const labelKeys = {
  system: "labelSystem",
  light: "labelLight",
  dark: "labelDark",
} as const satisfies Record<ThemeChoice, string>;

function currentChoice(): ThemeChoice {
  return parseThemeChoice(root.dataset.theme);
}

function apply(choice: ThemeChoice): void {
  if (choice === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.dataset.theme = choice;
  }
  // Browser UI color: follow the forced theme, or the system again.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = themeColorFor(choice, meta.media);
  }
}

function persist(choice: ThemeChoice): void {
  try {
    if (choice === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, choice);
    }
  } catch {
    // Storage blocked (private mode, disabled cookies): the choice lasts for this page only.
  }
}

function updateLabels(choice: ThemeChoice): void {
  for (const button of buttons) {
    const label = button.dataset[labelKeys[choice]];
    if (label) {
      button.setAttribute("aria-label", label);
      button.title = label;
    }
  }
}

for (const button of buttons) {
  button.addEventListener("click", () => {
    const next = nextThemeChoice(currentChoice());
    apply(next);
    persist(next);
    updateLabels(next);
  });
}

window.addEventListener("storage", (event) => {
  if (event.key === THEME_STORAGE_KEY) {
    const choice = parseThemeChoice(event.newValue);
    apply(choice);
    updateLabels(choice);
  }
});

updateLabels(currentChoice());
