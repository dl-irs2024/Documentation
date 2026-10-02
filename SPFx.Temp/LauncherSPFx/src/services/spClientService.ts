import { ISPClient, ISiteInfo, IListItem, ISPList } from '../types';

/**
 * SharePoint REST client for accessing SPOM
 * Wrapper around SPFx context.spHttpClient
 */
export class SharePointClient implements ISPClient {
  private spHttpClient: any; // SPFx context.spHttpClient
  private siteUrl: string;

  constructor(spHttpClient: any, siteUrl: string) {
    this.spHttpClient = spHttpClient;
    this.siteUrl = siteUrl;
  }

  /**
   * Get site information
   */
  async getSite(siteUrl: string): Promise<ISiteInfo> {
    try {
      const url = `${siteUrl}/_api/site`;
      const response = await this.spHttpClient.get(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`SharePoint API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        id: data.Id,
        title: data.DisplayName || 'Untitled Site',
        url: siteUrl,
        displayName: data.DisplayName,
        webUrl: data.Url
      };
    } catch (error) {
      console.error('Error fetching site:', error);
      throw error;
    }
  }

  /**
   * Get items from a SharePoint list
   */
  async getListItems(
    siteUrl: string,
    listId: string,
    filter?: string,
    select?: string[]
  ): Promise<IListItem[]> {
    try {
      let url = `${siteUrl}/_api/lists('${listId}')/items`;

      // Build OData query
      const params: string[] = [];
      if (select && select.length > 0) {
        params.push(`$select=${select.join(',')}`);
      }
      if (filter) {
        params.push(`$filter=${encodeURIComponent(filter)}`);
      }

      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const response = await this.spHttpClient.get(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`List not found: ${listId}`);
          return [];
        }
        throw new Error(`SharePoint API error: ${response.status}`);
      }

      const data = await response.json();
      return data.value || [];
    } catch (error) {
      console.error('Error fetching list items:', error);
      throw error;
    }
  }

  /**
   * Get a single list item
   */
  async getListItem(
    siteUrl: string,
    listId: string,
    itemId: number
  ): Promise<IListItem> {
    try {
      const url = `${siteUrl}/_api/lists('${listId}')/items(${itemId})`;

      const response = await this.spHttpClient.get(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Item not found: ${itemId}`);
        }
        throw new Error(`SharePoint API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching list item:', error);
      throw error;
    }
  }

  /**
   * Update a list item
   */
  async updateListItem(
    siteUrl: string,
    listId: string,
    itemId: number,
    updates: any
  ): Promise<IListItem> {
    try {
      const url = `${siteUrl}/_api/lists('${listId}')/items(${itemId})`;

      // Get request digest for update
      const digestResponse = await this.spHttpClient.get(
        `${siteUrl}/_api/contextinfo`,
        { headers: { Accept: 'application/json' } }
      );
      const digest = (await digestResponse.json()).FormDigestValue;

      const response = await this.spHttpClient.post(url, {
        body: JSON.stringify(updates),
        headers: {
          'X-RequestDigest': digest,
          'Content-Type': 'application/json',
          'IF-MATCH': '*'
        }
      });

      if (!response.ok) {
        throw new Error(`SharePoint API error: ${response.status}`);
      }

      return this.getListItem(siteUrl, listId, itemId);
    } catch (error) {
      console.error('Error updating list item:', error);
      throw error;
    }
  }

  /**
   * Get web properties
   */
  async getWebProperties(siteUrl: string): Promise<any> {
    try {
      const url = `${siteUrl}/_api/web`;

      const response = await this.spHttpClient.get(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`SharePoint API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching web properties:', error);
      throw error;
    }
  }

  /**
   * Get all lists in a site
   */
  async getLists(siteUrl: string): Promise<ISPList[]> {
    try {
      const url = `${siteUrl}/_api/lists`;

      const response = await this.spHttpClient.get(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`SharePoint API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.value || []).map((list: any) => ({
        id: list.Id,
        title: list.Title,
        itemCount: list.ItemCount
      }));
    } catch (error) {
      console.error('Error fetching lists:', error);
      throw error;
    }
  }
}
