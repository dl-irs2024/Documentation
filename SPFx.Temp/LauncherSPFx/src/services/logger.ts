import { ILogger } from '../types';

/**
 * Logger service for consistent logging across the framework
 */
export class Logger implements ILogger {
  private prefix: string;
  private isDevelopment: boolean;

  constructor(prefix: string = '[SPFx Launcher]') {
    this.prefix = prefix;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Log debug message
   */
  public debug(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.debug(`${this.prefix} [DEBUG] ${message}`, data || '');
    }
  }

  /**
   * Log info message
   */
  public info(message: string, data?: any): void {
    console.log(`${this.prefix} [INFO] ${message}`, data || '');
  }

  /**
   * Log warning message
   */
  public warn(message: string, data?: any): void {
    console.warn(`${this.prefix} [WARN] ${message}`, data || '');
  }

  /**
   * Log error message
   */
  public error(message: string, data?: any): void {
    console.error(`${this.prefix} [ERROR] ${message}`, data || '');
  }

  /**
   * Create a child logger with a new prefix
   */
  public child(childPrefix: string): Logger {
    return new Logger(`${this.prefix} [${childPrefix}]`);
  }
}
