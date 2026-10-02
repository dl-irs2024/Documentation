/**
 * Subscription callback for data changes
 */
export type DataChangeCallback = (data: any) => void;

/**
 * Unsubscribe function
 */
export type UnsubscribeFn = () => void;

/**
 * Shared data service for multi-level data storage and synchronization
 */
export interface ISharedDataService {
  /**
   * Set a value in the shared data store
   */
  set(key: string, value: any): void;

  /**
   * Get a value from the shared data store
   */
  get<T = any>(key: string): T | undefined;

  /**
   * Subscribe to changes on a specific key
   */
  subscribe(key: string, callback: DataChangeCallback): UnsubscribeFn;

  /**
   * Broadcast changes across browser tabs
   */
  broadcastChange(key: string, value: any): void;

  /**
   * Cache data using Cache API (for large datasets)
   */
  setCachedData(cacheKey: string, data: any): Promise<void>;

  /**
   * Retrieve cached data
   */
  getCachedData(cacheKey: string): Promise<any | null>;

  /**
   * Clear all data for a plugin (namespace isolation)
   */
  clearPluginData(pluginId: string): void;
}
