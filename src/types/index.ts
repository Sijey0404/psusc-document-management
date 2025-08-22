export type User = {
  id: string;
  name: string;
  email: string;
  role: boolean; // true for admin, false for faculty
  department_id: string;
  created_at: string;
  updated_at: string;
  position: "PROFESSOR" | "ASSISTANT_PROFESSOR" | "ASSOCIATE_PROFESSOR" | "INSTRUCTOR" | "DEAN" | "CHAIR";
  password_change_required?: boolean;
};

export type Department = {
  id: string;
  name: string;
  created_at: string;
};

export type Document = {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_type: string;
  file_size: number;
  category_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  feedback?: string | null;
  submitted_by: string;
  reviewed_by?: string | null;
  department_id: string;
  created_at: string;
  updated_at: string;
  profiles?: { name: string } | null;  // Join from profiles table
  reviewer?: { name: string } | null;  // Join for reviewer name
  department?: { name: string } | null; // Join for department name
  document_categories?: { name: string } | null; // Join for category name
};

export type DocumentSubmission = {
  id: string;
  document_id: string;
  document: Document;
  user: User;
  submitted_at: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export type Notification = {
  id: string | number;
  user_id: string;
  message: string;
  created_at: string;
  read: boolean;
  type: string;
  reference_id?: string | number;
  related_document_id?: string | null;
};

export type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};
