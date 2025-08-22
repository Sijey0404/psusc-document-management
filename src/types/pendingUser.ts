export interface PendingUser {
  id: string;
  name: string;
  email: string;
  position: string;
  department_id: string;
  created_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  default_password: string;
}