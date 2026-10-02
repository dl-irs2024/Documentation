import { IPowerPlatformService } from '../types';

/**
 * Power Platform service for Dataverse and Canvas Apps access (read-only)
 */
export class PowerPlatformService implements IPowerPlatformService {
  private graphClient: any;
  private environmentCache = new Map<string, any>();
  private cacheTTL = 24 * 3600 * 1000; // 24 hours

  constructor(graphClient: any) {
    this.graphClient = graphClient;
  }

  /**
   * Query Dataverse tables (read-only)
   */
  async queryDataverse(
    environmentUrl: string,
    query: string
  ): Promise<any[]> {
    try {
      // Validate environment URL
      if (!environmentUrl.includes('dynamics.com') && !environmentUrl.includes('crm')) {
        throw new Error('Invalid Dataverse environment URL');
      }

      // Construct OData query
      let odataQuery = query;
      if (!query.toLowerCase().startsWith('select')) {
        odataQuery = `select * from ${query}`;
      }

      // Parse simple OData (v1 implementation)
      const table = this.extractTableName(query);
      const filter = this.extractFilter(query);

      const url = new URL(`${environmentUrl}/api/data/v9.2/`);
      const apiUrl = `${url.href}${table}`;

      // Fetch from Dataverse
      const response = await this.graphClient
        .api(`/me/environment/${environmentUrl}/${table}`)
        .filter(filter)
        .get();

      return response.value || [];
    } catch (error) {
      console.error('Error querying Dataverse:', error);
      throw error;
    }
  }

  /**
   * Get available environments for user
   */
  async getEnvironments(): Promise<any[]> {
    try {
      // Check cache
      const cacheKey = 'environments';
      const cached = this.environmentCache.get(cacheKey);
      if (cached && cached.timestamp > Date.now() - this.cacheTTL) {
        return cached.data;
      }

      // Fetch environments via Graph
      const response = await this.graphClient
        .api('/me/windowsdevicemanagement/deviceAppManagement/managedAppProtections')
        .get();

      const environments = response.value || [];

      // Cache result
      this.environmentCache.set(cacheKey, {
        data: environments,
        timestamp: Date.now()
      });

      return environments;
    } catch (error) {
      console.error('Error fetching environments:', error);
      throw error;
    }
  }

  /**
   * Get connected apps (Canvas Apps, Power Apps)
   */
  async getConnectedApps(): Promise<any[]> {
    try {
      // Use Microsoft Graph to get app registrations
      const response = await this.graphClient
        .api('/me/appRoleAssignments')
        .get();

      return response.value || [];
    } catch (error) {
      console.error('Error fetching connected apps:', error);
      throw error;
    }
  }

  /**
   * Helper: Extract table name from query
   */
  private extractTableName(query: string): string {
    // Simple parser for "select * from tableName" or just "tableName"
    const selectMatch = query.match(/from\s+(\w+)/i);
    if (selectMatch) {
      return selectMatch[1];
    }

    // If no "from", assume the query is the table name
    return query.trim();
  }

  /**
   * Helper: Extract filter from query
   */
  private extractFilter(query: string): string {
    const whereMatch = query.match(/where\s+(.+?)(?:\s+order|$)/i);
    if (whereMatch) {
      return whereMatch[1];
    }
    return '';
  }

  /**
   * Get table columns (schema)
   */
  async getTableColumns(
    environmentUrl: string,
    tableName: string
  ): Promise<any[]> {
    try {
      // Fetch entity metadata
      const response = await this.graphClient
        .api(`/me/environment/${environmentUrl}/EntityDefinitions('${tableName}')/Attributes`)
        .get();

      return response.value || [];
    } catch (error) {
      console.error('Error fetching table columns:', error);
      return [];
    }
  }

  /**
   * Clear environment cache
   */
  public clearCache(): void {
    this.environmentCache.clear();
  }
}
