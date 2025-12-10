import { supabase } from '../lib/supabaseClient';

export type Task = {
  id: number;
  profile_id: string;
  title: string;
  notes?: string | null;
  due_at?: number | null;
  completed: boolean;
  notif_ids?: string[]; 
};

export async function allTasks(profileId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('profile_id', profileId)
    .order('completed')
    .order('due_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getTask(id: number, profileId: string): Promise<Task | undefined> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('profile_id', profileId)
    .single();

  if (error) return undefined;
  return data || undefined;
}

export async function insertTask(task: Omit<Task, 'id'>) {
  const { data, error } = await supabase.from('tasks').insert(task).select().single();
  if (error) throw error;
  return data.id;
}

export async function updateTask(id: number, profileId: string, patch: Partial<Task>) {
  const { error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .eq('profile_id', profileId);

  if (error) throw error;
}

export async function deleteTask(id: number, profileId: string) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('profile_id', profileId);

  if (error) throw error;
}


