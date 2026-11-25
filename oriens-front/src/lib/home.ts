const internalPaths = new Set(['/home', '/tasks', '/projects', '/all-data', '/stats', '/financial', '/config', '/support']);

export function validQuickLink(value: string) {
  const url = value.trim();
  if (!url || url.length > 2048 || /[\\\s]/.test(url)) return false;
  if (url.startsWith('/') && !url.startsWith('//')) {
    const path = url.split(/[?#]/)[0];
    return internalPaths.has(path) || /^\/tasks\/project\/[1-9][0-9]*$/.test(path);
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && !!parsed.hostname && !parsed.username && !parsed.password;
  } catch { return false; }
}
