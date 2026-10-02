import { ISharedContext } from './ISharedContext';

/**
 * Plugin lifecycle methods
 */
export interface IPluginLifecycle {
  /**
   * Initialize the plugin with shared context
   */
  initialize(context: ISharedContext): Promise<void>;

  /**
   * Render plugin UI
   */
  render(container: HTMLElement, context: ISharedContext): Promise<void>;

  /**
   * Dispose and clean up resources
   */
  dispose(): Promise<void>;
}

/**
 * Plugin manifest metadata
 */
export interface IPluginManifest {
  id: string;
  title: string;
  version: string;
  description?: string;
  url?: string;
  requiredScopes?: string[];
  minimumRoles?: string[];
  dataAccess?: string[];
  dependencies?: string[];
}

/**
 * Plugin interface
 */
export interface IPlugin extends IPluginLifecycle {
  id: string;
  title: string;
  version: string;
  description?: string;
  manifest?: IPluginManifest;
}

/**
 * Plugin loader result
 */
export interface ILoadedPlugin {
  id: string;
  instance: IPlugin;
  manifest: IPluginManifest;
  loadedAt: number;
  state: 'loading' | 'loaded' | 'error' | 'disposed';
  error?: Error;
}
