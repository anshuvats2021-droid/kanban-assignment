
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const INITIAL_TASKS = [
  {
    id: 1,
    title: "Design landing page",
    description: "Create a clean and modern landing page for the new product.",
    priority: "High",
    status: "todo",
    category: "Design",
    dueDate: "",
  },
  {
    id: 2,
    title: "Build authentication",
    description: "Implement login, signup and form validation.",
    priority: "High",
    status: "progress",
    category: "Development",
    dueDate: "",
  },
  {
    id: 3,
    title: "Research competitors",
    description: "Review competitor websites and note useful features.",
    priority: "Medium",
    status: "todo",
    category: "Planning",
    dueDate: "",
  },
  {
    id: 4,
    title: "Create project roadmap",
    description: "Break the project into milestones and weekly goals.",
    priority: "Low",
    status: "done",
    category: "Planning",
    dueDate: "",
  },
  {
    id: 5,
    title: "Set up GitHub repo",
    description: "Organize the source code and prepare the repository.",
    priority: "Medium",
    status: "progress",
    category: "Development",
    dueDate: "",
  },
];

const COLUMNS = [
  { id: "todo", title: "To Do", icon: "○", color: "purple" },
  { id: "progress", title: "In Progress", icon: "◷", color: "orange" },
  { id: "done", title: "Completed", icon: "✓", color: "green" },
];

const STORAGE_KEY = "kanban-tasks-v1";
const THEME_KEY = "kanban-theme-v1";

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.error("Could not load saved tasks:", error);
  }
  return INITIAL_TASKS;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(date) {
  if (!date) return "No due date";

  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(task) {
  if (!task.dueDate || task.status === "done") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Date(`${task.dueDate}T00:00:00`) < today;
}

function App() {
  const [tasks, setTasks] = useState(loadTasks);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || "light";
    } catch {
      return "light";
    }
  });

  const [activeView, setActiveView] = useState("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("board");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [toast, setToast] = useState("");
  const [formError, setFormError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "Medium",
    status: "todo",
    category: "Development",
    dueDate: "",
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("Could not save tasks:", error);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Theme still works for this session.
    }
  }, [theme]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    function handleKeyDown(event) {
      const tag = document.activeElement?.tagName;
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (event.key === "Escape") {
        setModalOpen(false);
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("task-search")?.focus();
      }

      if (event.key.toLowerCase() === "n" && !isTyping && !modalOpen) {
        openAddModal("todo");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      todo: tasks.filter((task) => task.status === "todo").length,
      progress: tasks.filter((task) => task.status === "progress").length,
      done: tasks.filter((task) => task.status === "done").length,
      overdue: tasks.filter(isOverdue).length,
      high: tasks.filter(
        (task) => task.priority === "High" && task.status !== "done"
      ).length,
    }),
    [tasks]
  );

  const completion = tasks.length
    ? Math.round((counts.done / tasks.length) * 100)
    : 0;

  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (activeView === "today") {
      const today = new Date();
      const todayString = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");

      result = result.filter((task) => task.dueDate === todayString);
    }

    if (activeView === "overdue") {
      result = result.filter(isOverdue);
    }

    if (priorityFilter !== "All") {
      result = result.filter((task) => task.priority === priorityFilter);
    }

    if (statusFilter !== "All") {
      result = result.filter((task) => task.status === statusFilter);
    }

    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter((task) =>
        [task.title, task.description, task.category]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);

      if (sortBy === "priority") {
        const rank = { High: 0, Medium: 1, Low: 2 };
        return rank[a.priority] - rank[b.priority];
      }

      if (sortBy === "dueDate") {
        return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
      }

      return String(b.id).localeCompare(String(a.id), undefined, {
        numeric: true,
      });
    });

    return result;
  }, [
    tasks,
    activeView,
    priorityFilter,
    statusFilter,
    search,
    sortBy,
  ]);

  function showToast(message) {
    setToast(message);
  }

  function openAddModal(status = "todo") {
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      priority: "Medium",
      status,
      category: "Development",
      dueDate: "",
    });
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(task) {
    setEditingId(task.id);
    setForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "Medium",
      status: task.status || "todo",
      category: task.category || "Development",
      dueDate: task.dueDate || "",
    });
    setFormError("");
    setModalOpen(true);
  }

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setFormError("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const title = form.title.trim();

    if (!title) {
      setFormError("Please enter a task title.");
      return;
    }

    if (title.length > 100) {
      setFormError("Title must be 100 characters or fewer.");
      return;
    }

    const description = form.description.trim();

    if (editingId !== null) {
      setTasks((previous) =>
        previous.map((task) =>
          task.id === editingId
            ? { ...task, ...form, title, description }
            : task
        )
      );
      showToast("Task updated successfully!");
    } else {
      const newTask = {
        ...form,
        id: makeId(),
        title,
        description,
        createdAt: Date.now(),
      };

      setTasks((previous) => [newTask, ...previous]);
      showToast("New task added to your board!");
    }

    setModalOpen(false);
    setEditingId(null);
  }

  function deleteTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) {
      return;
    }

    setTasks((previous) => previous.filter((item) => item.id !== id));
    showToast("Task deleted.");
  }

  function changeStatus(id, status) {
    if (!COLUMNS.some((column) => column.id === status)) return;

    setTasks((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, status } : task
      )
    );

    const column = COLUMNS.find((item) => item.id === status);
    showToast(`Task moved to ${column.title}.`);
  }

  function handleDragStart(event, id) {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(id));
  }

  function handleDrop(event, status) {
    event.preventDefault();

    const id = draggedId || event.dataTransfer.getData("text/plain");
    if (!id) return;

    const task = tasks.find((item) => String(item.id) === String(id));

    if (task && task.status !== status) {
      setTasks((previous) =>
        previous.map((item) =>
          String(item.id) === String(id) ? { ...item, status } : item
        )
      );

      const column = COLUMNS.find((item) => item.id === status);
      showToast(`Task moved to ${column.title}.`);
    }

    setDraggedId(null);
    setDragOverColumn(null);
  }

  function clearFilters() {
    setSearch("");
    setPriorityFilter("All");
    setStatusFilter("All");
    setActiveView("all");
    setSortBy("newest");
  }

  function exportTasks() {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kanban-tasks.json";
    link.click();
    URL.revokeObjectURL(url);

    showToast("Your tasks have been exported.");
  }

  function renderTask(task) {
    const overdue = isOverdue(task);
    const column = COLUMNS.find((item) => item.id === task.status);

    return (
      <article
        className={`task-card ${draggedId === task.id ? "task-dragging" : ""}`}
        key={task.id}
        draggable
        onDragStart={(event) => handleDragStart(event, task.id)}
        onDragEnd={() => {
          setDraggedId(null);
          setDragOverColumn(null);
        }}
      >
        <div className="task-card-top">
          <span
            className={`category-tag tag-${task.category.toLowerCase()}`}
          >
            <span />
            {task.category}
          </span>

          <div className="task-actions">
            <button
              type="button"
              title="Edit task"
              aria-label={`Edit ${task.title}`}
              onClick={() => openEditModal(task)}
            >
              ✎
            </button>
            <button
              type="button"
              title="Delete task"
              aria-label={`Delete ${task.title}`}
              onClick={() => deleteTask(task.id)}
            >
              ×
            </button>
          </div>
        </div>

        <h4>{task.title}</h4>

        {task.description && (
          <p className="task-description">{task.description}</p>
        )}

        <div className="task-meta">
          <span className={`priority priority-${task.priority.toLowerCase()}`}>
            <span />
            {task.priority} priority
          </span>

          <span className={`due-date ${overdue ? "overdue-date" : ""}`}>
            {task.dueDate
              ? `${overdue ? "⚠ " : "◷ "}${formatDate(task.dueDate)}`
              : "◷ No deadline"}
          </span>
        </div>

        <div className="task-card-footer">
          <span className={`status-text status-${task.status}`}>
            <span />
            {column?.title || "To Do"}
          </span>

          <select
            aria-label={`Change status of ${task.title}`}
            value={task.status}
            onChange={(event) => changeStatus(task.id, event.target.value)}
          >
            {COLUMNS.map((item) => (
              <option value={item.id} key={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
      </article>
    );
  }

  return (
    <div className={`kanban-app ${theme === "dark" ? "dark-theme" : ""}`}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#home"
          onClick={() => {
            setActiveView("all");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="brand-icon">K</span>
          <span>
            KANBAN<span className="brand-period">.</span>
          </span>
        </a>

        <div className="workspace-box">
          <div className="workspace-avatar">K</div>
          <div className="workspace-info">
            <strong>My Workspace</strong>
            <span>Personal space</span>
          </div>
          <span className="workspace-chevron">⌄</span>
        </div>

        <p className="sidebar-label">WORKSPACE</p>

        <nav className="sidebar-nav" aria-label="Task navigation">
          <button
            className={activeView === "all" ? "nav-active" : ""}
            onClick={() => setActiveView("all")}
          >
            <span className="nav-icon">▦</span>
            My Tasks
            <span className="nav-count">{counts.all}</span>
          </button>

          <button
            className={activeView === "today" ? "nav-active" : ""}
            onClick={() => setActiveView("today")}
          >
            <span className="nav-icon">◷</span>
            Today
          </button>

          <button
            className={activeView === "overdue" ? "nav-active" : ""}
            onClick={() => setActiveView("overdue")}
          >
            <span className="nav-icon">◉</span>
            Overdue
            {counts.overdue > 0 && (
              <span className="nav-count">{counts.overdue}</span>
            )}
          </button>
        </nav>

        <p className="sidebar-label progress-label">YOUR PROGRESS</p>

        <div className="weekly-card">
          <div className="weekly-top">
            <span>Completion rate</span>
            <strong>{completion}%</strong>
          </div>

          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={completion}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Task completion rate"
          >
            <div
              className="progress-fill"
              style={{ width: `${completion}%` }}
            />
          </div>

          <p>
            {counts.done} of {counts.all} tasks completed
          </p>
        </div>

        <div className="sidebar-tip">
          <span className="tip-icon">✳</span>
          <strong>Small steps, big wins.</strong>
          <p>Every completed task moves you forward. Keep going!</p>
        </div>

        <div className="sidebar-bottom">
          <button
            className="theme-toggle"
            onClick={() =>
              setTheme((previous) =>
                previous === "dark" ? "light" : "dark"
              )
            }
          >
            <span>{theme === "dark" ? "☀" : "☾"}</span>
            {theme === "dark" ? "Switch to light" : "Switch to dark"}
            <span className="theme-arrow">↗</span>
          </button>

          <div className="profile-row">
            <div className="profile-avatar">K</div>
            <div className="profile-info">
              <strong>My Profile</strong>
              <span>Productivity mode</span>
            </div>
            <span className="profile-dots">•••</span>
          </div>
        </div>
      </aside>

      <main className="main-area" id="home">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <span>/</span> <strong>My Tasks</strong>
          </div>

          <div className="topbar-right">
            <span className="online-dot" />
            <span className="online-text">Your workspace is ready</span>

            <button className="export-button" onClick={exportTasks}>
              ↓ Export
            </button>

            <button
              className="top-avatar"
              title="Your Kanban workspace"
              onClick={() => showToast("Welcome to your Kanban workspace!")}
            >
              K
            </button>
          </div>
        </header>

        <section className="welcome-section">
          <div>
            <p className="eyebrow">
              <span>✳</span> YOUR PERSONAL COMMAND CENTER
            </p>
            <h1>
              Make it happen<span>.</span>
            </h1>
            <p className="welcome-description">
              One board, all your goals. Organize your work and make every day
              count.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={() => openAddModal("todo")}
          >
            <span>+</span> Add new task <kbd>N</kbd>
          </button>
        </section>

        <section className="stats-grid" aria-label="Task statistics">
          <div className="stat-card">
            <div className="stat-heading">
              Total tasks
              <span className="stat-icon purple">▦</span>
            </div>
            <strong className="stat-value">{counts.all}</strong>
            <span className="stat-caption">Across your workspace</span>
            <span className="stat-decoration decoration-purple">▦</span>
          </div>

          <div className="stat-card">
            <div className="stat-heading">
              In progress
              <span className="stat-icon orange">◷</span>
            </div>
            <strong className="stat-value">{counts.progress}</strong>
            <span className="stat-caption">Work in motion</span>
            <span className="stat-decoration decoration-orange">◷</span>
          </div>

          <div className="stat-card">
            <div className="stat-heading">
              Completed
              <span className="stat-icon green">✓</span>
            </div>
            <strong className="stat-value">{counts.done}</strong>
            <span className="stat-caption">Wins worth celebrating</span>
            <span className="stat-decoration decoration-green">✓</span>
          </div>

          <div className="stat-card">
            <div className="stat-heading">
              High priority
              <span className="stat-icon red">⚑</span>
            </div>
            <strong className="stat-value">{counts.high}</strong>
            <span className="stat-caption">Needs your attention</span>
            <span className="stat-decoration decoration-red">⚑</span>
          </div>
        </section>

        <section className="board-section">
          <div className="board-title-row">
            <div>
              <h2>
                {activeView === "today"
                  ? "Today's Tasks"
                  : activeView === "overdue"
                    ? "Overdue Tasks"
                    : "My Board"}
                <span className="total-badge">{filteredTasks.length}</span>
              </h2>
              <p>Your ideas, organized one step at a time.</p>
            </div>

            <div className="view-switch" aria-label="Choose board view">
              <button
                className={viewMode === "board" ? "view-active" : ""}
                onClick={() => setViewMode("board")}
                title="Board view"
                aria-label="Board view"
              >
                ▦
              </button>
              <button
                className={viewMode === "list" ? "view-active" : ""}
                onClick={() => setViewMode("list")}
                title="List view"
                aria-label="List view"
              >
                ☷
              </button>
            </div>
          </div>

          <div className="toolbar">
            <label className="search-box">
              <span>⌕</span>
              <input
                id="task-search"
                type="search"
                placeholder="Search your tasks..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <kbd>Ctrl K</kbd>
            </label>

            <div className="filter-controls">
              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="All">All priorities</option>
                <option value="High">High priority</option>
                <option value="Medium">Medium priority</option>
                <option value="Low">Low priority</option>
              </select>

              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="All">All statuses</option>
                <option value="todo">To Do</option>
                <option value="progress">In Progress</option>
                <option value="done">Completed</option>
              </select>

              <select
                aria-label="Sort tasks"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="title">Alphabetical</option>
                <option value="priority">Priority</option>
                <option value="dueDate">Due date</option>
              </select>
            </div>
          </div>

          {(search ||
            priorityFilter !== "All" ||
            statusFilter !== "All" ||
            activeView !== "all" ||
            sortBy !== "newest") && (
            <div className="filter-status-row">
              <span>
                Showing {filteredTasks.length} matching task
                {filteredTasks.length === 1 ? "" : "s"}
              </span>
              <button className="clear-button" onClick={clearFilters}>
                Clear filters ×
              </button>
            </div>
          )}

          {viewMode === "board" ? (
            <div className="kanban-board">
              {COLUMNS.map((column) => {
                const columnTasks = filteredTasks.filter(
                  (task) => task.status === column.id
                );

                return (
                  <section
                    className={`kanban-column ${
                      dragOverColumn === column.id ? "drop-ready" : ""
                    }`}
                    key={column.id}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverColumn(column.id);
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        setDragOverColumn(null);
                      }
                    }}
                    onDrop={(event) => handleDrop(event, column.id)}
                  >
                    <div className="column-header">
                      <div className="column-name">
                        <span className={`column-dot dot-${column.color}`} />
                        <h3>{column.title}</h3>
                        <span className="column-count">
                          {columnTasks.length}
                        </span>
                      </div>

                      <button
                        className="column-add"
                        title={`Add task to ${column.title}`}
                        aria-label={`Add task to ${column.title}`}
                        onClick={() => openAddModal(column.id)}
                      >
                        +
                      </button>
                    </div>

                    <div className="task-list">
                      {columnTasks.map(renderTask)}

                      {columnTasks.length === 0 && (
                        <div className="empty-column">
                          <span>{column.icon}</span>
                          <strong>
                            {search || activeView !== "all"
                              ? "No matching tasks"
                              : "Nothing here yet"}
                          </strong>
                          <p>
                            {search || activeView !== "all"
                              ? "Try changing your search or filters."
                              : "Add a task or drag one here to get started."}
                          </p>
                          {!search && activeView === "all" && (
                            <button
                              onClick={() => openAddModal(column.id)}
                            >
                              + Create task
                            </button>
                          )}
                        </div>
                      )}

                      <button
                        className="add-task-link"
                        onClick={() => openAddModal(column.id)}
                      >
                        + Add a task
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="list-view">
              <div className="list-header">
                <span>Task</span>
                <span>Priority</span>
                <span>Status</span>
                <span>Due date</span>
                <span>Actions</span>
              </div>

              {filteredTasks.map((task) => (
                <div className="list-row" key={task.id}>
                  <div className="list-task">
                    <strong>{task.title}</strong>
                    <span>{task.category}</span>
                  </div>

                  <span
                    className={`priority priority-${task.priority.toLowerCase()}`}
                  >
                    <span />
                    {task.priority}
                  </span>

                  <select
                    aria-label={`Change status of ${task.title}`}
                    value={task.status}
                    onChange={(event) =>
                      changeStatus(task.id, event.target.value)
                    }
                  >
                    {COLUMNS.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.title}
                      </option>
                    ))}
                  </select>

                  <span className="list-date">
                    {formatDate(task.dueDate)}
                  </span>

                  <div className="list-actions">
                    <button
                      title="Edit task"
                      aria-label={`Edit ${task.title}`}
                      onClick={() => openEditModal(task)}
                    >
                      ✎
                    </button>
                    <button
                      title="Delete task"
                      aria-label={`Delete ${task.title}`}
                      onClick={() => deleteTask(task.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              {filteredTasks.length === 0 && (
                <div className="list-empty">
                  No tasks found. Try another search or create a new task.
                </div>
              )}
            </div>
          )}
        </section>

        <footer className="app-footer">
          <span>
            <span className="footer-symbol">✳</span>
            KANBAN — Make every task count.
          </span>
          <span>Made for your next big thing ✦</span>
        </footer>
      </main>

      {modalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModalOpen(false);
          }}
        >
          <section
            className="task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
          >
            <div className="modal-heading">
              <span className="modal-icon">{editingId ? "✎" : "+"}</span>
              <button
                className="modal-close"
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            <p className="modal-eyebrow">
              {editingId ? "UPDATE YOUR WORK" : "MAKE IT HAPPEN"}
            </p>

            <h2 id="task-modal-title">
              {editingId ? "Edit task" : "Create a task"}
            </h2>

            <p className="modal-description">
              {editingId
                ? "Make changes to your task details below."
                : "Every big achievement starts with one small task."}
            </p>

            <form onSubmit={handleSubmit}>
              <label className="form-field">
                Task title <span>*</span>
                <input
                  autoFocus
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Build my portfolio"
                  maxLength={100}
                  required
                />
              </label>

              <label className="form-field">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="What needs to get done?"
                  rows={3}
                  maxLength={500}
                />
              </label>

              <div className="form-grid">
                <label className="form-field">
                  Priority
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleFormChange}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </label>

                <label className="form-field">
                  Status
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                  >
                    {COLUMNS.map((column) => (
                      <option value={column.id} key={column.id}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  Category
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                  >
                    <option>Development</option>
                    <option>Design</option>
                    <option>Planning</option>
                    <option>Personal</option>
                  </select>
                </label>

                <label className="form-field">
                  Due date
                  <input
                    type="date"
                    name="dueDate"
                    value={form.dueDate}
                    onChange={handleFormChange}
                  />
                </label>
              </div>

              {formError && <p className="form-error">{formError}</p>}

              <div className="modal-actions">
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>

                <button className="save-button" type="submit">
                  {editingId ? "Save changes" : "Create task"}
                  <span>→</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {toast && (
        <div className="toast-message" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
