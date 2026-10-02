/**
 * Plugin Loader Service
 * Dynamically loads plugins from a SharePoint Library manifest registry
 */

import { IPlugin, ISharedContext } from '../types';
import { Logger } from './logger';

/**
 * Represents a loaded plugin with its metadata and instance
 */
export interface ILoadedPlugin {
  id: string;
  manifest: IPluginManifest;
  instance: IPlugin;
  dependencies: string[];
  status: 'loading' | 'loaded' | 'error';
  error?: Error;
}

/**
 * Plugin manifest from registry
 */
export interface IPluginManifest {
  id: string;
  title: string;
  version: string;
  description?: string;
  entryPoint: string; // URL to plugin JavaScript bundle
  requiredScopes?: string[];
  minimumRoles?: string[];
  dependencies?: string[]; // IDs of other plugins this depends on
}

/**
 * Plugin registry (stored in SharePoint Library)
 */
export interface IPluginRegistry {
  version: string;
  lastUpdated: string;
  plugins: IPluginManifest[];
}

/**
 * PluginLoader service for dynamic plugin loading
 * Handles manifest parsing, dependency resolution, and error handling
 */
export class PluginLoader {
  private logger: Logger;
  private loadedPlugins: Map<string, ILoadedPlugin> = new Map();
  private loadingPromises: Map<string, Promise<ILoadedPlugin>> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger || new Logger('PluginLoader');
  }

  /**
   * Load all plugins from a registry manifest
   * @param registryUrl URL to plugin-registry.json in SharePoint Library
   * @param context Shared context for plugin initialization
   * @returns Map of loaded plugins by ID
   */
  async loadPluginsFromRegistry(
    registryUrl: string,
    context: ISharedContext
  ): Promise<Map<string, ILoadedPlugin>> {
    try {
      // Fetch registry manifest
      const registryResponse = await fetch(registryUrl);
      if (!registryResponse.ok) {
        throw new Error(`Failed to fetch registry: ${registryResponse.status}`);
      }

      const registry: IPluginRegistry = await registryResponse.json();
      this.logger.log(`Loaded registry with ${registry.plugins.length} plugins`);

      // Topological sort by dependencies
      const sortedManifests = this.topologicalSort(registry.plugins);

      // Load plugins in dependency order
      for (const manifest of sortedManifests) {
        await this.loadPlugin(manifest, context);
      }

      return this.loadedPlugins;
    } catch (error) {
      this.logger.error('Failed to load plugins from registry', error as Error);
      throw error;
    }
  }

  /**
   * Load a single plugin
   * @param manifest Plugin manifest
   * @param context Shared context
   */
  async loadPlugin(
    manifest: IPluginManifest,
    context: ISharedContext
  ): Promise<ILoadedPlugin> {
    // Check if already loading or loaded
    if (this.loadingPromises.has(manifest.id)) {
      return this.loadingPromises.get(manifest.id)!;
    }

    if (this.loadedPlugins.has(manifest.id)) {
      const loaded = this.loadedPlugins.get(manifest.id)!;
      if (loaded.status === 'loaded') {
        return loaded;
      }
    }

    // Create loading promise
    const loadPromise = this._loadPluginAsync(manifest, context);
    this.loadingPromises.set(manifest.id, loadPromise);

    try {
      const loaded = await loadPromise;
      return loaded;
    } finally {
      this.loadingPromises.delete(manifest.id);
    }
  }

  /**
   * Internal async load implementation
   */
  private async _loadPluginAsync(
    manifest: IPluginManifest,
    context: ISharedContext
  ): Promise<ILoadedPlugin> {
    const loadedPlugin: ILoadedPlugin = {
      id: manifest.id,
      manifest,
      instance: null as any,
      dependencies: manifest.dependencies || [],
      status: 'loading',
    };

    try {
      // Load dependencies first
      if (manifest.dependencies && manifest.dependencies.length > 0) {
        for (const depId of manifest.dependencies) {
          const depPlugin = this.loadedPlugins.get(depId);
          if (!depPlugin || depPlugin.status !== 'loaded') {
            throw new Error(
              `Dependency ${depId} not loaded for plugin ${manifest.id}`
            );
          }
        }
      }

      // Check permissions
      if (manifest.requiredScopes) {
        const authorized = await context.authService.hasScopes(
          manifest.requiredScopes
        );
        if (!authorized) {
          throw new Error(
            `Missing required scopes: ${manifest.requiredScopes.join(', ')}`
          );
        }
      }

      // Dynamically import plugin
      this.logger.log(`Loading plugin: ${manifest.id} from ${manifest.entryPoint}`);
      const pluginModule = await import(manifest.entryPoint);

      // Get plugin class (default export or named export)
      const PluginClass =
        pluginModule.default || pluginModule[this.toPascalCase(manifest.id)];

      if (!PluginClass) {
        throw new Error(
          `Plugin class not found in ${manifest.entryPoint}. Expected default export or ${this.toPascalCase(manifest.id)}`
        );
      }

      // Instantiate plugin
      const instance: IPlugin = new PluginClass();

      // Initialize plugin
      await instance.initialize(context);

      loadedPlugin.instance = instance;
      loadedPlugin.status = 'loaded';

      this.loadedPlugins.set(manifest.id, loadedPlugin);
      this.logger.log(`Plugin loaded: ${manifest.id}`);

      return loadedPlugin;
    } catch (error) {
      loadedPlugin.status = 'error';
      loadedPlugin.error = error as Error;

      this.logger.error(
        `Failed to load plugin ${manifest.id}`,
        error as Error
      );

      // Continue loading other plugins (graceful degradation)
      this.loadedPlugins.set(manifest.id, loadedPlugin);

      return loadedPlugin;
    }
  }

  /**
   * Get a loaded plugin by ID
   */
  getPlugin(id: string): ILoadedPlugin | undefined {
    return this.loadedPlugins.get(id);
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): ILoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Unload a plugin (call dispose)
   */
  async unloadPlugin(id: string): Promise<void> {
    const loaded = this.loadedPlugins.get(id);
    if (!loaded) return;

    try {
      if (loaded.instance && loaded.instance.dispose) {
        await loaded.instance.dispose();
      }
      this.loadedPlugins.delete(id);
      this.logger.log(`Plugin unloaded: ${id}`);
    } catch (error) {
      this.logger.error(`Error unloading plugin ${id}`, error as Error);
    }
  }

  /**
   * Unload all plugins
   */
  async unloadAllPlugins(): Promise<void> {
    const ids = Array.from(this.loadedPlugins.keys());
    for (const id of ids) {
      await this.unloadPlugin(id);
    }
  }

  /**
   * Topologically sort manifests by dependencies
   * Ensures dependencies are loaded before dependents
   */
  private topologicalSort(manifests: IPluginManifest[]): IPluginManifest[] {
    const sorted: IPluginManifest[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const manifestMap = new Map(manifests.map((m) => [m.id, m]));

    const visit = (id: string): void => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected: ${id}`);
      }

      const manifest = manifestMap.get(id);
      if (!manifest) {
        throw new Error(`Plugin ${id} referenced but not found in registry`);
      }

      visiting.add(id);

      // Visit dependencies first
      if (manifest.dependencies) {
        for (const depId of manifest.dependencies) {
          visit(depId);
        }
      }

      visiting.delete(id);
      visited.add(id);
      sorted.push(manifest);
    };

    // Visit all plugins
    for (const manifest of manifests) {
      visit(manifest.id);
    }

    return sorted;
  }

  /**
   * Convert kebab-case to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}
