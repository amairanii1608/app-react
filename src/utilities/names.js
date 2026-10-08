export function formatAuthorName(name) {
  if (typeof name !== 'string' || !name.trim()) return 'NYSL family';
  return name.trim().split(/\s+/)[0].split(/[._]/)[0].slice(0, 80);
}
