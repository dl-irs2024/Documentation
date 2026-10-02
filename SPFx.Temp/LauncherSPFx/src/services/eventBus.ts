import { EventEmitter } from 'events';
import {
  IEventBus,
  FrameworkEvent,
  EventHandler,
  UnsubscribeFn,
  EventSubscriptionOptions
} from '../types';

/**
 * Framework event bus implementation for inter-plugin communication
 */
export class FrameworkEventBus extends EventEmitter implements IEventBus {
  private eventHistory: FrameworkEvent[] = [];
  private readonly maxHistorySize = 100;

  /**
   * Publish an event to all subscribers
   */
  public publish(event: Omit<FrameworkEvent, 'timestamp'>): void {
    const fullEvent: FrameworkEvent = {
      ...event,
      timestamp: Date.now()
    };

    // Emit to subscribers
    this.emit(event.type, fullEvent);

    // Keep history for debugging/replay
    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Log high-priority events
    if (fullEvent.priority === 'high') {
      console.log(`[EVENT] ${event.type}:`, fullEvent.payload);
    }
  }

  /**
   * Subscribe to events of a specific type
   */
  public subscribe(
    eventType: string,
    handler: EventHandler,
    options?: EventSubscriptionOptions
  ): UnsubscribeFn {
    if (options?.once) {
      this.once(eventType, handler);
    } else {
      this.on(eventType, handler);
    }

    // Return unsubscribe function
    return () => this.off(eventType, handler);
  }

  /**
   * Get event history, optionally filtered by event type
   */
  public getHistory(eventType?: string): FrameworkEvent[] {
    if (!eventType) {
      return [...this.eventHistory];
    }
    return this.eventHistory.filter(e => e.type === eventType);
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get number of listeners for an event type
   */
  public getListenerCount(eventType: string): number {
    return this.listenerCount(eventType);
  }
}
