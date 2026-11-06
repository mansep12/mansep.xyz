/**
 * Click-to-load YouTube player. The page ships only a local poster and a
 * button; the iframe (and every request to YouTube) is created on click.
 */

const EMBED_ORIGIN = "https://www.youtube-nocookie.com";
const VIDEO_ID = /^[\w-]{11}$/;

function play(frame: HTMLElement): void {
  const id = frame.dataset.videoId ?? "";
  if (!VIDEO_ID.test(id)) return;
  const iframe = document.createElement("iframe");
  iframe.src = `${EMBED_ORIGIN}/embed/${id}?autoplay=1&rel=0`;
  iframe.title = frame.dataset.videoTitle ?? "";
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  frame.replaceChildren(iframe);
  iframe.focus();
}

for (const frame of document.querySelectorAll<HTMLElement>("[data-video-facade]")) {
  const button = frame.querySelector("button");
  if (!button) continue;
  button.addEventListener("click", () => play(frame), { once: true });
  frame.dataset.ready = "";
}
