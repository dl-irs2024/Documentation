/**
 * SharePoint site information
 */
export interface ISiteInfo {
  id: string;
  title: string;
  url: string;
  displayName: string;
  webUrl: string;
  owners?: string[];
  description?: string;
}

/**
 * SharePoint list item
 */
export interface IListItem {
  id: number;
  title?: string;
  [key: string]: any;
}

/**
 * SharePoint list
 */
export interface ISPList {
  id: string;
  title: string;
  itemCount: number;
}

/**
 * SharePoint SPOM REST client
 */
export interface ISPClient {
  /**
   * Get site information
   */
  getSite(siteUrl: string): Promise<ISiteInfo>;

  /**
   * Get items from a SharePoint list
   */
  getListItems(
    siteUrl: string,
    listId: string,
    filter?: string,
    select?: string[]
  ): Promise<IListItem[]>;

  /**
   * Get a single list item
   */
  getListItem(
    siteUrl: string,
    listId: string,
    itemId: number
  ): Promise<IListItem>;

  /**
   * Update a list item
   */
  updateListItem(
    siteUrl: string,
    listId: string,
    itemId: number,
    updates: any
  ): Promise<IListItem>;

  /**
   * Get web properties
   */
  getWebProperties(siteUrl: string): Promise<any>;

  /**
   * Get all lists in a site
   */
  getLists(siteUrl: string): Promise<ISPList[]>;
}
