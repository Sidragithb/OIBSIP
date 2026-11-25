// =============================================================
// To-Do App — vanilla JavaScript
// All tasks live in one array. Every change updates the array,
// saves it to localStorage, then re-draws both lists (render()).
// =============================================================

const STORAGE_KEY = "oibsip-todo-tasks";

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const formError = document.getElementById("form-error");

const pendingList = document.getElementById("pending-list");
const completedList = document.getElementById("completed-list");
const pendingCount = document.getElementById("pending-count");
const completedCount = document.getElementById("completed-count");
const pendingEmpty = document.getElementById("pending-empty");
const completedEmpty = document.getElementById("completed-empty");

const progressRing = document.getElementById("progress-ring");
const progressValue = document.getElementById("progress-value");
const progressText = document.getElementById("progress-text");

// Each task: { id, text, completed, createdAt, completedAt }
let tasks = loadTasks();
let editingId = null; // id of the task being edited, or null
let newTaskId = null; // id of the task just added (gets a slide-in animation)

// Small SVG icons for the edit and delete buttons (fixed strings, no user input)
const ICONS = {
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
};

// ----- localStorage (bonus: tasks survive a page refresh) -----

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Storage can be blocked (e.g. private mode). The app still works for this visit.
  }
}

// ----- Actions -----

function addTask(text) {
  const task = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    text,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  tasks.push(task);
  saveTasks();

  newTaskId = task.id;
  render();
  newTaskId = null;
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  saveTasks();
  render();
}

function updateTask(id, newText) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.text = newText;
  editingId = null;
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  if (editingId === id) editingId = null;
  saveTasks();
  render();
}

// ----- Rendering -----

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function formatDate(isoString) {
  return dateFormat.format(new Date(isoString));
}

// Small helper to create an element with a class and optional text
function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text; // textContent is safe from HTML injection
  return el;
}

function createButton(label, className, action, id) {
  const button = createEl("button", `btn ${className}`, label);
  button.type = "button";
  button.dataset.action = action;
  button.dataset.id = id;
  return button;
}

function createIconButton(icon, label, className, action, id) {
  const button = createButton("", `icon-btn ${className}`, action, id);
  button.innerHTML = ICONS[icon];
  button.setAttribute("aria-label", label);
  button.title = label;
  return button;
}

function createTaskItem(task) {
  const li = createEl("li", task.completed ? "task completed" : "task");
  li.dataset.id = task.id;
  if (task.id === newTaskId) li.classList.add("is-new");

  // "Mark complete" toggle
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.className = "toggle";
  toggle.checked = task.completed;
  toggle.dataset.action = "toggle";
  toggle.dataset.id = task.id;
  toggle.setAttribute(
    "aria-label",
    task.completed ? `Mark "${task.text}" as pending` : `Mark "${task.text}" as complete`
  );
  li.append(toggle);

  const body = createEl("div", "task-body");
  const actions = createEl("div", "task-actions");

  if (task.id === editingId) {
    // Inline edit mode
    li.classList.add("editing");
    const editInput = createEl("input", "edit-input");
    editInput.type = "text";
    editInput.value = task.text;
    editInput.maxLength = 120;
    editInput.dataset.id = task.id;
    editInput.setAttribute("aria-label", "Edit task");
    body.append(editInput);

    actions.append(
      createButton("Save", "btn-save", "save", task.id),
      createButton("Cancel", "btn-cancel", "cancel", task.id)
    );
  } else {
    body.append(createEl("span", "task-text", task.text));

    let meta = `Added ${formatDate(task.createdAt)}`;
    if (task.completed && task.completedAt) {
      meta += ` · Completed ${formatDate(task.completedAt)}`;
    }
    body.append(createEl("small", "task-meta", meta));

    actions.append(
      createIconButton("edit", "Edit task", "btn-edit", "edit", task.id),
      createIconButton("delete", "Delete task", "btn-delete", "delete", task.id)
    );
  }

  li.append(body, actions);
  return li;
}

function updateProgress(doneCount) {
  const total = tasks.length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;

  progressRing.style.setProperty("--progress", percent);
  progressRing.setAttribute("aria-label", `${percent}% of tasks completed`);
  progressValue.textContent = `${percent}%`;
  progressText.textContent = total ? `${doneCount} of ${total} tasks done` : "No tasks yet";
}

function render() {
  const pending = tasks.filter((t) => !t.completed);
  // Most recently completed first
  const completed = tasks
    .filter((t) => t.completed)
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));

  pendingList.replaceChildren(...pending.map(createTaskItem));
  completedList.replaceChildren(...completed.map(createTaskItem));

  pendingCount.textContent = `${pending.length} pending`;
  completedCount.textContent = `${completed.length} completed`;

  pendingEmpty.hidden = pending.length > 0;
  completedEmpty.hidden = completed.length > 0;

  updateProgress(completed.length);

  // Put the cursor in the edit box when editing starts
  const editInput = document.querySelector(".edit-input");
  if (editInput) {
    editInput.focus();
    editInput.setSelectionRange(editInput.value.length, editInput.value.length);
  }
}

// ----- Event listeners -----

// Add a task
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();

  if (text === "") {
    formError.textContent = "Please type a task before adding it.";
    input.classList.add("invalid");
    input.focus();
    return;
  }

  addTask(text);
  input.value = "";
  formError.textContent = "";
  input.classList.remove("invalid");
  input.focus();
});

input.addEventListener("input", () => {
  formError.textContent = "";
  input.classList.remove("invalid");
});

function saveEdit(id) {
  const editInput = document.querySelector(`.edit-input[data-id="${id}"]`);
  const newText = editInput.value.trim();

  if (newText === "") {
    editInput.classList.add("invalid");
    editInput.placeholder = "Task can't be empty";
    editInput.focus();
    return;
  }
  updateTask(id, newText);
}

// One click listener per list handles all its buttons (event delegation)
function handleListClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const { action, id } = target.dataset;

  switch (action) {
    case "toggle":
      toggleTask(id);
      break;
    case "edit":
      editingId = id;
      render();
      break;
    case "save":
      saveEdit(id);
      break;
    case "cancel":
      editingId = null;
      render();
      break;
    case "delete":
      deleteTask(id);
      break;
  }
}

// Enter saves an edit, Escape cancels it
function handleListKeydown(event) {
  if (!event.target.classList.contains("edit-input")) return;

  if (event.key === "Enter") {
    event.preventDefault();
    saveEdit(event.target.dataset.id);
  } else if (event.key === "Escape") {
    editingId = null;
    render();
  }
}

// Clear the red "empty" warning as soon as the user types again
function handleListInput(event) {
  if (event.target.classList.contains("edit-input")) {
    event.target.classList.remove("invalid");
  }
}

[pendingList, completedList].forEach((list) => {
  list.addEventListener("click", handleListClick);
  list.addEventListener("keydown", handleListKeydown);
  list.addEventListener("input", handleListInput);
});

// Today's date in the header, e.g. "Wednesday, 25 November"
document.getElementById("today-date").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

render();
