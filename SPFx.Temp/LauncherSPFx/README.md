# SPFx Pluggable Launcher v1

A pluggable SharePoint Framework (SPFx) container architecture that allows Modern Web Parts and extensions to be dynamically loaded at runtime without redeployment.

## Architecture Overview

This project implements a **Single SPFx Deployment Model** with **Dynamic Plugin Loading**:

```
SPFx Launcher Web Part (Container)
├── Event Bus (pub/sub)
├── Shared Data Service (multi-level cache)
├── Authentication Service (MSAL + SPFx)
├── SharePoint Client (REST/SPOM)
├── Microsoft Graph Client
├── Power Platform Service (Dataverse)
├── Entra Service (groups, users)
└── Plugin Host
    ├── Plugin A (Site Picker)
    ├── Plugin B (Data Viewer)
    └── Plugin C (Custom)
```

## Features

- ✅ **One-time build** — Deploy launcher once, add plugins without redeployment
- ✅ **Event Bus** — Pub/sub communication between plugins
- ✅ **Shared Storage** — Multi-level (memory → localStorage → IndexedDB → Cloud)
- ✅ **SharePoint Access** — Full SPOM via REST + Microsoft Graph
- ✅ **Power Platform** — Dataverse queries + Canvas Apps (read-only)
- ✅ **Entra Integration** — Groups, users, managers (read-only)
- ✅ **Proxy Middleware** — 407 authentication error handling
- ✅ **Modern Web Parts** — Both Classic and Modern page support
- ✅ **TypeScript Support** — Centralized Esbuild compilation for plugins

## Project Structure

```
src/
├── webparts/LauncherHost/
│   ├── LauncherHostWebPart.tsx         # SPFx entry point
│   ├── LauncherHost.module.scss
│   └── LauncherHostWebPart.manifest.json
├── services/
│   ├── eventBus.ts                     # Event bus
│   ├── sharedDataService.ts            # Data cache
│   ├── spClientService.ts              # SharePoint
│   ├── graphClientService.ts           # Microsoft Graph
│   ├── powerPlatformService.ts         # Dataverse
│   ├── entraService.ts                 # Entra groups
│   ├── authService.ts                  # Authentication
│   ├── proxyMiddleware.ts              # Proxy handling
│   ├── pluginLoader.ts                 # Dynamic loader
│   └── logger.ts                       # Logging
├── context/
│   └── SharedContext.ts                # React context
├── components/
│   ├── PluginHost.tsx                  # Plugin mount
│   ├── PluginRegistry.tsx              # Plugin list
│   ├── EventMonitor.tsx                # Debug panel
│   └── Shared/
│       ├── SiteCard.tsx
│       ├── PersonCard.tsx
│       └── ErrorBoundary.tsx
├── plugins/
│   ├── site-picker/
│   │   ├── index.ts
│   │   └── manifest.json
│   └── data-viewer/
│       ├── index.ts
│       └── manifest.json
└── types/
    ├── IEventBus.ts
    ├── IDataService.ts
    ├── ISPClient.ts
    ├── IAuthService.ts
    ├── IPlugin.ts
    ├── ISharedContext.ts
    └── index.ts
```

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- SPFx CLI (`npm install -g @microsoft/sharepoint-framework`)

### Installation

```bash
cd LauncherSPFx
npm install
```

### Development

```bash
# Build everything
npm run build

# Develop with watch mode
npm run dev

# Develop plugins only
npm run dev:plugins

# Local testing
npm run serve
```

### Building

```bash
# Single build command
npm run build

# Output:
# - dist/launcher/  (SPFx package)
# - dist/plugins/   (Plugin bundles)
```

## Plugin Development

### Creating a Plugin

1. Create a new folder: `src/plugins/my-plugin/`
2. Create `index.ts` with plugin initialization:

```typescript
import { ISharedContext, IPlugin } from '@types';

export class MyPlugin implements IPlugin {
  id = 'my-plugin';
  title = 'My Plugin';
  version = '1.0.0';

  async initialize(context: ISharedContext) {
    context.logger.info('Plugin initialized');
    
    // Subscribe to events
    context.eventBus.subscribe('site:selected', (event) => {
      context.logger.info('Site selected:', event.payload);
    });
  }

  async render(container: HTMLElement, context: ISharedContext) {
    container.innerHTML = '<div>Hello from my plugin!</div>';
  }

  async dispose() {
    context.logger.info('Plugin disposed');
  }
}

// Export factory function
export async function initialize(context: ISharedContext): Promise<IPlugin> {
  const plugin = new MyPlugin();
  await plugin.initialize(context);
  return plugin;
}
```

3. Create `manifest.json`:

```json
{
  "id": "my-plugin",
  "title": "My Plugin",
  "version": "1.0.0",
  "description": "Description of my plugin",
  "requiredScopes": ["Sites.Read.All"],
  "minimumRoles": ["User"],
  "dataAccess": ["SharePoint"]
}
```

4. Build: `npm run build`

### Plugin Lifecycle

1. **Loading** — Plugin manifest loaded from registry
2. **Initialization** — `initialize(context)` called
3. **Rendering** — `render(container, context)` called
4. **Running** — Plugin can publish/subscribe events
5. **Disposal** — `dispose()` called on unmount

## Shared Services

### Event Bus

```typescript
// Publish an event
context.eventBus.publish({
  type: 'my:event',
  sourcePluginId: 'my-plugin',
  payload: { data: 'value' },
  priority: 'high'
});

// Subscribe to events
const unsubscribe = context.eventBus.subscribe(
  'my:event',
  (event) => {
    console.log('Received:', event.payload);
  }
);

// Get event history
const history = context.eventBus.getHistory('my:event');
```

### Shared Data

```typescript
// Set/get shared data
context.dataService.set('currentSite', { id: '123', title: 'Sales' });
const site = context.dataService.get('currentSite');

// Subscribe to data changes
const unsubscribe = context.dataService.subscribe('currentSite', (newSite) => {
  console.log('Site changed:', newSite);
});

// Broadcast across tabs
context.dataService.broadcastChange('currentSite', newSite);
```

### SharePoint Access

```typescript
// Get site info
const site = await context.spClient.getSite('https://tenant.sharepoint.com/sites/Sales');

// Get list items
const items = await context.spClient.getListItems(
  'https://tenant.sharepoint.com/sites/Sales',
  'my-list-id',
  "Status eq 'Active'",
  ['Title', 'Status', 'Modified']
);

// Update item
await context.spClient.updateListItem(
  'https://tenant.sharepoint.com/sites/Sales',
  'my-list-id',
  1,
  { Status: 'Completed' }
);
```

### Microsoft Graph

```typescript
// Search users
const users = await context.graphClient.searchUsers('john');

// Get user details
const manager = await context.graphClient.getManager('user-id');

// Get user photo
const photo = await context.graphClient.getUserPhoto('user-id');
```

### Power Platform

```typescript
// Query Dataverse
const records = await context.powerPlatformService.queryDataverse(
  'https://org.crm.dynamics.com',
  'select * from accounts'
);

// Get environments
const envs = await context.powerPlatformService.getEnvironments();
```

### Entra Groups

```typescript
// Get user's groups
const groups = await context.entraService.getGroups();

// Get group members
const members = await context.entraService.getGroupMembers('group-id');

// Get manager chain
const chain = await context.entraService.getUserManagerChain('user-id');
```

## Deployment

### Production Build

```bash
npm run build
```

### Upload to App Catalog

1. Navigate to tenant app catalog
2. Upload `dist/launcher/spfx-pluggable-launcher.sppkg`
3. Trust the app

### Upload Plugins

1. Create SharePoint Library: `App Assets`
2. Upload plugin bundles to library
3. Upload `plugin-registry.json`:

```json
[
  {
    "id": "site-picker",
    "title": "Site Picker",
    "version": "1.0.0",
    "url": "https://tenant.sharepoint.com/sites/central/AppAssets/site-picker/site-picker.js",
    "requiredScopes": ["Sites.Read.All"],
    "minimumRoles": ["User"]
  }
]
```

4. Add launcher web part to page

## Standard Events

| Event | Source | Payload |
|-------|--------|---------|
| `site:selected` | Site Picker | `{ siteUrl, siteId }` |
| `site:loaded` | Site Service | `{ site: ISiteInfo }` |
| `selection:changed` | Any | `{ itemId, itemType }` |
| `data:modified` | Any | `{ entityType, action, data }` |
| `save:requested` | UI | `{ changes, context }` |
| `error:occurred` | Any | `{ error, context, recoverable }` |

## Troubleshooting

### 407 Proxy Errors

The framework automatically handles 407 (Proxy Authentication Required) errors. Users will be prompted to authenticate with their proxy.

```typescript
// In your plugin
try {
  const data = await context.spClient.getListItems(...);
} catch (err) {
  if (err.status === 407) {
    // Proxy middleware will handle this automatically
    context.logger.warn('Proxy authentication required');
  }
}
```

### Plugin Not Loading

1. Check browser console for errors
2. Verify `plugin-registry.json` is valid JSON
3. Verify plugin bundle URL is accessible
4. Check plugin manifest has all required fields

### Token Refresh

Tokens are automatically managed by the auth service. If you see 401 errors:

```typescript
try {
  const data = await context.spClient.getListItems(...);
} catch (err) {
  if (err.status === 401) {
    await context.authService.refreshToken();
    // Retry request
  }
}
```

## References

- [SPFx Launcher Plan Preview](../ReadMe/SPFx.Launcher.Plan.Preview.md)
- [SPFx Launcher Plan Addendum](../ReadMe/SPFx.Launcher.Plan.Addendum.md)
- [SPA/PWA/SPFx Framework Discussion](../ReadMe/SPA_PWA_SPFX_Pluggable_Framework_ChatGPT_2026-09-30_Wednesday.md)
- [Microsoft Graph API Docs](https://docs.microsoft.com/en-us/graph/api/overview)
- [SharePoint REST API](https://docs.microsoft.com/en-us/sharepoint/dev/general-development/sharepoint-rest-api-overview)
- [SPFx Documentation](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/sharepoint-framework-overview)

## License

Internal use only

## Support

For issues or questions, refer to the troubleshooting section above or check the event monitor debug panel.
