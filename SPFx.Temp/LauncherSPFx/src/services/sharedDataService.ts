import {
  ISharedDataService,
  DataChangeCallback,
  UnsubscribeFn
} from '../types';

/**
 * Shared data service for multi-level data storage and synchronization
 */
export class SharedDataService implements ISharedDataService {
  private store = new Map<string, any>();
  private subscriptions = new Map<string, Set<DataChangeCallback>>();

  /**
   * Set a value in the shared data store
   */
  public set(key: string, value: any): void {
    const oldValue = this.store.get(key);
    this.store.set(key, value);

    // Notify subscribers
    if (this.subscriptions.has(key)) {
      const callbacks = this.subscriptions.get(key);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(value);
          } catch (err) {
            console.error(`Error in data subscription callback for key "${key}":`, err);
          }
        });
      }
    }

    // Persist simple data to localStorage
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      try {
        localStorage.setItem(`shared_${key}`, JSON.stringify(value));
      } catch (e) {
        console.warn('localStorage quota exceeded', e);
      }
    }
  }

  /**
   * Get a value from the shared data store
   */
  public get<T = any>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  /**
   * Subscribe to changes on a specific key
   */
  public subscribe(key: string, callback: DataChangeCallback): UnsubscribeFn {
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    const callbacks = this.subscriptions.get(key)!;
    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(key);
      }
    };
  }

  /**
   * Broadcast changes across browser tabs via BroadcastChannel
   */
  public broadcastChange(key: string, value: any): void {
    if ('BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('shared-data-service');
        channel.postMessage({
          key,
          value,
          source: 'shared-data-service',
          timestamp: Date.now()
        });
        channel.close();
      } catch (err) {
        console.warn('BroadcastChannel not available:', err);
      }
    }
  }

  /**
   * Cache data using Cache API (for large datasets)
   */
  public async setCachedData(cacheKey: string, data: any): Promise<void> {
    if ('caches' in window) {
      try {
        const cache = await caches.open('app-data-v1');
        const response = new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' }
        });
        await cache.put(cacheKey, response);
      } catch (err) {
        console.warn('Cache API error:', err);
      }
    }
  }

  /**
   * Retrieve cached data
   */
  public async getCachedData(cacheKey: string): Promise<any | null> {
    if ('caches' in window) {
      try {
        const cache = await caches.open('app-data-v1');
        const response = await cache.match(cacheKey);
        if (response) {
          return response.json();
        }
      } catch (err) {
        console.warn('Cache API error:', err);
      }
    }
    return null;
  }

  /**
   * Clear all data for a plugin (namespace isolation)
   */
  public clearPluginData(pluginId: string): void {
    // Clear memory
    const keysToDelete: string[] = [];
    this.store.forEach((value, key) => {
      if (key.startsWith(`${pluginId}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.store.delete(key));

    // Clear localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes(pluginId)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Get all keys in store
   */
  public getAllKeys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.store.clear();
    this.subscriptions.clear();
  }
}
