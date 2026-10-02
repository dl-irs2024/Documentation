import { IProxyMiddleware } from '../types';

/**
 * Proxy middleware for handling 407 authentication errors
 */
export class ProxyMiddleware implements IProxyMiddleware {
  private proxyCredentials: { username: string; password: string } | null = null;
  private retryAttempts = 3;
  private retryDelay = 1000; // ms

  /**
   * Handle proxy authentication errors
   */
  async handleProxyError(error: any): Promise<void> {
    if (error.status !== 407) {
      throw error;
    }

    console.warn('407 Proxy Authentication Required');

    // Prompt user for proxy credentials
    const username = prompt('Proxy username:');
    if (!username) {
      throw new Error('Proxy authentication cancelled');
    }

    const password = prompt('Proxy password:');
    if (!password) {
      throw new Error('Proxy authentication cancelled');
    }

    this.setProxyCredentials(username, password);

    // Note: Actual proxy credential passing would be handled by
    // the HTTP client (SPFx's spHttpClient or Fetch API)
    // This is a placeholder for the credential storage
  }

  /**
   * Set proxy credentials
   */
  public setProxyCredentials(username: string, password: string): void {
    this.proxyCredentials = { username, password };
    console.log('Proxy credentials configured');

    // Store in session (not localStorage for security)
    try {
      sessionStorage.setItem(
        'proxy-credentials',
        btoa(`${username}:${password}`)
      );
    } catch (err) {
      console.warn('Could not store proxy credentials:', err);
    }
  }

  /**
   * Get stored proxy credentials
   */
  public getProxyCredentials(): { username: string; password: string } | null {
    if (this.proxyCredentials) {
      return this.proxyCredentials;
    }

    try {
      const stored = sessionStorage.getItem('proxy-credentials');
      if (stored) {
        const [username, password] = atob(stored).split(':');
        return { username, password };
      }
    } catch (err) {
      console.warn('Could not retrieve proxy credentials:', err);
    }

    return null;
  }

  /**
   * Clear proxy credentials
   */
  public clearProxyCredentials(): void {
    this.proxyCredentials = null;
    try {
      sessionStorage.removeItem('proxy-credentials');
    } catch (err) {
      console.warn('Could not clear proxy credentials:', err);
    }
  }

  /**
   * Retry HTTP request with proxy handling
   */
  public async retryWithProxy<T>(
    requestFn: () => Promise<T>
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;

        if (error.status === 407) {
          console.warn(`407 error (attempt ${attempt + 1}/${this.retryAttempts})`);

          // Only prompt on first failure
          if (attempt === 0) {
            try {
              await this.handleProxyError(error);
            } catch (authErr) {
              throw authErr;
            }
          }

          // Wait before retry
          if (attempt < this.retryAttempts - 1) {
            await this.delay(this.retryDelay);
          }
        } else {
          // Not a 407 error, re-throw immediately
          throw error;
        }
      }
    }

    throw lastError;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Intercept fetch for proxy errors
   */
  public interceptFetch(): void {
    const originalFetch = window.fetch;

    window.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      try {
        return await originalFetch(input, init);
      } catch (error: any) {
        if (error.status === 407) {
          await this.handleProxyError(error);
          // Retry once
          return originalFetch(input, init);
        }
        throw error;
      }
    };

    console.log('Fetch interceptor installed for proxy handling');
  }
}
