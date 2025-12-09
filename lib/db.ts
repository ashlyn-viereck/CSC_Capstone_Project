import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";

export type Task = {
  id: number;
  title: string;
  intensity: 1 | 2 | 3;
  dueISO?: string | null;
  done: 0 | 1;
  notifIds?: string | null;
};

const isWeb = Platform.OS === "web";

// --- Web fallback using localStorage (keeps API shape for convenience) ---
const STORAGE_KEY = "cryptid_tasks_v1";

function loadWebTasks(): Task[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return [];
    return JSON.parse(raw) as Task[];
  } catch (e) {
    console.warn("Failed to read tasks from localStorage", e);
    return [];
  }
}

function saveWebTasks(tasks: Task[]) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.warn("Failed to save tasks to localStorage", e);
  }
}

  // Platform-specific implementations are assigned to these exported variables
  export let db: () => Promise<SQLite.SQLiteDatabase>;
  export let dbInit: () => Promise<void>;
  export let addTask: (t: { title: string; intensity: 1 | 2 | 3; dueISO?: string }) => Promise<number>;
  export let getTasks: () => Promise<Task[]>;
  export let getTaskById: (id: number) => Promise<Task | null>;
  export let setNotifIds: (id: number, ids: string[]) => Promise<void>;
  export let toggleDone: (id: number, done: boolean) => Promise<void>;
  export let updateTask: (t: Task) => Promise<void>;
  export let deleteTask: (id: number) => Promise<void>;

if (!isWeb) {
  let _db: SQLite.SQLiteDatabase | null = null;

  db = async () => {
    _db ??= await SQLite.openDatabaseAsync("cryptid.db");
    return _db;
  };

  dbInit = async () => {
    const d = await db();
    await d.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        intensity INTEGER NOT NULL DEFAULT 2,
        dueISO TEXT,
        done INTEGER NOT NULL DEFAULT 0,
        notifIds TEXT
      );
    `);
  };

  addTask = async (t) => {
    const d = await db();
    const res = await d.runAsync(
      "INSERT INTO tasks (title,intensity,dueISO,done) VALUES (?,?,?,0)",
      [t.title, t.intensity, t.dueISO || null]
    );
    return res.lastInsertRowId as number;
  };

  getTasks = async () => {
    const d = await db();
    return (await d.getAllAsync("SELECT * FROM tasks ORDER BY done ASC, id DESC")) as Task[];
  };

  getTaskById = async (id) => {
    const d = await db();
    const row = await d.getFirstAsync("SELECT * FROM tasks WHERE id=?", [id]);
    return (row as Task) || null;
  };

  setNotifIds = async (id, ids) => {
    const d = await db();
    await d.runAsync("UPDATE tasks SET notifIds=? WHERE id=?", [JSON.stringify(ids), id]);
  };

  toggleDone = async (id, done) => {
    const d = await db();
    await d.runAsync("UPDATE tasks SET done=? WHERE id=?", [done ? 1 : 0, id]);
  };

  updateTask = async (t) => {
    const d = await db();
    await d.runAsync("UPDATE tasks SET title=?, intensity=?, dueISO=? WHERE id=?", [
      t.title,
      t.intensity,
      t.dueISO || null,
      t.id,
    ]);
  };

  deleteTask = async (id) => {
    const d = await db();
    await d.runAsync("DELETE FROM tasks WHERE id=?", [id]);
  };
} else {
  // --- Web implementations ---
  db = async () => null as unknown as SQLite.SQLiteDatabase;

  dbInit = async () => {
    // ensure key exists; nothing else required
    const tasks = loadWebTasks();
    saveWebTasks(tasks);
  };

  addTask = async (t) => {
    const tasks = loadWebTasks();
    const nextId = tasks.length ? Math.max(...tasks.map((x) => x.id)) + 1 : 1;
    const newTask: Task = { id: nextId, title: t.title, intensity: t.intensity, dueISO: t.dueISO || null, done: 0, notifIds: null };
    tasks.unshift(newTask);
    saveWebTasks(tasks);
    return nextId;
  };

  getTasks = async () => {
    const tasks = loadWebTasks();
    // order: done ASC, id DESC to match native
    return tasks.sort((a, b) => a.done - b.done || b.id - a.id);
  };

  getTaskById = async (id) => {
    const tasks = loadWebTasks();
    return tasks.find((t) => t.id === id) || null;
  };

  setNotifIds = async (id, ids) => {
    const tasks = loadWebTasks();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;
    tasks[idx].notifIds = JSON.stringify(ids);
    saveWebTasks(tasks);
  };

  toggleDone = async (id, done) => {
    const tasks = loadWebTasks();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;
    tasks[idx].done = done ? 1 : 0;
    saveWebTasks(tasks);
  };

  updateTask = async (t) => {
    const tasks = loadWebTasks();
    const idx = tasks.findIndex((x) => x.id === t.id);
    if (idx === -1) return;
    tasks[idx] = { ...tasks[idx], title: t.title, intensity: t.intensity, dueISO: t.dueISO || null };
    saveWebTasks(tasks);
  };

  deleteTask = async (id) => {
    const tasks = loadWebTasks();
    const filtered = tasks.filter((t) => t.id !== id);
    saveWebTasks(filtered);
  };
}
