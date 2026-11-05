// SPDX-License-Identifier: AGPL-3.0-only
const exchange = document.querySelector("#invitation-exchange");
if (exchange && location.hash.length > 1) {
  const credential = location.hash.slice(1);
  history.replaceState(null, "", location.pathname);
  document.querySelector("#invitation-token").value = credential;
  exchange.requestSubmit();
}
for (const image of document.querySelectorAll("img")) {
  const showFallback = () => {
    image.hidden = true;
    const fallback = image.parentElement.querySelector(".image-fallback");
    if (fallback) fallback.hidden = false;
  };
  image.addEventListener("error", showFallback);
  // Failed images can finish before this deferred enhancement script runs.
  if (image.complete && image.naturalWidth === 0) showFallback();
}
const clock = document.querySelector("[data-elapsed]");
if (clock) {
  const start = Date.now();
  const elapsed = Number(clock.dataset.elapsed);
  const render = () => {
    const ms =
      elapsed + (clock.dataset.running === "true" ? Date.now() - start : 0);
    clock.textContent =
      Math.floor(ms / 60000)
        .toString()
        .padStart(2, "0") +
      ":" +
      Math.floor((ms / 1000) % 60)
        .toString()
        .padStart(2, "0");
  };
  render();
  setInterval(render, 1000);
}
for (const button of document.querySelectorAll("[data-print]"))
  button.addEventListener("click", () => window.print());
const connection = document.querySelector("#connection");
const updateConnection = () => {
  if (connection) {
    connection.hidden = navigator.onLine;
    if (!navigator.onLine)
      connection.querySelector("span").textContent =
        "You are offline. Your last confirmed progress is saved. Reconnect before continuing.";
  }
};
window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);
updateConnection();
// A history traversal must revalidate access; never restore a privileged DOM from bfcache.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});

// Native forms remain usable without JavaScript. Never queue or replay offline actions.
for (const form of document.querySelectorAll('form[method="post"]')) {
  form.addEventListener("submit", (event) => {
    if (!navigator.onLine) {
      event.preventDefault();
      updateConnection();
      return;
    }
    if (form.dataset.submitting) {
      event.preventDefault();
      return;
    }
    form.dataset.submitting = "true";
    document.querySelector("#activity").textContent =
      "Saving. Wait for confirmation.";
    for (const button of form.querySelectorAll("button"))
      button.disabled = true;
  });
}
if (location.hash === "#moment") document.querySelector("#moment")?.focus();
window.addEventListener("online", () => {
  if (connection) {
    connection.hidden = false;
    connection.querySelector("span").textContent =
      "Connection restored. Reload your saved state before continuing.";
  }
});
