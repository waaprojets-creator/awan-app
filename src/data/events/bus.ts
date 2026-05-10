import type { EventMap } from './types';

type Handler<K extends keyof EventMap> = (data: EventMap[K]) => void;

class EventBusImpl {
  private listeners = new Map<string, Set<Handler<never>>>();

  on<K extends keyof EventMap>(event: K, handler: Handler<K>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler as Handler<never>);
    return () => this.off(event, handler);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners.get(event)?.forEach(h => h(data as never));
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<K>): void {
    this.listeners.get(event)?.delete(handler as Handler<never>);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBusImpl();
