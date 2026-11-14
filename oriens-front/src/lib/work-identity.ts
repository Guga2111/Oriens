/** Reject rounded JSON IDs/versions before they can become write preconditions. */
export function assertWorkIdentity(value: unknown, key = ''): void {
  if (value == null) return;
  const id = key === 'id' || key.endsWith('Id');
  const version = key === 'version' || key.endsWith('Version');
  if (id || version) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (version ? 0 : 1)) {
      throw new Error('Identificador ou versão inválidos na resposta.');
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => assertWorkIdentity(item, key.endsWith('Ids') ? 'id' : ''));
  } else if (typeof value === 'object') {
    Object.entries(value).forEach(([field, item]) => assertWorkIdentity(item, field));
  }
}
