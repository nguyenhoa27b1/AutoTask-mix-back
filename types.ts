export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

export enum Priority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
}

export interface User {
  user_id: number;
  email: string;
  role: Role;
  isAdmin: boolean;        // Required - backend always returns this
  name: string;            // Required - sanitizeUser ensures non-null string
  picture: string;         // Required - sanitizeUser ensures non-null string (empty if no picture)
  isWhitelisted?: boolean; // Optional - only relevant for Gmail users
}

export interface AppFile {
  id_file: number;
  id_user: number;
  name: string;
  url: string; // A direct, downloadable URL from the backend
}

export interface Task {
  id_task: number;
  title: string;
  description: string;
  assignee_id: number;
  assigner_id: number;
  priority: Priority;
  deadline: string; // ISO string date
  date_created: string; // ISO string date
  date_submit?: string | null;
  id_file?: number | null;
  submit_file_id?: number | null;
  score?: number | null;
  status: 'Pending' | 'Completed';
}

export interface GoogleProfile {
  email: string;
  name: string;
  picture: string;
  email_verified: boolean;
  given_name: string;
  family_name: string;
  sub: string;
}
