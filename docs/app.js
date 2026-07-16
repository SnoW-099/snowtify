const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const toast = document.querySelector("#toast");
const searchInput = document.querySelector("#docs-search");
const sections = [...document.querySelectorAll(".searchable")];

function renderIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function setTheme(theme) {
  root.classList.toggle("light", theme === "light");
  localStorage.setItem("snowtify-theme", theme);
  themeToggle.innerHTML = `<i data-lucide="${theme === "light" ? "moon" : "sun"}"></i>`;
  themeToggle.setAttribute("aria-label", theme === "light" ? "Usar tema oscuro" : "Usar tema claro");
  renderIcons();
}

async function copyText(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  await navigator.clipboard.writeText(target.textContent.trim());
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1600);
}

document.addEventListener("click", (event) => {
  const copyButton = event.target.closest("[data-copy-target]");
  if (copyButton) copyText(copyButton.dataset.copyTarget);
});

themeToggle.addEventListener("click", () => {
  setTheme(root.classList.contains("light") ? "dark" : "light");
});

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLocaleLowerCase("es");
  let visible = 0;
  sections.forEach((section) => {
    const content = `${section.dataset.search || ""} ${section.textContent}`.toLocaleLowerCase("es");
    const match = !query || content.includes(query);
    section.hidden = !match;
    if (match) visible += 1;
  });
  document.querySelector(".no-results").hidden = visible !== 0;
});

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (!visible) return;
    document.querySelectorAll(".sidebar nav a").forEach((link) => {
      link.classList.toggle("active", link.hash === `#${visible.target.id}`);
    });
  },
  { rootMargin: "-15% 0px -70%", threshold: 0 },
);

sections.forEach((section) => sectionObserver.observe(section));
setTheme(localStorage.getItem("snowtify-theme") || "dark");
window.addEventListener("load", renderIcons);
