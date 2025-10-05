/**
 * Balance Planner
 * Task management and journaling app with theme support
 */

// localStorage helper
const store = {
  get(key, fallback) {
    try { 
      return JSON.parse(localStorage.getItem(key)) ?? fallback; 
    }
    catch { 
      return fallback;
    }
  },
  
  set(key, value) {
    try { 
      localStorage.setItem(key, JSON.stringify(value)); 
    }
    catch { 
      // Silently fail if quota exceeded
    }
  },
};

// Storage keys
const TASKS_KEY = "bp:tasks";
const THEME_KEY = "bp:theme";
const JOURNAL_KEY = "bp:journal";

// Dashboard limits
const DASHBOARD_TASKS_LIMIT = 5;
const DASHBOARD_JOURNAL_LIMIT = 2;

// App state
let tasks = store.get(TASKS_KEY, []);
let journalEntries = store.get(JOURNAL_KEY, []);
let theme = store.get(THEME_KEY, "");

// Apply saved theme
if (theme) {
  document.documentElement.classList.add(theme);
}

// DOM elements
const listEl = document.getElementById("taskList");
const formEl = document.getElementById("taskForm");
const textEl = document.getElementById("taskText");
const catEl = document.getElementById("taskCat");
const journalFormEl = document.getElementById("journalForm");
const toggleEl = document.getElementById("themeToggle");
const personalCountEl = document.getElementById("personal-count");
const schoolCountEl = document.getElementById("school-count");
const workCountEl = document.getElementById("work-count");
const journalCountEl = document.getElementById("journal-count");

// Utility functions
const makeId = () =>
  (crypto?.randomUUID?.()) ||
  "t-" + Math.random().toString(36).slice(2) + Date.now();

const escapeHTML = (s = "") =>
  s.replace(/[&<>"']/g, m => ({ 
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[m]));

function ensureThemeMeta() {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  return meta;
}

function updateThemeColor() {
  const meta = ensureThemeMeta();
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg")
    .trim();
  meta.setAttribute("content", bg || "#fafafa");
}

updateThemeColor();

// Update dashboard counts
function updateDashboardCounts() {
  const categoryConfig = [
    { element: personalCountEl, category: "Personal", unit: "task" },
    { element: schoolCountEl, category: "School", unit: "task" },
    { element: workCountEl, category: "Work", unit: "task" }
  ];
  
  categoryConfig.forEach(({ element, category, unit }) => {
    if (element) {
      const count = tasks.filter(t => t.category === category && !t.done).length;
      element.textContent = `${count} ${count === 1 ? unit : unit + "s"}`;
    }
  });
  
  if (journalCountEl) {
    const count = journalEntries.length;
    journalCountEl.textContent = `${count} ${count === 1 ? "entry" : "entries"}`;
  }
}

// Render tasks
function renderTasks(filterCategory = null) {
  if (!listEl) return;

  const filteredTasks = filterCategory
    ? tasks.filter(task => task.category === filterCategory)
    : tasks.slice(-DASHBOARD_TASKS_LIMIT);

  listEl.innerHTML = filteredTasks.map(task => {
    const checkboxId = `task-${task.id}`;
    
    return `
      <li data-id="${task.id}" class="task-item ${task.done ? "completed" : ""}">
        <input id="${checkboxId}" type="checkbox" ${task.done ? "checked" : ""} class="t-done">
        <label for="${checkboxId}">
          <strong>[${escapeHTML(task.category)}]</strong> ${escapeHTML(task.text)}
        </label>
        <button class="t-remove" type="button" aria-label="Remove task: ${escapeHTML(task.text)}">×</button>
      </li>
    `;
  }).join("");
}

// Render journal entries
function renderJournal(limitToRecent = false) {
  const entriesEl = document.getElementById("journalEntries");
  if (!entriesEl) return;

  const sortedEntries = [...journalEntries].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );
  
  const entriesToShow = limitToRecent 
    ? sortedEntries.slice(0, DASHBOARD_JOURNAL_LIMIT)
    : sortedEntries;

  entriesEl.innerHTML = entriesToShow
    .map(entry => `
      <div class="journal-entry">
        <h4>${new Date(entry.date).toLocaleDateString()}</h4>
        <p>${escapeHTML(entry.text)}</p>
      </div>
    `)
    .join("");
}

// Main render function
function render() {
  const currentPath = window.location.pathname;
  let filterCategory = null;
  let limitJournalToRecent = false;
  
  if (currentPath.includes("personal.html")) {
    filterCategory = "Personal";
  } else if (currentPath.includes("school.html")) {
    filterCategory = "School";
  } else if (currentPath.includes("work.html")) {
    filterCategory = "Work";
  } else if (currentPath.includes("index.html") || currentPath.endsWith("/")) {
    limitJournalToRecent = true;
  }

  renderTasks(filterCategory);
  renderJournal(limitJournalToRecent);
  updateDashboardCounts();
}

render();

// Load sample data on first use
function loadDummyData() {
  if (tasks.length === 0 && journalEntries.length === 0) {
    const dummyTasks = [
      {
        id: makeId(),
        text: "Grocery shopping for the week",
        category: "Personal",
        done: false,
        createdAt: Date.now() - 86400000
      },
      {
        id: makeId(),
        text: "Call mom for her birthday",
        category: "Personal", 
        done: true,
        createdAt: Date.now() - 172800000
      },
      {
        id: makeId(),
        text: "Schedule dentist appointment",
        category: "Personal",
        done: false,
        createdAt: Date.now() - 259200000
      },
      {
        id: makeId(),
        text: "Complete Web Design project",
        category: "School",
        done: false,
        createdAt: Date.now() - 345600000
      },
      {
        id: makeId(),
        text: "Study for midterm exam",
        category: "School",
        done: false,
        createdAt: Date.now() - 432000000
      },
      {
        id: makeId(),
        text: "Submit homework assignment",
        category: "School",
        done: true,
        createdAt: Date.now() - 518400000
      },
      {
        id: makeId(),
        text: "Prepare quarterly report",
        category: "Work",
        done: false,
        createdAt: Date.now() - 604800000
      },
      {
        id: makeId(),
        text: "Team meeting at 2 PM",
        category: "Work",
        done: true,
        createdAt: Date.now() - 691200000
      },
      {
        id: makeId(),
        text: "Update project documentation",
        category: "Work",
        done: false,
        createdAt: Date.now() - 777600000
      }
    ];

    const dummyJournalEntries = [
      {
        id: makeId(),
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        text: "Had a productive day at work today. Finished the presentation for tomorrow's meeting and felt really confident about it. Also managed to squeeze in a quick workout during lunch break, which felt great.",
        createdAt: Date.now() - 86400000
      },
      {
        id: makeId(),
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        text: "Struggled with the web design project today. The CSS grid layout isn't cooperating the way I want it to. Need to spend more time on it tomorrow. On the bright side, had a nice dinner with friends which helped me unwind.",
        createdAt: Date.now() - 172800000
      },
      {
        id: makeId(),
        date: new Date(Date.now() - 259200000).toISOString().split('T')[0],
        text: "Weekend was relaxing but also productive. Caught up on some personal reading and started planning my garden for spring. Feeling motivated to tackle the upcoming week's challenges.",
        createdAt: Date.now() - 259200000
      }
    ];

    tasks = dummyTasks;
    journalEntries = dummyJournalEntries;
    
    store.set(TASKS_KEY, tasks);
    store.set(JOURNAL_KEY, journalEntries);
    
    render();
  }
}

loadDummyData();

// Event handlers - add new task
if (formEl) {
  formEl.addEventListener("submit", event => {
    event.preventDefault();
    
    const taskText = (textEl?.value || "").trim();
    if (!taskText) return;

    const newTask = {
      id: makeId(),
      text: taskText,
      category: catEl?.value || "Personal",
      done: false,
      createdAt: Date.now(),
    };
    
    tasks.push(newTask);
    store.set(TASKS_KEY, tasks);

    if (textEl) textEl.value = "";
    render();
  });
}

// Add journal entry
if (journalFormEl) {
  journalFormEl.addEventListener("submit", event => {
    event.preventDefault();
    
    const entryDate = document.getElementById("journalDate")?.value;
    const entryText = document.getElementById("journalText")?.value?.trim();
    
    if (!entryDate || !entryText) return;

    const newEntry = {
      id: makeId(),
      date: entryDate,
      text: entryText,
      createdAt: Date.now(),
    };
    
    journalEntries.push(newEntry);
    store.set(JOURNAL_KEY, journalEntries);

    journalFormEl.reset();
    
    const dateEl = document.getElementById("journalDate");
    if (dateEl) dateEl.value = new Date().toISOString().split("T")[0];

    render();
  });
}

// Remove task
if (listEl) {
  listEl.addEventListener("click", event => {
    const removeButton = event.target.closest(".t-remove");
    if (!removeButton) return;
    
    const taskListItem = removeButton.closest("li");
    if (!taskListItem) return;
    
    const taskId = taskListItem.getAttribute("data-id");
    
    tasks = tasks.filter(task => task.id !== taskId);
    store.set(TASKS_KEY, tasks);
    render();
  });
  
  // Toggle task completion
  listEl.addEventListener("change", event => {
    if (!event.target.classList.contains("t-done")) return;
    
    const taskListItem = event.target.closest("li");
    if (!taskListItem) return;
    
    const taskId = taskListItem.getAttribute("data-id");
    const isCompleted = event.target.checked;
    
    tasks = tasks.map(task => 
      task.id === taskId ? { ...task, done: isCompleted } : task
    );
    
    store.set(TASKS_KEY, tasks);
    render();
  });
}

// Theme toggle
if (toggleEl) {
  const isInitiallyDark = document.documentElement.classList.contains("theme-dark-a");
  toggleEl.setAttribute("aria-pressed", isInitiallyDark ? "true" : "false");

  toggleEl.addEventListener("click", () => {
    const isNowDark = document.documentElement.classList.toggle("theme-dark-a");
    
    store.set(THEME_KEY, isNowDark ? "theme-dark-a" : "");
    toggleEl.setAttribute("aria-pressed", isNowDark ? "true" : "false");
    
    updateThemeColor();
  });
}

// Navigation highlighting
document.querySelectorAll(".main-nav a").forEach(link => {
  const href = link.getAttribute("href");
  const currentPage = location.pathname.split("/").pop() || "index.html";
  const isCurrentPage = href === currentPage;
  
  link.classList.toggle("active", isCurrentPage);
  link.toggleAttribute("aria-current", isCurrentPage);
});

// Clear all data
const clearDataBtn = document.getElementById('clearDataBtn');
if (clearDataBtn) {
  clearDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.removeItem(TASKS_KEY);
      localStorage.removeItem(JOURNAL_KEY);
      localStorage.removeItem(THEME_KEY);
      
      tasks = [];
      journalEntries = [];
      theme = '';
      
      document.documentElement.classList.remove('theme-dark-a');
      render();
      
      alert('All data has been cleared.');
    }
  });
}

// Set today's date for journal input
const dateEl = document.getElementById("journalDate");
if (dateEl) {
  dateEl.value = new Date().toISOString().split("T")[0];
}

// Debug helper
window.BP = { 
  get tasks() { return [...tasks]; },
  get journalEntries() { return [...journalEntries]; },
  render,
  store
};

// Wisdom quotes
const QUOTES = [
  {
    text: "When you have faults, do not fear to abandon them.",
    author: "Confucius",
  },
  {
    text: "The superior man is modest in his speech, but exceeds in his actions.",
    author: "Confucius",
  },
  {
    text: "A journey of a thousand miles begins beneath one's feet.",
    author: "Lao Tzu",
  },
  {
    text: "Act on it before it comes into being; order it before there is disorder.",
    author: "Lao Tzu",
  },
  {
    text: "Be careful at the end as at the beginning, and there will be no ruined enterprises.",
    author: "Lao Tzu",
  },
  {
    text: "It is not that we have a short time to live, but that we waste much of it.",
    author: "Seneca",
  },
  {
    text: "Well done is better than well said.",
    author: "Benjamin Franklin",
  },
  {
    text: "Waste no more time arguing what a good man should be. Be one.",
    author: "Marcus Aurelius",
  },
  {
    text: "The happiness of your life depends upon the quality of your thoughts.",
    author: "Marcus Aurelius",
  },
  {
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
  },
  {
    text: "He who conquers himself is the mightiest warrior.",
    author: "Confucius",
  },
  {
    text: "He who is brave is free.",
    author: "Seneca",
  },
  {
    text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
    author: "Buddha",
  },
  {
    text: "Order your soul. Reduce your wants. Live in harmony with nature.",
    author: "Epicurus",
  }
];

// Fisher-Yates shuffle
function shuffleArray(array) {
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

function getNextQuote() {
  let quoteOrder = store.get("bp:quoteOrder", null);
  let qpos = store.get("bp:qpos", 0);

  if (!quoteOrder || !Array.isArray(quoteOrder) || qpos >= quoteOrder.length) {
    quoteOrder = shuffleArray(Array.from({ length: QUOTES.length }, (_, i) => i));
    store.set("bp:quoteOrder", quoteOrder);
    qpos = 0;
  }

  const quoteIndex = quoteOrder[qpos];
  const quote = QUOTES[quoteIndex];

  store.set("bp:qpos", qpos + 1);

  return quote;
}

function injectQuoteComponent() {
  const quote = getNextQuote();

  const quoteHTML = `
    <aside class="site-quote" aria-live="polite">
      <div class="container">
        <figure style="margin: 0">
          <blockquote id="quoteText">${escapeHTML(quote.text)}</blockquote>
          <figcaption id="quoteBy">— ${escapeHTML(quote.author)}</figcaption>
        </figure>
      </div>
    </aside>
  `;

  const footer = document.querySelector("footer");
  if (footer) {
    footer.insertAdjacentHTML('beforebegin', quoteHTML);
  } else {
    const main = document.querySelector("main");
    if (main) {
      main.insertAdjacentHTML('beforeend', quoteHTML);
    } else {
      document.body.insertAdjacentHTML('beforeend', quoteHTML);
    }
  }
}

injectQuoteComponent();