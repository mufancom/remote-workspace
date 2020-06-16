/**
 * Save customize init script, set to empty or null to delete
 */
export function saveCustomInitScript(content: string): void {
  if (content === null || content === '') {
    localStorage.removeItem('customInitScript');
  } else {
    localStorage.setItem('customInitScript', content);
  }
}

export function loadCustomInitScript(): string {
  return localStorage.getItem('customInitScript') || '';
}
