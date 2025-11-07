import * as SQLite from "expo-sqlite";

export type Task = {
  id: number;
  title: string;
  intensity: 1 | 2 | 3;
  dueISO?: string | null;
  done: 0 | 1;
  notifIds?: string | null;
};

let _db: SQLite.SQLiteDatabase | null = null;
export async function db() {
  _db ??= await SQLite.openDatabaseAsync("cryptid.db");
  return _db;
}

export async function dbInit() {
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
}

export async function addTask(t: { title: string; intensity: 1 | 2 | 3; dueISO?: string }) {
  const d = await db();
  const res = await d.runAsync(
    "INSERT INTO tasks (title,intensity,dueISO,done) VALUES (?,?,?,0)",
    [t.title, t.intensity, t.dueISO || null]
  );
  return res.lastInsertRowId as number;
}

export async function getTasks(): Promise<Task[]> {
  const d = await db();
  return (await d.getAllAsync("SELECT * FROM tasks ORDER BY done ASC, id DESC")) as Task[];
}

export async function getTaskById(id: number): Promise<Task | null> {
  const d = await db();
  const row = await d.getFirstAsync("SELECT * FROM tasks WHERE id=?", [id]);
  return (row as Task) || null;
}

export async function setNotifIds(id: number, ids: string[]) {
  const d = await db();
  await d.runAsync("UPDATE tasks SET notifIds=? WHERE id=?", [JSON.stringify(ids), id]);
}

export async function toggleDone(id: number, done: boolean) {
  const d = await db();
  await d.runAsync("UPDATE tasks SET done=? WHERE id=?", [done ? 1 : 0, id]);
}

export async function updateTask(t: Task) {
  const d = await db();
  await d.runAsync("UPDATE tasks SET title=?, intensity=?, dueISO=? WHERE id=?", [
    t.title,
    t.intensity,
    t.dueISO || null,
    t.id,
  ]);
}

export async function deleteTask(id: number) {
  const d = await db();
  await d.runAsync("DELETE FROM tasks WHERE id=?", [id]);
}
