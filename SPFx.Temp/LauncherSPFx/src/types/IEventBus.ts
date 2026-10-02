/**
 * Framework event interface for inter-plugin communication
 */
export interface FrameworkEvent {
  type: string;
  sourcePluginId: string;
  payload: any;
  timestamp: number;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Event subscription handler
 */
export type EventHandler = (event: FrameworkEvent) => void | Promise<void>;

/**
 * Unsubscribe function
 */
export type UnsubscribeFn = () => void;

/**
 * Event subscription options
 */
export interface EventSubscriptionOptions {
  once?: boolean;
  priority?: number;
}

/**
 * Framework event bus for pub/sub communication
 */
export interface IEventBus {
  /**
   * Publish an event to all subscribers
   */
  publish(event: Omit<FrameworkEvent, 'timestamp'>): void;

  /**
   * Subscribe to events of a specific type
   */
  subscribe(
    eventType: string,
    handler: EventHandler,
    options?: EventSubscriptionOptions
  ): UnsubscribeFn;

  /**
   * Get event history (optional filtering by event type)
   */
  getHistory(eventType?: string): FrameworkEvent[];
}
