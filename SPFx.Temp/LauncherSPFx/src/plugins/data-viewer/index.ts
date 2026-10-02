import { ISharedContext, IPlugin } from '@types';

/**
 * Data Viewer Plugin
 * Displays SharePoint lists and Dataverse tables in tabular format
 */
export class DataViewerPlugin implements IPlugin {
  id = 'data-viewer';
  title = 'Data Viewer';
  version = '1.0.0';
  description = 'View SharePoint lists and Dataverse tables';

  private unsubscribers: Array<() => void> = [];
  private currentSite: any = null;

  async initialize(context: ISharedContext): Promise<void> {
    context.logger.info('Data Viewer plugin initialized');

    // Subscribe to site selection
    const unsubscribeSiteLoaded = context.eventBus.subscribe(
      'site:loaded',
      async (event) => {
        this.currentSite = event.payload.site;
        context.logger.debug('Site loaded:', this.currentSite);
      }
    );

    this.unsubscribers.push(unsubscribeSiteLoaded);
  }

  async render(container: HTMLElement, context: ISharedContext): Promise<void> {
    context.logger.info('Rendering Data Viewer plugin');

    const pluginDiv = document.createElement('div');
    pluginDiv.className = 'data-viewer-container';
    pluginDiv.innerHTML = `
      <div class="data-viewer">
        <h2>Data Viewer</h2>
        <div class="tabs">
          <button class="tab-button active" data-tab="sp-lists">SharePoint Lists</button>
          <button class="tab-button" data-tab="dataverse">Dataverse</button>
          <button class="tab-button" data-tab="events">Events</button>
        </div>
        
        <div id="sp-lists-tab" class="tab-content active">
          <div class="lists-container">
            <p>Select a site first, then choose a list to view</p>
          </div>
        </div>
        
        <div id="dataverse-tab" class="tab-content">
          <div class="dataverse-container">
            <p>Dataverse access coming soon</p>
          </div>
        </div>
        
        <div id="events-tab" class="tab-content">
          <div class="events-container">
            <p>Event monitor coming soon</p>
          </div>
        </div>
      </div>
    `;

    container.appendChild(pluginDiv);

    // Setup tab switching
    const tabButtons = container.querySelectorAll('.tab-button');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tabId = (e.target as HTMLElement).getAttribute('data-tab');
        this.switchTab(tabId, container);
      });
    });
  }

  async dispose(): Promise<void> {
    // Cleanup subscriptions
    this.unsubscribers.forEach(fn => fn());
    this.unsubscribers = [];
  }

  private switchTab(tabId: string | null, container: HTMLElement): void {
    if (!tabId) return;

    // Hide all tabs
    container.querySelectorAll('.tab-content').forEach((tab) => {
      tab.classList.remove('active');
    });

    // Remove active class from buttons
    container.querySelectorAll('.tab-button').forEach((btn) => {
      btn.classList.remove('active');
    });

    // Show selected tab
    const tabElement = container.querySelector(`#${tabId}-tab`);
    if (tabElement) {
      tabElement.classList.add('active');
    }

    // Add active class to clicked button
    const clickedBtn = container.querySelector(
      `[data-tab="${tabId}"]`
    );
    if (clickedBtn) {
      clickedBtn.classList.add('active');
    }
  }
}

/**
 * Plugin factory function
 */
export async function initialize(context: ISharedContext): Promise<IPlugin> {
  const plugin = new DataViewerPlugin();
  await plugin.initialize(context);
  return plugin;
}
