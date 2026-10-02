/**
 * User information
 */
export interface IUser {
  id: string;
  displayName: string;
  upn: string;
  email?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  photoUrl?: string;
}

/**
 * Authentication service for token management and account switching
 */
export interface IAuthService {
  /**
   * Get current authenticated user
   */
  getCurrentUser(): Promise<IUser>;

  /**
   * Get auth token for specified scopes
   */
  getAuthToken(scopes: string[]): Promise<string>;

  /**
   * Switch between accounts (regular/admin)
   */
  switchAccount(accountType: 'regular' | 'admin'): Promise<void>;

  /**
   * Get current authentication context
   */
  getCurrentContext(): Promise<{
    user: IUser;
    isAdmin: boolean;
    scopes: string[];
    expiresAt: number;
  }>;

  /**
   * Refresh token if needed
   */
  refreshToken(): Promise<void>;

  /**
   * Logout
   */
  logout(): Promise<void>;

  /**
   * Check if user has required scopes
   */
  hasScopes(scopes: string[]): Promise<boolean>;
}
