import { IAuthService, IUser } from '../types';
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';

/**
 * Authentication service for MSAL token management and account switching
 */
export class AuthService implements IAuthService {
  private msalInstance: PublicClientApplication;
  private pageContext: any;
  private currentUser: IUser | null = null;
  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  constructor(msalConfig: any, pageContext: any) {
    this.msalInstance = new PublicClientApplication(msalConfig);
    this.pageContext = pageContext;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<IUser> {
    if (this.currentUser) {
      return this.currentUser;
    }

    // Get from SPFx context (already authenticated)
    const user = this.pageContext.user;

    this.currentUser = {
      id: user.loginName.split('|')[user.loginName.split('|').length - 1],
      displayName: user.displayName,
      upn: user.loginName,
      email: user.email
    };

    return this.currentUser;
  }

  /**
   * Get auth token for specified scopes
   */
  async getAuthToken(scopes: string[]): Promise<string> {
    // Check cache
    const cacheKey = scopes.join('|');
    const cached = this.tokenCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    try {
      // Try silent acquisition
      const response = await this.msalInstance.acquireTokenSilent({
        scopes,
        account: this.msalInstance.getAllAccounts()[0]
      });

      if (response && response.accessToken) {
        // Cache token
        this.tokenCache.set(cacheKey, {
          token: response.accessToken,
          expiresAt: response.expiresOn ? response.expiresOn.getTime() : Date.now() + 3600000
        });

        return response.accessToken;
      }
    } catch (err) {
      console.warn('Silent token acquisition failed, attempting interactive...', err);
    }

    // Fall back to interactive
    try {
      const response = await this.msalInstance.acquireTokenPopup({
        scopes,
        account: this.msalInstance.getAllAccounts()[0] || undefined
      });

      if (response && response.accessToken) {
        this.tokenCache.set(cacheKey, {
          token: response.accessToken,
          expiresAt: response.expiresOn ? response.expiresOn.getTime() : Date.now() + 3600000
        });

        return response.accessToken;
      }
    } catch (err) {
      console.error('Error acquiring token:', err);
      throw err;
    }

    throw new Error('Failed to acquire authentication token');
  }

  /**
   * Switch between accounts (regular/admin)
   */
  async switchAccount(accountType: 'regular' | 'admin'): Promise<void> {
    const accounts = this.msalInstance.getAllAccounts();

    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    // For v1, simple account switch logic
    // In production, would check Entra group membership for admin role
    const targetAccount = accounts[0];

    try {
      await this.msalInstance.setActiveAccount(targetAccount);
      console.log(`Switched to ${accountType} account`);
    } catch (err) {
      console.error('Error switching account:', err);
      throw err;
    }
  }

  /**
   * Get current authentication context
   */
  async getCurrentContext(): Promise<{
    user: IUser;
    isAdmin: boolean;
    scopes: string[];
    expiresAt: number;
  }> {
    const user = await this.getCurrentUser();
    // TODO: Check Entra admin group membership
    const isAdmin = false;

    // Get expiration from cached tokens
    let expiresAt = Date.now() + 3600000; // Default 1 hour
    const cached = this.tokenCache.get('Sites.Read.All');
    if (cached) {
      expiresAt = cached.expiresAt;
    }

    return {
      user,
      isAdmin,
      scopes: ['Sites.Read.All'],
      expiresAt
    };
  }

  /**
   * Refresh token if needed
   */
  async refreshToken(): Promise<void> {
    // Clear cache to force refresh
    this.tokenCache.clear();

    try {
      await this.getAuthToken(['Sites.Read.All']);
    } catch (err) {
      console.error('Error refreshing token:', err);
      throw err;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      const account = this.msalInstance.getAllAccounts()[0];
      if (account) {
        await this.msalInstance.logoutPopup({
          account
        });
      }
      this.tokenCache.clear();
      this.currentUser = null;
    } catch (err) {
      console.error('Error during logout:', err);
      throw err;
    }
  }

  /**
   * Check if user has required scopes
   */
  async hasScopes(scopes: string[]): Promise<boolean> {
    try {
      // Try to get token for requested scopes
      // If successful, user has access
      await this.getAuthToken(scopes);
      return true;
    } catch (err) {
      // If token acquisition fails, user doesn't have scopes
      console.warn(`User does not have required scopes: ${scopes.join(', ')}`, err);
      return false;
    }
  }

  /**
   * Initialize MSAL
   */
  async initialize(): Promise<void> {
    try {
      await this.msalInstance.initialize();
      console.log('MSAL initialized');
    } catch (err) {
      console.error('Error initializing MSAL:', err);
      throw err;
    }
  }
}
