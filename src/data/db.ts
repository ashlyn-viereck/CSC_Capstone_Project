import * as SQLite from 'expo-sqlite';
import { useAuth } from '../state/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Task = {
  id: number;
  title: string;
  notes?: string | null;
  dueAt?: number | null;
  completed: 0 | 1;
  notifId?: string | null;
};

// Open a DB file per active user (e.g., planner_alice@example.com.db)
function dbForUser() {
  const email = useAuth.getState().user?.email?.toLowerCase() ?? 'guest';
  return SQLite.openDatabaseSync(`planner_${email}.db`);
}

// Initialize current user's DB schema
export async function init() {
  const db = dbForUser();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      notes TEXT,
      dueAt INTEGER,
      completed INTEGER NOT NULL DEFAULT 0,
      notifId TEXT
    );
  `);
}

// Helper to parse notification IDs stored as JSON
export function parseNotifIds(notifId?: string | null): string[] {
  if (!notifId) return [];
  try {
    const parsed = JSON.parse(notifId);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ------------- OPTIONAL: migrate once from old global DB ---------------
const MIGRATION_FLAG = 'tasks_migrated_from_global_v1';

export async function migrateFromGlobalIfNeeded() {
  const already = await AsyncStorage.getItem(MIGRATION_FLAG);
  if (already === '1') return;

  // Open old global DB; if it doesn't exist or has no data, this is a no-op.
  const old = SQLite.openDatabaseSync('planner.db');
  try {
    // Ensure old table exists (fails silently if it doesn't)
    const rows = await old.getAllAsync<Task>('SELECT * FROM tasks');
    if (!rows || rows.length === 0) {
      await AsyncStorage.setItem(MIGRATION_FLAG, '1');
      return;
    }

    const db = dbForUser();
    await db.execAsync('BEGIN');
    try {
      for (const t of rows) {
        await db.runAsync(
          'INSERT INTO tasks (title,notes,dueAt,completed,notifId) VALUES (?,?,?,?,?)',
          [t.title, t.notes ?? null, t.dueAt ?? null, t.completed ?? 0, t.notifId ?? null]
        );
      }
      await db.execAsync('COMMIT');
      await AsyncStorage.setItem(MIGRATION_FLAG, '1');

      // OPTIONAL (SDK 51+): delete the old DB file so it can't be reused
      // await SQLite.deleteDatabaseAsync('planner.db').catch(() => {});
      // If your Expo SDK doesn't support deleteDatabaseAsync, just leave the old file;
      // with the new code, it will never be used again anyway.
    } catch (e) {
      await db.execAsync('ROLLBACK');
      throw e;
    }
  } catch {
    // Old DB/table probably doesn't exist. Mark as done to avoid re-checking.
    await AsyncStorage.setItem(MIGRATION_FLAG, '1');
  }
}

// ---------------------- CRUD (all per-user) ----------------------------
export async function allTasks(): Promise<Task[]> {
  const db = dbForUser();
  return (await db.getAllAsync<Task>(
    'SELECT * FROM tasks ORDER BY completed ASC, dueAt ASC NULLS LAST, id DESC'
  )) ?? [];
}

export async function getTask(id: number): Promise<Task | undefined> {
  const db = dbForUser();
  return (await db.getFirstAsync<Task>('SELECT * FROM tasks WHERE id = ?', [id])) ?? undefined;
}

export async function insertTask(t: Omit<Task, 'id'>) {
  const db = dbForUser();
  const { lastInsertRowId } = await db.runAsync(
    'INSERT INTO tasks (title,notes,dueAt,completed,notifId) VALUES (?,?,?,?,?)',
    [t.title, t.notes ?? null, t.dueAt ?? null, t.completed ?? 0, t.notifId ?? null]
  );
  return lastInsertRowId as number;
}

export async function updateTask(id: number, patch: Partial<Task>) {
  const db = dbForUser();
  const current = await getTask(id);
  if (!current) return;
  const merged = { ...current, ...patch };
  await db.runAsync(
    'UPDATE tasks SET title=?, notes=?, dueAt=?, completed=?, notifId=? WHERE id=?',
    [merged.title, merged.notes ?? null, merged.dueAt ?? null, merged.completed ?? 0, merged.notifId ?? null, id]
  );
}

export async function deleteTask(id: number) {
  const db = dbForUser();
  await db.runAsync('DELETE FROM tasks WHERE id=?', [id]);
}
