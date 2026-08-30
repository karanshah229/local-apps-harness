export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar?: string | null;
  active?: number | boolean;
  created_at?: string;
}

export interface List {
  id: number;
  title: string;
  color_theme: 'blue' | 'indigo' | 'purple' | 'pink' | 'red' | 'orange' | 'amber' | 'green' | 'teal' | 'dark' | string;
  icon?: string;
  created_by?: number | null;
  is_default?: number | boolean;
  default_whatsapp_contact_id?: number | null;
  default_whatsapp_contact_name?: string | null;
  default_whatsapp_contact_phone?: string | null;
  active?: number | boolean;
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
  active?: number | boolean;
  created_at?: string;
  updated_at?: string | number;
  assignee_name?: string | null;
  assignee_phone?: string | null;
  assignee_avatar?: string | null;
  list_title?: string | null;
  list_color?: string | null;
  list_ids?: number[];
  lists?: Array<{ id: number; title: string; color_theme?: string; icon?: string }>;
  subtask_count?: number;
  subtask_completed_count?: number;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  is_completed: number | boolean;
  position?: number;
  active?: number | boolean;
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

export type ThemeColor =
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'dark'
  | string;

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

export type SortField = 'smart' | 'due_date' | 'created_at' | 'title';
export type SortDirection = 'asc' | 'desc';

export interface ViewSortConfig {
  field: SortField;
  direction: SortDirection;
}

export type SortPreferences = Record<string, ViewSortConfig>;

export interface UserPreferences {
  user_id: number;
  remember_last_view: number | boolean;
  last_view_type: 'tab' | 'list' | string;
  last_view_id: string;
  sort_preferences?: SortPreferences | string;
  updated_at?: string;
}
