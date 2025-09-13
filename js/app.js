// ---------- tiny storage helper ----------
const store = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota errors for now */
    }
  },
};

// ---------- keys ----------
const TASKS_KEY = "bp:tasks";
const THEME_KEY = "bp:theme";

// ---------- load state ----------
let tasks = store.get(TASKS_KEY, []);
let theme = store.get(THEME_KEY, ""); // '' = light (no class)

// Apply saved theme (if any)
if (theme) document.documentElement.classList.add(theme);

// ---------- dom refs (may be null on some pages) ----------
const listEl = document.getElementById("taskList");
const formEl = document.getElementById("taskForm");
const textEl = document.getElementById("taskText");
const catEl = document.getElementById("taskCat");
const toggleEl = document.getElementById("themeToggle");

// ---------- utils ----------
const makeId = () =>
  crypto?.randomUUID?.() ||
  "t-" + Math.random().toString(36).slice(2) + Date.now();

// Ensure there is a theme-color meta, return it
function ensureThemeMeta() {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  return meta;
}

// Update theme-color to match the CSS --bg variable
function updateThemeColor() {
  const meta = ensureThemeMeta();
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg")
    .trim();
  meta.setAttribute("content", bg || "#fafafa");
}
updateThemeColor();

// ---------- render ----------
function render() {
  if (!listEl) return;
  listEl.innerHTML = tasks
    .map((t) => {
      const cid = `task-${t.id}`;
      return `
      <li data-id="${t.id}">
        <input id="${cid}" type="checkbox" ${
        t.done ? "checked" : ""
      } class="t-done">
        <label for="${cid}"><strong>[${t.category}]</strong> ${t.text}</label>
        <button class="t-remove" type="button" aria-label="Remove task: ${
          t.text
        }">×</button>
      </li>
    `;
    })
    .join("");
}
render();

// ---------- events ----------
if (formEl) {
  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = (textEl?.value || "").trim();
    if (!text) return;

    const task = {
      id: makeId(),
      text,
      category: catEl?.value || "Home",
      done: false,
      createdAt: Date.now(),
    };
    tasks.push(task);
    store.set(TASKS_KEY, tasks);

    if (textEl) textEl.value = "";
    render();
  });
}

if (listEl) {
  listEl.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const id = li.getAttribute("data-id");

    if (e.target.classList.contains("t-remove")) {
      tasks = tasks.filter((t) => t.id !== id);
      store.set(TASKS_KEY, tasks);
      render();
      return;
    }

    if (e.target.classList.contains("t-done")) {
      const checked = e.target.checked;
      tasks = tasks.map((t) => (t.id === id ? { ...t, done: checked } : t));
      store.set(TASKS_KEY, tasks);
      // No need to fully re-render; but safe & simple for now:
      render();
    }
  });
}

// Single theme toggle listener (kept)
if (toggleEl) {
  toggleEl.addEventListener("click", () => {
    const html = document.documentElement;
    const isDark = html.classList.toggle("theme-dark-a");
    store.set(THEME_KEY, isDark ? "theme-dark-a" : "");
    updateThemeColor();
  });
}

// Optional: expose for quick console debugging
window.BP = { tasks, render, store };
