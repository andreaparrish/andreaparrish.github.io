// ---------- tiny storage helper ----------
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* ignore quota errors for now */ }
  },
};

// ---------- keys ----------
const TASKS_KEY = "bp:tasks";
const THEME_KEY = "bp:theme";
const JOURNAL_KEY = "bp:journal";

// ---------- load state ----------
let tasks = store.get(TASKS_KEY, []);
let journalEntries = store.get(JOURNAL_KEY, []);
let theme = store.get(THEME_KEY, ""); // '' = light (no class)

// Apply saved theme (if any)
if (theme) document.documentElement.classList.add(theme);

// ---------- dom refs ----------
const listEl = document.getElementById("taskList");
const formEl = document.getElementById("taskForm");
const journalFormEl = document.getElementById("journalForm");
const textEl = document.getElementById("taskText");
const catEl = document.getElementById("taskCat");
const toggleEl = document.getElementById("themeToggle");

// Dashboard count elements
const personalCountEl = document.getElementById("personal-count");
const schoolCountEl = document.getElementById("school-count");
const workCountEl = document.getElementById("work-count");
const journalCountEl = document.getElementById("journal-count");

// ---------- utils ----------
const makeId = () =>
  (crypto?.randomUUID?.()) ||
  "t-" + Math.random().toString(36).slice(2) + Date.now();

// simple escape to keep user-entered text safe in HTML
const escapeHTML = (s = "") =>
  s.replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));

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

// ---------- dashboard updates ----------
function updateDashboardCounts() {
  if (personalCountEl) {
    const n = tasks.filter(t => t.category === "Personal" && !t.done).length;
    personalCountEl.textContent = `${n} ${n === 1 ? "task" : "tasks"}`;
  }
  if (schoolCountEl) {
    const n = tasks.filter(t => t.category === "School" && !t.done).length;
    schoolCountEl.textContent = `${n} ${n === 1 ? "task" : "tasks"}`;
  }
  if (workCountEl) {
    const n = tasks.filter(t => t.category === "Work" && !t.done).length;
    workCountEl.textContent = `${n} ${n === 1 ? "task" : "tasks"}`;
  }
  if (journalCountEl) {
    const n = journalEntries.length;
    journalCountEl.textContent = `${n} ${n === 1 ? "entry" : "entries"}`;
  }
}

// ---------- task rendering ----------
function renderTasks(filterCategory = null) {
  if (!listEl) return;

  const filtered = filterCategory
    ? tasks.filter(t => t.category === filterCategory)
    : tasks.slice(-5); // show last 5 on dashboard

  listEl.innerHTML = filtered.map(t => {
    const cid = `task-${t.id}`;
    return `
      <li data-id="${t.id}" class="task-item ${t.done ? "completed" : ""}">
        <input id="${cid}" type="checkbox" ${t.done ? "checked" : ""} class="t-done">
        <label for="${cid}"><strong>[${escapeHTML(t.category)}]</strong> ${escapeHTML(t.text)}</label>
        <button class="t-remove" type="button" aria-label="Remove task: ${escapeHTML(t.text)}">×</button>
      </li>
    `;
  }).join("");
}

// ---------- journal rendering ----------
function renderJournal() {
  const entriesEl = document.getElementById("journalEntries");
  if (!entriesEl) return;

  entriesEl.innerHTML = journalEntries
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(entry => `
      <div class="journal-entry">
        <h4>${new Date(entry.date).toLocaleDateString()}</h4>
        <p>${escapeHTML(entry.text)}</p>
      </div>
    `)
    .join("");
}

// ---------- render everything ----------
function render() {
  // pick category by page
  const path = window.location.pathname;
  let filterCategory = null;
  if (path.includes("personal.html")) filterCategory = "Personal";
  else if (path.includes("school.html")) filterCategory = "School";
  else if (path.includes("work.html")) filterCategory = "Work";

  renderTasks(filterCategory);
  renderJournal();
  updateDashboardCounts();
}
render();

// ---------- events ----------
if (formEl) {
  formEl.addEventListener("submit", e => {
    e.preventDefault();
    const text = (textEl?.value || "").trim();
    if (!text) return;

    const task = {
      id: makeId(),
      text,
      category: catEl?.value || "Personal",
      done: false,
      createdAt: Date.now(),
    };
    tasks.push(task);
    store.set(TASKS_KEY, tasks);

    if (textEl) textEl.value = "";
    render();
  });
}

if (journalFormEl) {
  journalFormEl.addEventListener("submit", e => {
    e.preventDefault();
    const date = document.getElementById("journalDate")?.value;
    const text = document.getElementById("journalText")?.value?.trim();
    if (!date || !text) return;

    journalEntries.push({
      id: makeId(),
      date,
      text,
      createdAt: Date.now(),
    });
    store.set(JOURNAL_KEY, journalEntries);

    journalFormEl.reset();
    const dateEl = document.getElementById("journalDate");
    if (dateEl) dateEl.value = new Date().toISOString().split("T")[0];

    render();
  });
}

// delegate remove clicks
if (listEl) {
  listEl.addEventListener("click", e => {
    const btn = e.target.closest(".t-remove");
    if (!btn) return;
    const li = btn.closest("li");
    if (!li) return;
    const id = li.getAttribute("data-id");
    tasks = tasks.filter(t => t.id !== id);
    store.set(TASKS_KEY, tasks);
    render();
  });
  // use change for checkboxes
  listEl.addEventListener("change", e => {
    if (!e.target.classList.contains("t-done")) return;
    const li = e.target.closest("li");
    if (!li) return;
    const id = li.getAttribute("data-id");
    const checked = e.target.checked;
    tasks = tasks.map(t => (t.id === id ? { ...t, done: checked } : t));
    store.set(TASKS_KEY, tasks);
    render();
  });
}

// ---------- theme toggle (single listener + ARIA sync) ----------
if (toggleEl) {
  const initialDark = document.documentElement.classList.contains("theme-dark-a");
  toggleEl.setAttribute("aria-pressed", initialDark ? "true" : "false");

  toggleEl.addEventListener("click", () => {
    const nowDark = document.documentElement.classList.toggle("theme-dark-a");
    store.set(THEME_KEY, nowDark ? "theme-dark-a" : "");
    toggleEl.setAttribute("aria-pressed", nowDark ? "true" : "false");
    updateThemeColor();
  });
}

// ---------- nav highlighting across pages ----------
document.querySelectorAll(".main-nav a").forEach(a => {
  const href = a.getAttribute("href");
  const here = location.pathname.split("/").pop() || "index.html";
  const isCurrent = href === here;
  a.classList.toggle("active", isCurrent);
  a.toggleAttribute("aria-current", isCurrent);
});

// Clear all data functionality
const clearDataBtn = document.getElementById('clearDataBtn');
if (clearDataBtn) {
  clearDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      // Clear localStorage
      localStorage.removeItem('bp:tasks');
      localStorage.removeItem('bp:journal');
      localStorage.removeItem('bp:theme');
      
      // Reset variables
      tasks = [];
      journalEntries = [];
      theme = '';
      
      // Remove theme class
      document.documentElement.classList.remove('theme-dark-a');
      
      // Re-render
      render();
      
      // Show success message
      alert('All data has been cleared.');
    }
  });
}

// Set today's date as default for journal
const dateEl = document.getElementById("journalDate");
if (dateEl) dateEl.value = new Date().toISOString().split("T")[0];

// Optional: expose for quick console debugging
window.BP = { tasks, render, store };
