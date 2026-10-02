import { IEntraService, IUser } from '../types';

/**
 * Entra (Azure AD) service for groups, users, and organizational hierarchy (read-only)
 */
export class EntraService implements IEntraService {
  private graphClient: any;
  private groupCache = new Map<string, { data: any[]; timestamp: number }>();
  private cacheTTL = 1 * 3600 * 1000; // 1 hour

  constructor(graphClient: any) {
    this.graphClient = graphClient;
  }

  /**
   * Get groups for current user
   */
  async getGroups(): Promise<any[]> {
    try {
      const response = await this.graphClient
        .api('/me/memberOf')
        .filter("isof('microsoft.graph.group')")
        .get();

      return response.value || [];
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }
  }

  /**
   * Get group members (read-only)
   */
  async getGroupMembers(groupId: string): Promise<IUser[]> {
    try {
      // Check cache
      const cacheKey = `group-members-${groupId}`;
      const cached = this.groupCache.get(cacheKey);
      if (cached && cached.timestamp > Date.now() - this.cacheTTL) {
        return cached.data;
      }

      // Fetch members
      const response = await this.graphClient
        .api(`/groups/${groupId}/members`)
        .get();

      const members = (response.value || [])
        .filter((member: any) => member['@odata.type'] === '#microsoft.graph.user')
        .map((user: any) => this.mapToUser(user));

      // Cache result
      this.groupCache.set(cacheKey, {
        data: members,
        timestamp: Date.now()
      });

      return members;
    } catch (error) {
      console.error('Error fetching group members:', error);
      throw error;
    }
  }

  /**
   * Search directory for users and groups
   */
  async searchDirectory(query: string): Promise<any[]> {
    try {
      // Search users
      const userResponse = await this.graphClient
        .api('/users')
        .filter(
          `displayName startswith '${query}' or userPrincipalName startswith '${query}'`
        )
        .top(10)
        .get();

      const users = userResponse.value || [];

      // Search groups
      const groupResponse = await this.graphClient
        .api('/groups')
        .filter(`displayName startswith '${query}'`)
        .top(10)
        .get();

      const groups = groupResponse.value || [];

      // Combine results
      return [
        ...users.map((u: any) => ({ ...u, type: 'user' })),
        ...groups.map((g: any) => ({ ...g, type: 'group' }))
      ];
    } catch (error) {
      console.error('Error searching directory:', error);
      throw error;
    }
  }

  /**
   * Get user manager chain (walk up reporting hierarchy)
   */
  async getUserManagerChain(userId: string): Promise<IUser[]> {
    try {
      const chain: IUser[] = [];
      let currentUserId: string | null = userId;
      const visited = new Set<string>();

      // Prevent infinite loops
      const maxDepth = 10;
      let depth = 0;

      while (currentUserId && !visited.has(currentUserId) && depth < maxDepth) {
        visited.add(currentUserId);

        try {
          const response = await this.graphClient
            .api(`/users/${currentUserId}/manager`)
            .get();

          if (!response || !response.id) {
            break; // Reached top of chain
          }

          const user = this.mapToUser(response);
          chain.push(user);

          currentUserId = response.id;
        } catch (err) {
          console.warn(`Could not fetch manager for ${currentUserId}:`, err);
          break;
        }

        depth++;
      }

      return chain;
    } catch (error) {
      console.error('Error fetching manager chain:', error);
      throw error;
    }
  }

  /**
   * Get user's subordinates (direct reports)
   */
  async getUserSubordinates(userId: string): Promise<IUser[]> {
    try {
      const response = await this.graphClient
        .api(`/users/${userId}/directReports`)
        .get();

      return (response.value || []).map((user: any) => this.mapToUser(user));
    } catch (error) {
      console.error('Error fetching subordinates:', error);
      throw error;
    }
  }

  /**
   * Get user details
   */
  async getUser(userId: string): Promise<IUser> {
    try {
      const response = await this.graphClient
        .api(`/users/${userId}`)
        .get();

      return this.mapToUser(response);
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  /**
   * Check if user is member of group
   */
  async isUserInGroup(userId: string, groupId: string): Promise<boolean> {
    try {
      const response = await this.graphClient
        .api(`/groups/${groupId}/members`)
        .filter(`id eq '${userId}'`)
        .get();

      return (response.value || []).length > 0;
    } catch (error) {
      console.error('Error checking group membership:', error);
      return false;
    }
  }

  /**
   * Map Microsoft Graph user to IUser interface
   */
  private mapToUser(graphUser: any): IUser {
    return {
      id: graphUser.id,
      displayName: graphUser.displayName || 'Unknown User',
      upn: graphUser.userPrincipalName || '',
      email: graphUser.mail || '',
      jobTitle: graphUser.jobTitle,
      officeLocation: graphUser.officeLocation,
      mobilePhone: graphUser.mobilePhone
    };
  }

  /**
   * Clear group member cache
   */
  public clearCache(): void {
    this.groupCache.clear();
  }
}
