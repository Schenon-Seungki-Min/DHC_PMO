/**
 * API Client - 모든 API 호출 중앙화
 * 나중에 Supabase SDK로 교체 용이
 */

const API_BASE = window.location.origin;

class APIClient {
  /**
   * Fetch wrapper with error handling
   */
  async request(endpoint, options = {}) {
    try {
      const token = localStorage.getItem('pmo_token');
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...options.headers
        },
        ...options
      });

      if (response.status === 401) {
        localStorage.removeItem('pmo_token');
        window.location.href = '/login.html';
        return;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ========== PROJECTS ==========

  async getAllProjects() {
    return this.request('/api/projects');
  }

  async getProjectById(id) {
    return this.request(`/api/projects/${id}`);
  }

  async createProject(data) {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateProject(id, data) {
    return this.request(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteProject(id) {
    return this.request(`/api/projects/${id}`, {
      method: 'DELETE'
    });
  }

  async reorderProjects(orderedIds) {
    return this.request('/api/projects/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds })
    });
  }

  // ========== THREADS ==========

  async getAllThreads(filters = {}) {
    const params = new URLSearchParams(filters);
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/api/threads${query}`);
  }

  async getThreadById(id) {
    return this.request(`/api/threads/${id}`);
  }

  async createThread(data) {
    return this.request('/api/threads', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateThread(id, data) {
    return this.request(`/api/threads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteThread(id) {
    return this.request(`/api/threads/${id}`, {
      method: 'DELETE'
    });
  }

  async reorderThreads(orderedIds) {
    return this.request('/api/threads/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds })
    });
  }

  async assignThread(threadId, memberId, role, note = '') {
    return this.request(`/api/threads/${threadId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ member_id: memberId, role, note })
    });
  }

  async releaseThread(threadId, assignmentId, note = '') {
    return this.request(`/api/threads/${threadId}/release`, {
      method: 'POST',
      body: JSON.stringify({ assignment_id: assignmentId, note })
    });
  }

  async getThreadHistory(threadId) {
    return this.request(`/api/threads/${threadId}/history`);
  }

  async getCurrentAssignments(threadId) {
    return this.request(`/api/threads/${threadId}/current-assignments`);
  }

  // ========== ASSIGNMENTS ==========

  async updateAssignment(id, data) {
    return this.request(`/api/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteAssignment(id) {
    return this.request(`/api/assignments/${id}`, {
      method: 'DELETE'
    });
  }

  // ========== TASKS ==========

  async getAllTasks(filters = {}) {
    const params = new URLSearchParams(filters);
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/api/tasks${query}`);
  }

  async getTaskById(id) {
    return this.request(`/api/tasks/${id}`);
  }

  async createTask(data) {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateTask(id, data) {
    return this.request(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteTask(id) {
    return this.request(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
  }

  // ========== TEAM MEMBERS ==========

  async getAllMembers() {
    return this.request('/api/members');
  }

  async getMemberById(id) {
    return this.request(`/api/members/${id}`);
  }

  async createMember(data) {
    return this.request('/api/members', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateMember(id, data) {
    return this.request(`/api/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteMember(id) {
    return this.request(`/api/members/${id}`, {
      method: 'DELETE'
    });
  }

  // ========== THREAD TEMPLATES ==========

  async getAllTemplates() {
    return this.request('/api/templates');
  }

  async getTemplateById(id, includeTasks = false) {
    const qs = includeTasks ? '?include=tasks' : '';
    return this.request(`/api/templates/${id}${qs}`);
  }

  async createTemplate(data) {
    return this.request('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateTemplate(id, data) {
    return this.request(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteTemplate(id) {
    return this.request(`/api/templates/${id}`, {
      method: 'DELETE'
    });
  }

  // ========== TASK TEMPLATES ==========

  async getTaskTemplates(templateId) {
    return this.request(`/api/templates/${templateId}/tasks`);
  }

  async createTaskTemplate(templateId, data) {
    return this.request(`/api/templates/${templateId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateTaskTemplate(id, data) {
    return this.request(`/api/task-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteTaskTemplate(id) {
    return this.request(`/api/task-templates/${id}`, {
      method: 'DELETE'
    });
  }

  // ========== APPLY TEMPLATE ==========

  async applyTemplate(templateId, { project_id, title_suffix, start_date, due_date }) {
    return this.request(`/api/templates/${templateId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ project_id, title_suffix, start_date, due_date })
    });
  }
}

// Singleton instance
const apiClient = new APIClient();
