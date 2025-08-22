import { supabase } from "@/integrations/supabase/client";
import { PendingUser } from "@/types/pendingUser";

// Replace in-memory storage with Supabase-backed persistence

export const PendingUserService = {
  async createPendingUser(userData: {
    name: string;
    email: string;
    position: string;
    department_id: string;
  }) {
    // Generate a default password
    const defaultPassword = `PSU${Math.random().toString(36).substring(2, 8).toUpperCase()}!`;

    const payload = {
      name: userData.name,
      email: userData.email,
      position: userData.position,
      department_id: userData.department_id,
      default_password: defaultPassword,
      status: 'PENDING' as const,
    };

    const { error } = await supabase
      .from('pending_users')
      .insert(payload);

    if (error) throw error;
    // Do not attempt to select/return the row here due to RLS (public users can't SELECT)
    return payload as unknown as PendingUser;
  },

  async getPendingUsers(): Promise<PendingUser[]> {
    // Admins can view all pending users via RLS; public users will get an error -> return []
    const { data, error } = await supabase
      .from('pending_users')
      .select('*, departments:department_id (id, name)')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('getPendingUsers RLS/permission issue or other error:', error.message);
      return [];
    }

    return (data || []) as unknown as PendingUser[];
  },

  async approvePendingUser(pendingUserId: string) {
    try {
      // Fetch pending user from DB
      const { data: pendingUser, error: fetchError } = await supabase
        .from('pending_users')
        .select('*')
        .eq('id', pendingUserId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!pendingUser) throw new Error('Pending user not found');

      // Create the actual user account using the manage-users edge function
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch(
        'https://ucjmbghkbfnknscqerfm.supabase.co/functions/v1/manage-users',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'CREATE',
            userData: {
              email: pendingUser.email,
              name: pendingUser.name,
              role: false,
              position: pendingUser.position,
              department_id: pendingUser.department_id,
              password: pendingUser.default_password,
              password_change_required: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create user');
      }

      // Parse created user result (contains user.id)
      const result = await response.json();

      // Update pending user status to APPROVED in DB
      const { error: updateError } = await supabase
        .from('pending_users')
        .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
        .eq('id', pendingUserId);

      if (updateError) throw updateError;

      // Also copy details into profiles to mirror pending_users (admin bypasses RLS)
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          name: pendingUser.name,
          email: pendingUser.email,
          position: pendingUser.position,
          department_id: pendingUser.department_id,
          password_change_required: true,
        })
        .eq('id', result.user.id);
      if (profileUpdateError) throw profileUpdateError;

      return result;
    } catch (error) {
      console.error('Error approving pending user:', error);
      throw error;
    }
  },

  async rejectPendingUser(pendingUserId: string) {
    const { error } = await supabase
      .from('pending_users')
      .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
      .eq('id', pendingUserId);

    if (error) throw error;
  },
};