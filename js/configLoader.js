export async function loadConfig(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load config: ${path}`);
  return await response.json();
}
