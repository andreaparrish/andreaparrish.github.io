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

// ---------- dashboard updates ----------
function updateDashboardCounts() {
  if (personalCountEl) {
    const personalTasks = tasks.filter(t => t.category === "Personal" && !t.done).length;
    personalCountEl.textContent = `${personalTasks} ${personalTasks === 1 ? 'task' : 'tasks'}`;
  }
  if (schoolCountEl) {
    const schoolTasks = tasks.filter(t => t.category === "School" && !t.done).length;
    schoolCountEl.textContent = `${schoolTasks} ${schoolTasks === 1 ? 'task' : 'tasks'}`;
  }
  if (workCountEl) {
    const workTasks = tasks.filter(t => t.category === "Work" && !t.done).length;
    workCountEl.textContent = `${workTasks} ${workTasks === 1 ? 'task' : 'tasks'}`;
  }
  if (journalCountEl) {
    const today = new Date().toDateString();
    const todayEntries = journalEntries.filter(e => new Date(e.date).toDateString() === today).length;
    journalCountEl.textContent = `${journalEntries.length} ${journalEntries.length === 1 ? 'entry' : 'entries'}`;
  }
}

// ---------- task rendering ----------
function renderTasks(filterCategory = null) {
  if (!listEl) return;
  
  const filteredTasks = filterCategory ? 
    tasks.filter(t => t.category === filterCategory) : 
    tasks.slice(-5); // Show last 5 on dashboard
  
  listEl.innerHTML = filteredTasks
    .map((t) => {
      const cid = `task-${t.id}`;
      return `
      <li data-id="${t.id}" class="task-item ${t.done ? 'completed' : ''}">
        <input id="${cid}" type="checkbox" ${t.done ? "checked" : ""} class="t-done">
        <label for="${cid}"><strong>[${t.category}]</strong> ${t.text}</label>
        <button class="t-remove" type="button" aria-label="Remove task: ${t.text}">×</button>
      </li>
    `;
    })
    .join("");
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
        <p>${entry.text}</p>
      </div>
    `)
    .join("");
}

// ---------- render everything ----------
function render() {
  // Determine current page and filter
  const path = window.location.pathname;
  let filterCategory = null;
  
  if (path.includes('personal.html')) filterCategory = 'Personal';
  else if (path.includes('school.html')) filterCategory = 'School';
  else if (path.includes('work.html')) filterCategory = 'Work';
  
  renderTasks(filterCategory);
  renderJournal();
  updateDashboardCounts();
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
  journalFormEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const date = document.getElementById("journalDate")?.value;
    const text = document.getElementById("journalText")?.value?.trim();
    
    if (!date || !text) return;

    const entry = {
      id: makeId(),
      date,
      text,
      createdAt: Date.now(),
    };
    
    journalEntries.push(entry);
    store.set(JOURNAL_KEY, journalEntries);

    // Reset form
    journalFormEl.reset();
    // Set today's date as default
    document.getElementById("journalDate").value = new Date().toISOString().split('T')[0];
    
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

// Set today's date as default for journal
if (document.getElementById("journalDate")) {
  document.getElementById("journalDate").value = new Date().toISOString().split('T')[0];
}

// Optional: expose for quick console debugging
window.BP = { tasks, render, store };
