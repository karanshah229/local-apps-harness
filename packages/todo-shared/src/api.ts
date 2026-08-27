import {
  User,
  List,
  Task,
  Subtask,
  WhatsAppLog,
  WhatsAppPayloadConfig,
  BatchImportContact
} from './types';

export class TodoApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const fullUrl = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const res = await fetch(fullUrl, {
      ...options,
      headers
    });

    if (!res.ok) {
      let errorMsg = `API Error: ${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        if (body && body.error) errorMsg = body.error;
      } catch {}
      throw new Error(errorMsg);
    }

    return (await res.json()) as T;
  }

  // Health
  async checkHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/healthz');
  }

  // Users
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/api/users');
  }

  async createUser(user: { name: string; email: string; phone: string; avatar?: string }): Promise<User> {
    return this.request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user)
    });
  }

  async updateUser(id: number, user: { name: string; email: string; phone: string; avatar?: string }): Promise<User> {
    return this.request<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user)
    });
  }

  async deleteUser(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/users/${id}`, {
      method: 'DELETE'
    });
  }

  async batchImportUsers(contacts: BatchImportContact[]): Promise<{
    success: boolean;
    importedCount: number;
    updatedCount: number;
    totalCount: number;
    users: User[];
  }> {
    return this.request('/api/users/batch', {
      method: 'POST',
      body: JSON.stringify({ contacts })
    });
  }

  // Lists
  async getLists(userId: number = 1): Promise<List[]> {
    return this.request<List[]>(`/api/lists?userId=${userId}`);
  }

  async createList(list: { title: string; color_theme?: string; icon?: string; created_by: number }): Promise<List> {
    return this.request<List>('/api/lists', {
      method: 'POST',
      body: JSON.stringify(list)
    });
  }

  async updateList(id: number, list: { title?: string; color_theme?: string; icon?: string }): Promise<List> {
    return this.request<List>(`/api/lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(list)
    });
  }

  async deleteList(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/lists/${id}`, {
      method: 'DELETE'
    });
  }

  async shareList(listId: number, userId: number): Promise<{ listId: number; members: User[] }> {
    return this.request<{ listId: number; members: User[] }>(`/api/lists/${listId}/share`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  async removeListShare(listId: number, userId: number): Promise<{ listId: number; members: User[] }> {
    return this.request<{ listId: number; members: User[] }>(`/api/lists/${listId}/share/${userId}`, {
      method: 'DELETE'
    });
  }

  // Tasks
  async getTasks(params: { view?: string; listId?: number; userId?: number }): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params.view) query.append('view', params.view);
    if (params.listId) query.append('listId', String(params.listId));
    if (params.userId) query.append('userId', String(params.userId));
    return this.request<Task[]>(`/api/tasks?${query.toString()}`);
  }

  async createTask(task: {
    title: string;
    list_id?: number | null;
    notes?: string | null;
    is_important?: number | boolean;
    is_my_day?: number | boolean;
    due_date?: string | null;
    reminder_time?: string | null;
    assigned_to_user_id?: number | null;
    created_by?: number | null;
  }): Promise<Task> {
    return this.request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteTask(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
  }

  // Subtasks
  async getSubtasks(taskId: number): Promise<Subtask[]> {
    return this.request<Subtask[]>(`/api/tasks/${taskId}/subtasks`);
  }

  async createSubtask(taskId: number, title: string): Promise<Subtask> {
    return this.request<Subtask>(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  }

  async updateSubtask(subtaskId: number, updates: { title?: string; is_completed?: number | boolean }): Promise<Subtask> {
    return this.request<Subtask>(`/api/subtasks/${subtaskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteSubtask(subtaskId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/subtasks/${subtaskId}`, {
      method: 'DELETE'
    });
  }

  // WhatsApp
  async generateWhatsAppPayload(config: WhatsAppPayloadConfig): Promise<{
    waLink: string;
    message: string;
    recipientPhone: string;
    recipientName: string;
  }> {
    return this.request('/api/whatsapp/generate-link', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async getWhatsAppLogs(): Promise<WhatsAppLog[]> {
    return this.request<WhatsAppLog[]>('/api/whatsapp/logs');
  }
}
