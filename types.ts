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
  // Statistics fields
  totalTasksAssigned?: number;      // Total number of tasks assigned to this user
  totalTasksCompleted?: number;     // Number of completed tasks
  averageScore?: number;            // Average score of completed tasks
  tasksCompletedOnTime?: number;    // Tasks completed before deadline
  tasksCompletedLate?: number;      // Tasks completed after deadline
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
  attachment_ids?: number[]; // Array of description file IDs
  attachments?: AppFile[]; // Populated from backend
  submit_file_id?: number | null;
  score?: number | null;
  status: 'Pending' | 'Overdue' | 'Submitted' | 'Completed';
  isOverdue?: boolean; // Computed field - true if past deadline and not completed
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

export enum LeaveRequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export interface LeaveRequest {
  id_leave: number;
  user_id: number;
  user_name?: string;        // Populated from user data
  user_email?: string;       // Populated from user data
  start_date: string;        // ISO string date
  end_date: string;          // ISO string date
  reason: string;
  status: LeaveRequestStatus;
  date_created: string;      // ISO string date
  date_reviewed?: string | null;  // ISO string date when approved/rejected
  reviewed_by?: number | null;    // Admin user_id who reviewed
  reviewer_name?: string;    // Populated from admin data
  notes?: string | null;     // Admin notes when reviewing
}
