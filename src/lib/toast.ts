type Listener = (message: string) => void;
const listeners = new Set<Listener>();

export function onError(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function showError(message: string) {
  for (const fn of listeners) fn(message);
}
