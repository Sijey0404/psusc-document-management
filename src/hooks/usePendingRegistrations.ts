import { useState, useEffect } from 'react';
import { PendingUserService } from '@/services/pendingUserService';
import { PendingUser } from '@/types/pendingUser';

export const usePendingRegistrations = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingUsers = async () => {
    try {
      const users = await PendingUserService.getPendingUsers();
      setPendingUsers(users);
    } catch (error) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  return {
    pendingUsers,
    loading,
    refetch: fetchPendingUsers
  };
};