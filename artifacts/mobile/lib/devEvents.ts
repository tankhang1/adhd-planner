// Tiny event bus for dev-only helpers (screenshot scenes).
type Fn = () => void;
const listeners = new Map<string, Set<Fn>>();
export const devEvents = {
  on(name: string, fn: Fn) {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name)!.add(fn);
    return () => {
      listeners.get(name)?.delete(fn);
    };
  },
  emit(name: string) {
    listeners.get(name)?.forEach((fn) => fn());
  },
};
