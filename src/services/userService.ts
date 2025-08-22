
import { supabase } from "@/integrations/supabase/client";

export type UserCreateData = {
  email: string;
  name: string;
  role: boolean;
  position: string;
  department_id?: string;
  password?: string;
};

export type UserUpdateData = {
  email?: string;
  name?: string;
  role?: boolean;
  position?: string;
  department_id?: string;
  password?: string;
};

export const UserService = {
  async createUser(userData: UserCreateData) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch('https://ucjmbghkbfnknscqerfm.supabase.co/functions/v1/manage-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'CREATE',
          userData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  async updateUser(userId: string, userData: UserUpdateData) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch('https://ucjmbghkbfnknscqerfm.supabase.co/functions/v1/manage-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'UPDATE',
          userId,
          userData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  async archiveUser(userId: string) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch('https://ucjmbghkbfnknscqerfm.supabase.co/functions/v1/manage-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'ARCHIVE',
          userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to archive user');
      }

      return await response.json();
    } catch (error) {
      console.error('Error archiving user:', error);
      throw error;
    }
  },

  async unarchiveUser(userId: string) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch('https://ucjmbghkbfnknscqerfm.supabase.co/functions/v1/manage-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'UNARCHIVE',
          userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unarchive user');
      }

      return await response.json();
    } catch (error) {
      console.error('Error unarchiving user:', error);
      throw error;
    }
  },
};
