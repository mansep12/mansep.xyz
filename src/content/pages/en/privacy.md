---
title: "Privacy"
description: "What data this site uses: no cookies, visits measured in aggregate with Cloudflare Web Analytics, the theme preference stored only in your browser, and what the CV generator sends to Anthropic."
---

This site does not use cookies.

## Visits

I measure visits with Cloudflare Web Analytics, which uses no cookies and keeps no data that could identify you. I only see aggregate numbers, such as page views, referring sites or countries.

The site is hosted on Cloudflare, which processes the technical data of each request, such as the IP address, to deliver the pages and protect them from abuse.

## What is stored in your browser

If you choose the light or dark theme, that preference is stored in your browser's local storage (localStorage) and never leaves it. If you switch back to the system option, it is deleted. The language is not stored: it depends on the page address, with Spanish at the root and English under `/en/`.

## Videos

If a page includes a YouTube video, the player loads only when you click on it. From that moment on, Google's privacy policy applies.

## CV generator

On the CV page you can paste a job posting or describe a role to get a tailored version of the CV. If you use it:

- **What is sent to Anthropic.** The text you paste, the language and focus you pick, and the public data of my CV are sent to Anthropic's API, whose Claude models pick the most relevant achievements. Anthropic does not train its models on what it receives through the API and, under [its API retention policy](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-commercial-api-data), deletes inputs and outputs within 30 days, unless it needs to keep them to enforce its usage policy or to comply with the law. Do not paste personal data about other people.
- **What this site keeps.** The text is not stored. Each use leaves a log entry with the date, the language, a SHA-256 fingerprint of the text (which cannot be read back), the ids of the chosen achievements and the API usage.
- **Daily limit.** To limit uses per day, the site counts requests by a hash of your IP address combined with the date, which changes every day. The IP is not stored, and the counter is deleted when the day ends (UTC).
- **Cloudflare Turnstile.** The form uses Turnstile to check that a person is sending it. It loads only when you start using the form, from `challenges.cloudflare.com`, and Cloudflare processes technical data such as the IP address and the browser only to detect bots, under its [Turnstile privacy policy](https://www.cloudflare.com/turnstile-privacy-policy/).

## Contact
