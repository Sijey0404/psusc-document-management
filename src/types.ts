
export interface User {
  id: string;
  name: string;
  email: string;
  role: boolean;
  department_id: string;
  position: string;
  created_at: string;
  updated_at: string;
  password_change_required?: boolean;
}

export interface Document {
  id: string;
  title: string;
  description: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  file_path: string;
  file_type: string;
  file_size: number;
  submitted_by: string;
  reviewed_by?: string | null;
  department_id: string;
  category_id: string;
  created_at: string;
  updated_at: string;
  feedback?: string | null;
  deadline?: string | null;
  folder_id?: string | null;
  profiles?: {
    name: string;
  } | null;
  reviewer?: {
    name: string;
  } | null;
  department?: {
    name: string;
  } | null;
  document_categories?: {
    name: string;
    semester?: string;
    deadline?: string;
  } | null;
}

export interface DocumentSubmission {
  id: string;
  document_id: string;
  document: Document;
  user: User;
  submitted_at: string;
  status: string;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  read: boolean;
  type: string;
  reference_id: string; // This was the missing required property
  related_document_id?: string | null;
}

export interface Department {
  id: string;
  name: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  description: string | null;
  deadline: string | null;
  semester: string | null; // Added semester field
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  category_id: string | null;
  deadline: string | null;
  created_at: string;
  created_by: string;
  document_count?: number;
}
