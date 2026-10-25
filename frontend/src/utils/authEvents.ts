type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeToAuthChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitAuthChange(): void {
  listeners.forEach((listener) => listener());
}
