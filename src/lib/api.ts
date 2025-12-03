// Placeholder pattern; swap in real REST calls if you add a cloud source.
export async function fetchExample(): Promise<{ id: number; title: string }[]> {
  const res = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}
