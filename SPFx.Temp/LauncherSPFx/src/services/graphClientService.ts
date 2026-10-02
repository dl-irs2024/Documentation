import { IGraphClient, IUser } from '../types';

/**
 * Microsoft Graph client for user/group queries
 */
export class GraphClient implements IGraphClient {
  private graphClient: any; // MSGraphClientFactory client

  constructor(graphClient: any) {
    this.graphClient = graphClient;
  }

  /**
   * Search for users in directory
   */
  async searchUsers(query: string): Promise<IUser[]> {
    try {
      const response = await this.graphClient
        .api('/users')
        .filter(`displayName eq '${query}' or userPrincipalName eq '${query}'`)
        .get();

      return (response.value || []).map((user: any) => this.mapToUser(user));
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get user's direct reports
   */
  async getDirectReports(userId: string): Promise<IUser[]> {
    try {
      const response = await this.graphClient
        .api(`/users/${userId}/directReports`)
        .get();

      return (response.value || []).map((user: any) => this.mapToUser(user));
    } catch (error) {
      console.error('Error fetching direct reports:', error);
      throw error;
    }
  }

  /**
   * Get user's manager
   */
  async getManager(userId: string): Promise<IUser | null> {
    try {
      const response = await this.graphClient
        .api(`/users/${userId}/manager`)
        .get();

      if (!response || !response.id) {
        return null;
      }

      return this.mapToUser(response);
    } catch (error) {
      console.error('Error fetching manager:', error);
      return null;
    }
  }

  /**
   * Get user's photo as blob
   */
  async getUserPhoto(userId: string): Promise<Blob | null> {
    try {
      const response = await this.graphClient
        .api(`/users/${userId}/photo/$value`)
        .get();

      if (response instanceof Blob) {
        return response;
      }

      return null;
    } catch (error) {
      console.warn('Error fetching user photo:', error);
      return null;
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<IUser[]> {
    try {
      const response = await this.graphClient
        .api(`/groups/${groupId}/members`)
        .get();

      return (response.value || [])
        .filter((member: any) => member['@odata.type'] === '#microsoft.graph.user')
        .map((user: any) => this.mapToUser(user));
    } catch (error) {
      console.error('Error fetching group members:', error);
      throw error;
    }
  }

  /**
   * Map Microsoft Graph user to IUser interface
   */
  private mapToUser(graphUser: any): IUser {
    return {
      id: graphUser.id,
      displayName: graphUser.displayName || graphUser.givenName || 'Unknown',
      upn: graphUser.userPrincipalName || '',
      email: graphUser.mail || '',
      jobTitle: graphUser.jobTitle,
      officeLocation: graphUser.officeLocation,
      mobilePhone: graphUser.mobilePhone
    };
  }
}
