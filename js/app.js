/**
 * Balance Planner Application
 * A task management and journaling app with dark/light theme support
 * 
 * Features:
 * - Task management with categories (Personal, School, Work)
 * - Journal entries with date tracking
 * - Dark/Light theme switching
 * - Local storage persistence
 * - Dashboard with task counts
 */

// =============================================================================
// LOCAL STORAGE HELPER
// =============================================================================
/**
 * Simple wrapper around localStorage with JSON serialization and error handling
 */
const store = {
  /**
   * Get a value from localStorage, with fallback if not found or invalid
   * @param {string} key - The storage key
   * @param {any} fallback - Default value if key doesn't exist or is invalid
   * @returns {any} The stored value or fallback
   */
  get(key, fallback) {
    try { 
      return JSON.parse(localStorage.getItem(key)) ?? fallback; 
    }
    catch { 
      return fallback; // Return fallback if JSON parsing fails
    }
  },
  
  /**
   * Set a value in localStorage with JSON serialization
   * @param {string} key - The storage key
   * @param {any} value - The value to store
   */
  set(key, value) {
    try { 
      localStorage.setItem(key, JSON.stringify(value)); 
    }
    catch { 
      // Ignore quota errors for now - could add user notification later
    }
  },
};

// =============================================================================
// STORAGE KEYS
// =============================================================================
const TASKS_KEY = "bp:tasks";      // Key for storing task data
const THEME_KEY = "bp:theme";      // Key for storing theme preference
const JOURNAL_KEY = "bp:journal";  // Key for storing journal entries

// =============================================================================
// APPLICATION STATE
// =============================================================================
let tasks = store.get(TASKS_KEY, []);           // Array of task objects
let journalEntries = store.get(JOURNAL_KEY, []); // Array of journal entry objects
let theme = store.get(THEME_KEY, "");           // Current theme ('' = light, 'theme-dark-a' = dark)

// Apply saved theme on page load
if (theme) {
  document.documentElement.classList.add(theme);
}

// =============================================================================
// DOM ELEMENT REFERENCES
// =============================================================================
// Task-related elements
const listEl = document.getElementById("taskList");        // Task list container
const formEl = document.getElementById("taskForm");        // Task input form
const textEl = document.getElementById("taskText");        // Task text input
const catEl = document.getElementById("taskCat");          // Task category select

// Journal-related elements
const journalFormEl = document.getElementById("journalForm"); // Journal entry form

// UI elements
const toggleEl = document.getElementById("themeToggle");   // Dark/light theme toggle

// Dashboard count displays
const personalCountEl = document.getElementById("personal-count"); // Personal tasks count
const schoolCountEl = document.getElementById("school-count");     // School tasks count
const workCountEl = document.getElementById("work-count");         // Work tasks count
const journalCountEl = document.getElementById("journal-count");   // Journal entries count

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate a unique ID for tasks and journal entries
 * Uses crypto.randomUUID() if available, falls back to timestamp-based ID
 * @returns {string} Unique identifier
 */
const makeId = () =>
  (crypto?.randomUUID?.()) ||
  "t-" + Math.random().toString(36).slice(2) + Date.now();

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param {string} s - String to escape
 * @returns {string} HTML-escaped string
 */
const escapeHTML = (s = "") =>
  s.replace(/[&<>"']/g, m => ({ 
    "&": "&amp;", 
    "<": "&lt;", 
    ">": "&gt;", 
    "\"": "&quot;", 
    "'": "&#39;" 
  }[m]));

/**
 * Ensure a theme-color meta tag exists in the document head
 * @returns {HTMLElement} The theme-color meta element
 */
function ensureThemeMeta() {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  return meta;
}

/**
 * Update the browser's theme-color meta tag to match the current CSS background
 * This affects the browser UI color on mobile devices
 */
function updateThemeColor() {
  const meta = ensureThemeMeta();
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg")
    .trim();
  meta.setAttribute("content", bg || "#fafafa");
}

// Initialize theme color on page load
updateThemeColor();

// =============================================================================
// DASHBOARD FUNCTIONS
// =============================================================================

/**
 * Update the task count displays on the dashboard
 * Shows count of incomplete tasks for each category plus journal entries
 */
function updateDashboardCounts() {
  // Update Personal tasks count
  if (personalCountEl) {
    const count = tasks.filter(t => t.category === "Personal" && !t.done).length;
    personalCountEl.textContent = `${count} ${count === 1 ? "task" : "tasks"}`;
  }
  
  // Update School tasks count
  if (schoolCountEl) {
    const count = tasks.filter(t => t.category === "School" && !t.done).length;
    schoolCountEl.textContent = `${count} ${count === 1 ? "task" : "tasks"}`;
  }
  
  // Update Work tasks count
  if (workCountEl) {
    const count = tasks.filter(t => t.category === "Work" && !t.done).length;
    workCountEl.textContent = `${count} ${count === 1 ? "task" : "tasks"}`;
  }
  
  // Update Journal entries count
  if (journalCountEl) {
    const count = journalEntries.length;
    journalCountEl.textContent = `${count} ${count === 1 ? "entry" : "entries"}`;
  }
}

// =============================================================================
// RENDERING FUNCTIONS
// =============================================================================

/**
 * Render tasks to the task list
 * @param {string|null} filterCategory - Category to filter by (null = show all or last 5)
 */
function renderTasks(filterCategory = null) {
  if (!listEl) return;

  // Filter tasks based on category or show last 5 for dashboard
  const filteredTasks = filterCategory
    ? tasks.filter(task => task.category === filterCategory)
    : tasks.slice(-5); // Show last 5 tasks on dashboard

  // Generate HTML for each task
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

/**
 * Render journal entries to the journal section
 * @param {boolean} limitToRecent - If true, show only the 2 most recent entries (for dashboard)
 */
function renderJournal(limitToRecent = false) {
  const entriesEl = document.getElementById("journalEntries");
  if (!entriesEl) return;

  // Sort entries by date (newest first) and optionally limit to recent entries
  let entriesToShow = journalEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (limitToRecent) {
    entriesToShow = entriesToShow.slice(0, 2); // Show only the 2 most recent entries
  }

  // Generate HTML
  entriesEl.innerHTML = entriesToShow
    .map(entry => `
      <div class="journal-entry">
        <h4>${new Date(entry.date).toLocaleDateString()}</h4>
        <p>${escapeHTML(entry.text)}</p>
      </div>
    `)
    .join("");
}

/**
 * Main render function - updates all UI elements based on current state
 */
function render() {
  // Determine which category to filter by based on current page
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
    // On dashboard, limit journal entries to 2 most recent
    limitJournalToRecent = true;
  }

  // Render all components
  renderTasks(filterCategory);
  renderJournal(limitJournalToRecent);
  updateDashboardCounts();
}

// Initial render on page load
render();

// =============================================================================
// DUMMY DATA LOADING
// =============================================================================

/**
 * Load dummy data for demonstration purposes
 * This function creates sample tasks and journal entries to show functionality
 */
function loadDummyData() {
  // Only load dummy data if no existing data is found
  if (tasks.length === 0 && journalEntries.length === 0) {
    // Create dummy tasks (3 for each category)
    const dummyTasks = [
      // Personal tasks
      {
        id: makeId(),
        text: "Grocery shopping for the week",
        category: "Personal",
        done: false,
        createdAt: Date.now() - 86400000 // 1 day ago
      },
      {
        id: makeId(),
        text: "Call mom for her birthday",
        category: "Personal", 
        done: true,
        createdAt: Date.now() - 172800000 // 2 days ago
      },
      {
        id: makeId(),
        text: "Schedule dentist appointment",
        category: "Personal",
        done: false,
        createdAt: Date.now() - 259200000 // 3 days ago
      },
      // School tasks
      {
        id: makeId(),
        text: "Complete Web Design project",
        category: "School",
        done: false,
        createdAt: Date.now() - 345600000 // 4 days ago
      },
      {
        id: makeId(),
        text: "Study for midterm exam",
        category: "School",
        done: false,
        createdAt: Date.now() - 432000000 // 5 days ago
      },
      {
        id: makeId(),
        text: "Submit homework assignment",
        category: "School",
        done: true,
        createdAt: Date.now() - 518400000 // 6 days ago
      },
      // Work tasks
      {
        id: makeId(),
        text: "Prepare quarterly report",
        category: "Work",
        done: false,
        createdAt: Date.now() - 604800000 // 7 days ago
      },
      {
        id: makeId(),
        text: "Team meeting at 2 PM",
        category: "Work",
        done: true,
        createdAt: Date.now() - 691200000 // 8 days ago
      },
      {
        id: makeId(),
        text: "Update project documentation",
        category: "Work",
        done: false,
        createdAt: Date.now() - 777600000 // 9 days ago
      }
    ];

    // Create dummy journal entries (3 entries)
    const dummyJournalEntries = [
      {
        id: makeId(),
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
        text: "Had a productive day at work today. Finished the presentation for tomorrow's meeting and felt really confident about it. Also managed to squeeze in a quick workout during lunch break, which felt great.",
        createdAt: Date.now() - 86400000
      },
      {
        id: makeId(),
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 days ago
        text: "Struggled with the web design project today. The CSS grid layout isn't cooperating the way I want it to. Need to spend more time on it tomorrow. On the bright side, had a nice dinner with friends which helped me unwind.",
        createdAt: Date.now() - 172800000
      },
      {
        id: makeId(),
        date: new Date(Date.now() - 259200000).toISOString().split('T')[0], // 3 days ago
        text: "Weekend was relaxing but also productive. Caught up on some personal reading and started planning my garden for spring. Feeling motivated to tackle the upcoming week's challenges.",
        createdAt: Date.now() - 259200000
      }
    ];

    // Load the dummy data
    tasks = dummyTasks;
    journalEntries = dummyJournalEntries;
    
    // Save to localStorage
    store.set(TASKS_KEY, tasks);
    store.set(JOURNAL_KEY, journalEntries);
    
    // Re-render to show the new data
    render();
  }
}

// Load dummy data on page load if no existing data
loadDummyData();

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle task form submission - create new task
 */
if (formEl) {
  formEl.addEventListener("submit", event => {
    event.preventDefault();
    
    // Get and validate input
    const taskText = (textEl?.value || "").trim();
    if (!taskText) return;

    // Create new task object
    const newTask = {
      id: makeId(),
      text: taskText,
      category: catEl?.value || "Personal",
      done: false,
      createdAt: Date.now(),
    };
    
    // Add to tasks array and save
    tasks.push(newTask);
    store.set(TASKS_KEY, tasks);

    // Clear form and re-render
    if (textEl) textEl.value = "";
    render();
  });
}

/**
 * Handle journal form submission - create new journal entry
 */
if (journalFormEl) {
  journalFormEl.addEventListener("submit", event => {
    event.preventDefault();
    
    // Get and validate inputs
    const entryDate = document.getElementById("journalDate")?.value;
    const entryText = document.getElementById("journalText")?.value?.trim();
    if (!entryDate || !entryText) return;

    // Create new journal entry
    const newEntry = {
      id: makeId(),
      date: entryDate,
      text: entryText,
      createdAt: Date.now(),
    };
    
    // Add to journal entries and save
    journalEntries.push(newEntry);
    store.set(JOURNAL_KEY, journalEntries);

    // Reset form and set today's date
    journalFormEl.reset();
    const dateEl = document.getElementById("journalDate");
    if (dateEl) dateEl.value = new Date().toISOString().split("T")[0];

    render();
  });
}

/**
 * Handle task removal - delegate clicks on remove buttons
 */
if (listEl) {
  listEl.addEventListener("click", event => {
    const removeButton = event.target.closest(".t-remove");
    if (!removeButton) return;
    
    const taskListItem = removeButton.closest("li");
    if (!taskListItem) return;
    
    // Remove task from array and save
    const taskId = taskListItem.getAttribute("data-id");
    tasks = tasks.filter(task => task.id !== taskId);
    store.set(TASKS_KEY, tasks);
    render();
  });
  
  /**
   * Handle task completion toggle - delegate checkbox changes
   */
  listEl.addEventListener("change", event => {
    if (!event.target.classList.contains("t-done")) return;
    
    const taskListItem = event.target.closest("li");
    if (!taskListItem) return;
    
    // Update task completion status and save
    const taskId = taskListItem.getAttribute("data-id");
    const isCompleted = event.target.checked;
    tasks = tasks.map(task => 
      task.id === taskId ? { ...task, done: isCompleted } : task
    );
    store.set(TASKS_KEY, tasks);
    render();
  });
}

/**
 * Handle theme toggle - switch between light and dark themes
 */
if (toggleEl) {
  // Set initial ARIA state
  const isInitiallyDark = document.documentElement.classList.contains("theme-dark-a");
  toggleEl.setAttribute("aria-pressed", isInitiallyDark ? "true" : "false");

  toggleEl.addEventListener("click", () => {
    // Toggle theme class and get new state
    const isNowDark = document.documentElement.classList.toggle("theme-dark-a");
    
    // Save theme preference and update UI
    store.set(THEME_KEY, isNowDark ? "theme-dark-a" : "");
    toggleEl.setAttribute("aria-pressed", isNowDark ? "true" : "false");
    updateThemeColor(); // Update browser theme color
  });
}

/**
 * Handle navigation highlighting - mark current page in navigation
 */
document.querySelectorAll(".main-nav a").forEach(link => {
  const href = link.getAttribute("href");
  const currentPage = location.pathname.split("/").pop() || "index.html";
  const isCurrentPage = href === currentPage;
  
  link.classList.toggle("active", isCurrentPage);
  link.toggleAttribute("aria-current", isCurrentPage);
});

/**
 * Handle clear all data functionality
 */
const clearDataBtn = document.getElementById('clearDataBtn');
if (clearDataBtn) {
  clearDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      // Clear all localStorage data
      localStorage.removeItem('bp:tasks');
      localStorage.removeItem('bp:journal');
      localStorage.removeItem('bp:theme');
      
      // Reset application state
      tasks = [];
      journalEntries = [];
      theme = '';
      
      // Remove theme class
      document.documentElement.classList.remove('theme-dark-a');
      
      // Re-render with empty state
      render();
      
      // Show success message
      alert('All data has been cleared.');
    }
  });
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Set today's date as default for journal date input
 */
const dateEl = document.getElementById("journalDate");
if (dateEl) {
  dateEl.value = new Date().toISOString().split("T")[0];
}

/**
 * Expose application state and functions for debugging
 * Available in browser console as window.BP
 */
window.BP = { 
  tasks,           // Current tasks array
  journalEntries,  // Current journal entries array
  render,          // Main render function
  store            // Storage helper
};

// =============================================================================
// WISDOM QUOTE COMPONENT
// =============================================================================

/**
 * Pool of wisdom quotes to rotate through
 * Each quote object contains text and author
 */
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

/**
 * Fisher-Yates shuffle algorithm to randomize array order
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled copy of the array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get the next quote to display, with non-repeating rotation logic
 * @returns {Object} Quote object with text and author
 */
function getNextQuote() {
  // Get current order and position from localStorage
  let quoteOrder = store.get("bp:quoteOrder", null);
  let qpos = store.get("bp:qpos", 0);

  // If no order exists or we've exhausted all quotes, create a new shuffled order
  if (!quoteOrder || !Array.isArray(quoteOrder) || qpos >= quoteOrder.length) {
    quoteOrder = shuffleArray(Array.from({ length: QUOTES.length }, (_, i) => i));
    store.set("bp:quoteOrder", quoteOrder);
    qpos = 0;
  }

  // Get the current quote
  const quoteIndex = quoteOrder[qpos];
  const quote = QUOTES[quoteIndex];

  // Increment position and save to localStorage
  store.set("bp:qpos", qpos + 1);

  return quote;
}

/**
 * Inject the wisdom quote component into the page
 * Inserts before <footer> if found, otherwise appends to <main>
 */
function injectQuoteComponent() {
  // Get the next quote
  const quote = getNextQuote();

  // Create the quote HTML structure
  const quoteAside = document.createElement("aside");
  quoteAside.className = "site-quote";
  quoteAside.setAttribute("aria-live", "polite");

  const container = document.createElement("div");
  container.className = "container";

  const figure = document.createElement("figure");
  figure.style.margin = "0";

  const blockquote = document.createElement("blockquote");
  blockquote.id = "quoteText";
  blockquote.textContent = quote.text;

  const figcaption = document.createElement("figcaption");
  figcaption.id = "quoteBy";
  figcaption.textContent = `— ${quote.author}`;

  // Assemble the structure
  figure.appendChild(blockquote);
  figure.appendChild(figcaption);
  container.appendChild(figure);
  quoteAside.appendChild(container);

  // Find insertion point: before footer or append to main
  const footer = document.querySelector("footer");
  if (footer) {
    footer.parentNode.insertBefore(quoteAside, footer);
  } else {
    const main = document.querySelector("main");
    if (main) {
      main.appendChild(quoteAside);
    } else {
      // Fallback: append to body
      document.body.appendChild(quoteAside);
    }
  }
}

// Initialize the quote component on page load
injectQuoteComponent();