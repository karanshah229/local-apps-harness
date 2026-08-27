export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar?: string | null;
  created_at?: string;
}

export interface List {
  id: number;
  title: string;
  color_theme: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'dark' | string;
  icon?: string;
  created_by?: number | null;
  is_default?: number | boolean;
  created_at?: string;
  owner_name?: string;
  share_count?: number;
  pending_task_count?: number;
  members?: User[];
}

export interface Task {
  id: number;
  list_id?: number | null;
  title: string;
  notes?: string | null;
  is_completed: number | boolean;
  is_important: number | boolean;
  is_my_day?: number | boolean;
  due_date?: string | null;
  reminder_time?: string | null;
  assigned_to_user_id?: number | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string | number;
  assignee_name?: string | null;
  assignee_phone?: string | null;
  assignee_avatar?: string | null;
  list_title?: string | null;
  list_color?: string | null;
  subtask_count?: number;
  subtask_completed_count?: number;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  is_completed: number | boolean;
  position?: number;
  created_at?: string;
}

export interface WhatsAppLog {
  id: number;
  task_id?: number | null;
  phone: string;
  recipient_name: string;
  message_preview: string;
  sent_at: string;
  status: string;
}

export type ThemeColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'dark';

export type SmartViewType = 'all-tasks' | 'important' | 'assigned-to-me' | 'planned' | 'my-day';

export interface WhatsAppPayloadConfig {
  type: 'single' | 'batch' | 'list';
  taskId?: number;
  taskIds?: number[];
  listId?: number;
  recipientUserId?: number | null;
  customPhone?: string;
}

export interface BatchImportContact {
  name: string;
  phone: string;
  email: string;
  avatar?: string;
}
