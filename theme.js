const THEME_STORAGE_KEY = "popupTheme";
const themeMedia = window.matchMedia("(prefers-color-scheme: dark)");
let selectedTheme = "auto";

document.documentElement.classList.add("theme-pending");
applyTheme("auto");

chrome.storage.local.get(THEME_STORAGE_KEY).then((saved) => {
  selectedTheme = ["light", "dark"].includes(saved[THEME_STORAGE_KEY])
    ? saved[THEME_STORAGE_KEY]
    : "auto";
  applyTheme(selectedTheme);
  const selector = document.querySelector("#theme");
  if (selector) selector.value = selectedTheme;
  document.documentElement.classList.remove("theme-pending");
});

themeMedia.addEventListener("change", () => {
  if (selectedTheme === "auto") applyTheme("auto");
});

document.addEventListener("DOMContentLoaded", () => {
  const selector = document.querySelector("#theme");
  selector.value = selectedTheme;
  selector.addEventListener("change", async () => {
    selectedTheme = selector.value;
    applyTheme(selectedTheme);
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: selectedTheme });
  });
});

function applyTheme(theme) {
  const resolved = theme === "auto" ? (themeMedia.matches ? "dark" : "light") : theme;
  document.documentElement.dataset.theme = resolved;
}
