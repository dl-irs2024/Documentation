/**
 * LauncherHost Web Part Component
 * 
 * Main SPFx web part that:
 * 1. Provides shared context to all plugins
 * 2. Loads plugins from SharePoint Library registry
 * 3. Mounts plugins with error handling
 * 4. Supports both ClassicPage and ModernPage scopes
 */

import * as React from 'react';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import * as strings from 'LauncherHostWebPartStrings';

import { SharedContextProvider, useSharedContext } from '../context/SharedContext';
import { PluginHost } from '../components/PluginHost';
import { PluginLoader, IPluginRegistry } from '../services/pluginLoader';
import { Logger } from '../services/logger';
import styles from './LauncherHost.module.scss';

/**
 * LauncherHost Web Part Interface
 */
interface ILauncherHostWebPartProps {
  title: string;
  registryUrl: string;
  enableDebugMode: boolean;
}

/**
 * LauncherHost Web Part Component (inner)
 * Uses hooks to access shared context
 */
const LauncherHostInner: React.FC<{ webPartProps: ILauncherHostWebPartProps }> = ({
  webPartProps,
}) => {
  const context = useSharedContext();
  const [plugins, setPlugins] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadPlugins = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!webPartProps.registryUrl) {
          throw new Error(
            'Registry URL not configured. Please set it in web part properties.'
          );
        }

        context.logger.log(
          `Loading plugins from registry: ${webPartProps.registryUrl}`
        );

        // Load plugins via PluginLoader
        const loader = context.pluginLoader as PluginLoader;
        const loadedPlugins = await loader.loadPluginsFromRegistry(
          webPartProps.registryUrl,
          context
        );

        // Convert to array
        const pluginArray = Array.from(loadedPlugins.values())
          .filter((p) => p.status === 'loaded')
          .map((p) => ({
            id: p.id,
            title: p.manifest.title,
            instance: p.instance,
          }));

        context.logger.log(`Successfully loaded ${pluginArray.length} plugins`);
        setPlugins(pluginArray);

        // Publish framework ready event
        context.eventBus.publish({
          type: 'framework:ready',
          sourcePluginId: 'launcher-host',
          payload: {
            pluginCount: pluginArray.length,
            registryUrl: webPartProps.registryUrl,
          },
        });
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : String(err);
        context.logger.error('Failed to load plugins', err as Error);
        setError(errorMsg);

        context.notificationService.notify(
          `Failed to load plugins: ${errorMsg}`,
          'error'
        );
      } finally {
        setLoading(false);
      }
    };

    loadPlugins();
  }, [webPartProps.registryUrl, context]);

  if (loading) {
    return (
      <div className={styles.launcherHost}>
        <div className={styles.loadingContainer}>
          <p>Loading plugins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.launcherHost}>
        <div className={styles.errorContainer}>
          <h3>Error Loading Plugins</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (plugins.length === 0) {
    return (
      <div className={styles.launcherHost}>
        <div className={styles.emptyContainer}>
          <p>No plugins loaded. Check registry URL in web part properties.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.launcherHost}>
      <div className={styles.header}>
        <h2>{webPartProps.title}</h2>
        {webPartProps.enableDebugMode && (
          <span className={styles.debugBadge}>Debug Mode</span>
        )}
      </div>

      <div className={styles.pluginContainer}>
        {plugins.map((plugin) => (
          <div key={plugin.id} className={styles.pluginWrapper}>
            <div className={styles.pluginHeader}>
              <h3>{plugin.title}</h3>
              <span className={styles.pluginId}>{plugin.id}</span>
            </div>
            <PluginHost
              pluginId={plugin.id}
              plugin={plugin.instance}
              className={styles.pluginContent}
            />
          </div>
        ))}
      </div>

      {webPartProps.enableDebugMode && (
        <DebugPanel context={context} plugins={plugins} />
      )}
    </div>
  );
};

/**
 * Debug Panel (only shown if enabled)
 */
const DebugPanel: React.FC<{ context: any; plugins: any[] }> = ({
  context,
  plugins,
}) => {
  const [events, setEvents] = React.useState<any[]>([]);

  React.useEffect(() => {
    // Subscribe to all events for debugging
    const unsubscribe = context.eventBus.subscribe('*', (event: any) => {
      setEvents((prev) => [event, ...prev.slice(0, 49)]); // Keep last 50
    });

    return unsubscribe;
  }, [context]);

  return (
    <div style={{
      marginTop: '20px',
      padding: '16px',
      backgroundColor: '#f3f2f1',
      borderRadius: '4px',
      fontSize: '12px',
    }}>
      <h4>Debug Info</h4>
      <p>Plugins: {plugins.length}</p>
      <p>Recent Events: {events.length}</p>
      <details>
        <summary>Event History</summary>
        <pre style={{ fontSize: '10px', overflow: 'auto', maxHeight: '200px' }}>
          {JSON.stringify(events.slice(0, 10), null, 2)}
        </pre>
      </details>
    </div>
  );
};

/**
 * LauncherHost Web Part (SPFx entry point)
 */
export default class LauncherHostWebPart extends BaseClientSideWebPart<ILauncherHostWebPartProps> {
  private logger: Logger;

  protected onInit(): Promise<void> {
    this.logger = new Logger('LauncherHostWebPart');
    this.logger.log('Web part initialized');
    return Promise.resolve();
  }

  public render(): void {
    const element: React.ReactElement<{ webPartProps: ILauncherHostWebPartProps }> =
      React.createElement(
        SharedContextProvider,
        {
          spfxContext: this.context,
          pageContext: this.context.pageContext,
        },
        React.createElement(LauncherHostInner, {
          webPartProps: this.properties,
        })
      );

    this._renderReact(element);
  }

  /**
   * Custom render method using ReactDOM
   */
  private _renderReact(element: React.ReactElement): void {
    const ReactDOM = require('react-dom');
    const domElement: HTMLElement = this.domElement;

    try {
      ReactDOM.render(element, domElement);
    } catch (err) {
      this.logger.error('Error rendering React component', err as Error);
      domElement.innerHTML = `<div style="color: red; padding: 16px;">
        Error loading web part. Check browser console for details.
      </div>`;
    }
  }

  protected onDispose(): void {
    const ReactDOM = require('react-dom');
    ReactDOM.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription,
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('title', {
                  label: 'Web Part Title',
                  value: this.properties.title || 'Pluggable SPFx Launcher',
                }),
                PropertyPaneTextField('registryUrl', {
                  label: 'Plugin Registry URL',
                  description:
                    'URL to plugin-registry.json in SharePoint Library',
                  value: this.properties.registryUrl || '',
                  placeholder:
                    'https://tenant.sharepoint.com/sites/shared/PluginLibrary/plugin-registry.json',
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
