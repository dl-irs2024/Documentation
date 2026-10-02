import { IEventBus } from './IEventBus';
import { ISharedDataService } from './IDataService';
import { ISPClient } from './ISPClient';
import { IAuthService, IUser } from './IAuthService';

/**
 * Microsoft Graph client for user/group queries
 */
export interface IGraphClient {
  /**
   * Search for users in directory
   */
  searchUsers(query: string): Promise<IUser[]>;

  /**
   * Get user's direct reports
   */
  getDirectReports(userId: string): Promise<IUser[]>;

  /**
   * Get user's manager
   */
  getManager(userId: string): Promise<IUser | null>;

  /**
   * Get user's photo as blob
   */
  getUserPhoto(userId: string): Promise<Blob | null>;

  /**
   * Get group members
   */
  getGroupMembers(groupId: string): Promise<IUser[]>;
}

/**
 * Power Platform service for Dataverse and Canvas Apps
 */
export interface IPowerPlatformService {
  /**
   * Query Dataverse tables (read-only)
   */
  queryDataverse(
    environmentUrl: string,
    query: string
  ): Promise<any[]>;

  /**
   * Get available environments for user
   */
  getEnvironments(): Promise<any[]>;

  /**
   * Get connected apps
   */
  getConnectedApps(): Promise<any[]>;
}

/**
 * Entra (Azure AD) service
 */
export interface IEntraService {
  /**
   * Get groups for current user
   */
  getGroups(): Promise<any[]>;

  /**
   * Get group members
   */
  getGroupMembers(groupId: string): Promise<IUser[]>;

  /**
   * Search directory
   */
  searchDirectory(query: string): Promise<any[]>;

  /**
   * Get user manager chain (walk up reporting hierarchy)
   */
  getUserManagerChain(userId: string): Promise<IUser[]>;
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

/**
 * Notification service
 */
export interface INotificationService {
  notify(message: string, type: 'info' | 'success' | 'warning' | 'error'): void;
  openDialog(title: string, content: string): Promise<boolean>;
  downloadFile(filename: string, data: Blob): void;
}

/**
 * Proxy middleware for handling 407 errors
 */
export interface IProxyMiddleware {
  /**
   * Handle proxy authentication errors
   */
  handleProxyError(error: any): Promise<void>;

  /**
   * Set proxy credentials
   */
  setProxyCredentials(username: string, password: string): void;
}

/**
 * Shared context provided to all plugins
 */
export interface ISharedContext {
  // Core services
  eventBus: IEventBus;
  dataService: ISharedDataService;
  spClient: ISPClient;
  graphClient: IGraphClient;
  authService: IAuthService;
  powerPlatformService: IPowerPlatformService;
  entraService: IEntraService;

  // Utilities
  logger: ILogger;
  notificationService: INotificationService;
  proxyMiddleware: IProxyMiddleware;

  // Plugin loader
  pluginLoader?: any; // PluginLoader instance (optional)

  // Current user context
  currentUser: IUser;

  // SPFx context
  pageContext: any;
}
