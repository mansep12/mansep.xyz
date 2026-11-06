/** Replaces each [data-email] placeholder with a mailto link. See src/lib/email.ts. */

import { decodeEmail } from "../lib/email";

for (const placeholder of document.querySelectorAll<HTMLElement>("[data-email]")) {
  const encoded = placeholder.dataset.email;
  if (!encoded) continue;
  const address = decodeEmail(encoded);
  const link = document.createElement("a");
  link.href = `mailto:${address}`;
  link.textContent = address;
  placeholder.replaceChildren(link);
}
