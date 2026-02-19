import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const STORAGE_KEY = "kavia.todo.tasks.v1";

/**
 * @typedef {"all"|"active"|"completed"} FilterValue
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {boolean} completed
 * @property {number} createdAt
 * @property {number} updatedAt
 */

/**
 * Create a simple unique id without extra dependencies.
 * @returns {string}
 */
function makeId() {
  // Enough uniqueness for localStorage-based app usage.
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Safely read tasks from localStorage.
 * @returns {Task[]}
 */
function loadTasksFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Basic shape normalization
    return parsed
      .map((t) => ({
        id: String(t.id ?? makeId()),
        title: String(t.title ?? "").trim(),
        completed: Boolean(t.completed),
        createdAt: Number(t.createdAt ?? Date.now()),
        updatedAt: Number(t.updatedAt ?? Date.now()),
      }))
      .filter((t) => t.title.length > 0);
  } catch {
    return [];
  }
}

/**
 * Safely write tasks to localStorage.
 * @param {Task[]} tasks
 */
function saveTasksToStorage(tasks) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Ignore quota / privacy mode errors; app still works in-memory.
  }
}

// PUBLIC_INTERFACE
function App() {
  /** @type {[Task[], Function]} */
  const [tasks, setTasks] = useState(() => loadTasksFromStorage());
  /** @type {[FilterValue, Function]} */
  const [filter, setFilter] = useState("all");

  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const newInputRef = useRef(null);
  const editInputRef = useRef(null);

  // Persist tasks after any change
  useEffect(() => {
    saveTasksToStorage(tasks);
  }, [tasks]);

  // Focus edit input when entering edit mode
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const counts = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    return { total, completed, active: total - completed };
  }, [tasks]);

  const visibleTasks = useMemo(() => {
    switch (filter) {
      case "active":
        return tasks.filter((t) => !t.completed);
      case "completed":
        return tasks.filter((t) => t.completed);
      default:
        return tasks;
    }
  }, [tasks, filter]);

  // PUBLIC_INTERFACE
  const addTask = () => {
    const title = newTitle.trim();
    if (!title) return;

    const now = Date.now();
    /** @type {Task} */
    const task = {
      id: makeId(),
      title,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    setTasks((prev) => [task, ...prev]);
    setNewTitle("");
    // keep flow fast on desktop
    newInputRef.current?.focus();
  };

  // PUBLIC_INTERFACE
  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditingTitle("");
    }
  };

  // PUBLIC_INTERFACE
  const toggleCompleted = (id) => {
    const now = Date.now();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed, updatedAt: now } : t
      )
    );
  };

  // PUBLIC_INTERFACE
  const startEditing = (task) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
  };

  // PUBLIC_INTERFACE
  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  // PUBLIC_INTERFACE
  const saveEditing = () => {
    if (!editingId) return;
    const title = editingTitle.trim();
    if (!title) return; // keep user in edit mode if empty

    const now = Date.now();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingId ? { ...t, title, updatedAt: now } : t
      )
    );
    setEditingId(null);
    setEditingTitle("");
  };

  // PUBLIC_INTERFACE
  const clearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
  };

  // PUBLIC_INTERFACE
  const toggleAll = () => {
    if (tasks.length === 0) return;
    const shouldCompleteAll = tasks.some((t) => !t.completed);
    const now = Date.now();
    setTasks((prev) =>
      prev.map((t) =>
        t.completed === shouldCompleteAll
          ? t
          : { ...t, completed: shouldCompleteAll, updatedAt: now }
      )
    );
  };

  const onSubmitNew = (e) => {
    e.preventDefault();
    addTask();
  };

  return (
    <div className="App">
      <main className="todo-shell">
        <header className="todo-header">
          <div>
            <h1 className="todo-title">To‑Do</h1>
            <p className="todo-subtitle">
              Keep it simple. Stay consistent. Tasks persist after refresh.
            </p>
          </div>

          <div className="todo-stats" aria-label="Task statistics">
            <span className="pill" title="Active tasks">
              {counts.active} active
            </span>
            <span className="pill pill-secondary" title="Completed tasks">
              {counts.completed} done
            </span>
          </div>
        </header>

        <section className="todo-card" aria-label="Task manager">
          <form className="add-row" onSubmit={onSubmitNew}>
            <label className="sr-only" htmlFor="new-task">
              Add a task
            </label>
            <input
              id="new-task"
              ref={newInputRef}
              className="text-input"
              placeholder="Add a task (e.g., “Schedule dentist appointment”)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />

            <button
              className="btn btn-primary"
              type="submit"
              disabled={!newTitle.trim()}
            >
              Add
            </button>

            <button
              className="btn btn-ghost"
              type="button"
              onClick={toggleAll}
              disabled={tasks.length === 0}
              aria-label="Toggle all tasks complete"
              title="Toggle all"
            >
              Toggle all
            </button>
          </form>

          <div className="list-wrap" aria-label="Task list">
            {tasks.length === 0 ? (
              <div className="empty">
                <div className="empty-title">No tasks yet</div>
                <div className="empty-desc">
                  Add your first task above. Your list will be saved
                  automatically.
                </div>
              </div>
            ) : (
              <ul className="task-list">
                {visibleTasks.map((task) => {
                  const isEditing = editingId === task.id;
                  return (
                    <li
                      key={task.id}
                      className={`task ${task.completed ? "is-completed" : ""}`}
                    >
                      <div className="task-left">
                        <input
                          className="checkbox"
                          type="checkbox"
                          checked={task.completed}
                          onChange={() => toggleCompleted(task.id)}
                          aria-label={`Mark "${task.title}" as ${
                            task.completed ? "not completed" : "completed"
                          }`}
                        />

                        {!isEditing ? (
                          <span className="task-title">{task.title}</span>
                        ) : (
                          <div className="edit-wrap">
                            <label className="sr-only" htmlFor={`edit-${task.id}`}>
                              Edit task title
                            </label>
                            <input
                              id={`edit-${task.id}`}
                              ref={editInputRef}
                              className="text-input text-input-sm"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditing();
                                if (e.key === "Escape") cancelEditing();
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={saveEditing}
                              disabled={!editingTitle.trim()}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="task-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => startEditing(task)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteTask(task.id)}
                            aria-label={`Delete "${task.title}"`}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <footer className="todo-footer">
            <div
              className="filters"
              role="tablist"
              aria-label="Task filters"
            >
              <button
                type="button"
                className={`filter ${filter === "all" ? "is-active" : ""}`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`filter ${filter === "active" ? "is-active" : ""}`}
                onClick={() => setFilter("active")}
              >
                Active
              </button>
              <button
                type="button"
                className={`filter ${
                  filter === "completed" ? "is-active" : ""
                }`}
                onClick={() => setFilter("completed")}
              >
                Completed
              </button>
            </div>

            <div className="footer-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={clearCompleted}
                disabled={counts.completed === 0}
              >
                Clear completed
              </button>
            </div>
          </footer>
        </section>

        <p className="todo-hint">
          Tip: Press <kbd>Esc</kbd> to cancel editing, <kbd>Enter</kbd> to save.
        </p>
      </main>
    </div>
  );
}

export default App;
