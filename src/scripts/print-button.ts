/** Reveals each [data-print] button (hidden without JavaScript) and opens the print dialog on click. */

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-print]")) {
  button.hidden = false;
  button.addEventListener("click", () => window.print());
}
