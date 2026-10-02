/**
 * Shared Context Provider
 * Wraps all services and provides them to plugins via React Context
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ISharedContext } from '../types';
import { Logger } from '../services/logger';
import { FrameworkEventBus } from '../services/eventBus';
import { SharedDataService } from '../services/sharedDataService';
import { SharePointClient } from '../services/spClientService';
import { GraphClient } from '../services/graphClientService';
import { AuthService } from '../services/authService';
import { ProxyMiddleware } from '../services/proxyMiddleware';
import { PowerPlatformService } from '../services/powerPlatformService';
import { EntraService } from '../services/entraService';
import { NotificationService } from '../services/notificationService';
import { PluginLoader } from '../services/pluginLoader';

/**
 * Shared context (filled by provider)
 */
const SharedContext = createContext<ISharedContext | null>(null);

/**
 * Props for SharedContextProvider
 */
interface SharedContextProviderProps {
  children: ReactNode;
  spfxContext: any; // SPFx context from web part
  pageContext: any; // SPFx pageContext
}

/**
 * Provider component that instantiates all services and provides them via context
 */
export const SharedContextProvider: React.FC<SharedContextProviderProps> = ({
  children,
  spfxContext,
  pageContext,
}) => {
  const [context, setContext] = useState<ISharedContext | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initializeContext = async () => {
      try {
        // Create logger first (used by other services)
        const logger = new Logger('SharedContext');

        // Create services in dependency order
        const eventBus = new FrameworkEventBus(logger);
        const dataService = new SharedDataService(logger);
        const authService = new AuthService(spfxContext, pageContext, logger);
        const proxyMiddleware = new ProxyMiddleware(logger);

        // Services that require auth or HTTP client
        const spClient = new SharePointClient(spfxContext, logger);
        const graphClient = new GraphClient(spfxContext, logger);
        const powerPlatformService = new PowerPlatformService(graphClient, logger);
        const entraService = new EntraService(graphClient, logger);
        const notificationService = new NotificationService(logger);

        // Get current user
        const currentUser = {
          id: pageContext.user.loginName,
          email: pageContext.user.email,
          displayName: pageContext.user.displayName,
        };

        // Create shared context object
        const sharedContext: ISharedContext = {
          eventBus,
          dataService,
          spClient,
          graphClient,
          authService,
          powerPlatformService,
          entraService,
          logger,
          notificationService,
          proxyMiddleware,
          currentUser,
          pageContext,
          pluginLoader: new PluginLoader(logger), // Added for Phase 3
        };

        logger.log('Shared context initialized successfully');
        setContext(sharedContext);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error('Failed to initialize shared context', error);
        setError(error);
      }
    };

    initializeContext();
  }, [spfxContext, pageContext]);

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red', fontWeight: 'bold' }}>
        Failed to initialize application context: {error.message}
      </div>
    );
  }

  if (!context) {
    return (
      <div style={{ padding: '20px', color: '#666' }}>
        Initializing application...
      </div>
    );
  }

  return (
    <SharedContext.Provider value={context}>
      {children}
    </SharedContext.Provider>
  );
};

/**
 * Hook to use shared context in plugins
 * Throws if used outside of SharedContextProvider
 */
export const useSharedContext = (): ISharedContext => {
  const context = useContext(SharedContext);

  if (!context) {
    throw new Error(
      'useSharedContext must be used within SharedContextProvider'
    );
  }

  return context;
};

/**
 * Export the context itself for direct access if needed
 */
export { SharedContext };
