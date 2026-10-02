import { ISharedContext, IPlugin } from '@types';

/**
 * Site Picker Plugin
 * Allows users to search for and select SharePoint sites
 */
export class SitePickerPlugin implements IPlugin {
  id = 'site-picker';
  title = 'Site Picker';
  version = '1.0.0';
  description = 'Search and select SharePoint sites';

  private unsubscribers: Array<() => void> = [];

  async initialize(context: ISharedContext): Promise<void> {
    context.logger.info('Site Picker plugin initialized');

    // Subscribe to relevant events
    const unsubscribeSiteSelected = context.eventBus.subscribe(
      'site:selected',
      async (event) => {
        context.logger.debug('Site selected event received:', event.payload);
      }
    );

    this.unsubscribers.push(unsubscribeSiteSelected);
  }

  async render(container: HTMLElement, context: ISharedContext): Promise<void> {
    context.logger.info('Rendering Site Picker plugin');

    // Create plugin container
    const pluginDiv = document.createElement('div');
    pluginDiv.className = 'site-picker-container';
    pluginDiv.innerHTML = `
      <div class="site-picker">
        <h2>Site Picker</h2>
        <input 
          type="text" 
          id="site-search" 
          placeholder="Search sites..."
          class="search-box"
        />
        <div id="site-results" class="results-container">
          <p>Enter a site name to search</p>
        </div>
      </div>
    `;

    container.appendChild(pluginDiv);

    // Add event listeners
    const searchBox = container.querySelector('#site-search') as HTMLInputElement;
    if (searchBox) {
      searchBox.addEventListener('input', async (e) => {
        const query = (e.target as HTMLInputElement).value;
        if (query.length > 2) {
          await this.searchSites(query, context);
        }
      });
    }
  }

  async dispose(): Promise<void> {
    // Cleanup subscriptions
    this.unsubscribers.forEach(fn => fn());
    this.unsubscribers = [];
  }

  private async searchSites(query: string, context: ISharedContext): Promise<void> {
    try {
      context.logger.info('Searching for sites:', query);

      // Use Microsoft Graph to search sites
      const sites = await context.graphClient.searchUsers(query); // Placeholder

      const resultsDiv = document.querySelector('#site-results');
      if (resultsDiv) {
        if (sites.length === 0) {
          resultsDiv.innerHTML = '<p>No sites found</p>';
          return;
        }

        resultsDiv.innerHTML = sites
          .map(
            (site: any) => `
          <div class="site-result" data-site-id="${site.id}">
            <h4>${site.displayName}</h4>
            <p>${site.email || 'No email'}</p>
          </div>
        `
          )
          .join('');

        // Add click handlers
        resultsDiv.querySelectorAll('.site-result').forEach((el) => {
          el.addEventListener('click', () => {
            const siteId = el.getAttribute('data-site-id');
            context.eventBus.publish({
              type: 'site:selected',
              sourcePluginId: 'site-picker',
              payload: { siteId },
              priority: 'high'
            });
          });
        });
      }
    } catch (err) {
      context.logger.error('Error searching sites:', err);
      context.notificationService.notify(
        'Failed to search sites',
        'error'
      );
    }
  }
}

/**
 * Plugin factory function
 */
export async function initialize(context: ISharedContext): Promise<IPlugin> {
  const plugin = new SitePickerPlugin();
  await plugin.initialize(context);
  return plugin;
}
