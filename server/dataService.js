const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/data.json');

/**
 * Data Service - JSON 파일 기반 데이터 레이어
 * 나중에 Supabase로 마이그레이션할 때 이 파일만 교체하면 됨
 */
class DataService {
  constructor() {
    this.data = null;
  }

  /**
   * 데이터 파일 읽기
   */
  async loadData() {
    try {
      const fileContent = await fs.readFile(DATA_FILE, 'utf8');
      this.data = JSON.parse(fileContent);
      return this.data;
    } catch (error) {
      console.error('Error loading data:', error);
      throw new Error('Failed to load data');
    }
  }

  /**
   * 데이터 파일 쓰기
   */
  async saveData() {
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving data:', error);
      throw new Error('Failed to save data');
    }
  }

  /**
   * 데이터 초기화 (메모리에 없으면 파일에서 로드)
   */
  async ensureData() {
    if (!this.data) {
      await this.loadData();
    }
  }

  // ========== PROJECTS ==========

  async getAllProjects() {
    await this.ensureData();
    return this.data.projects;
  }

  async getProjectById(id) {
    await this.ensureData();
    return this.data.projects.find(p => p.id === id);
  }

  async createProject(projectData) {
    await this.ensureData();
    const newProject = {
      ...projectData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.projects.push(newProject);
    await this.saveData();
    return newProject;
  }

  async updateProject(id, updates) {
    await this.ensureData();
    const index = this.data.projects.findIndex(p => p.id === id);
    if (index === -1) return null;

    this.data.projects[index] = {
      ...this.data.projects[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    await this.saveData();
    return this.data.projects[index];
  }

  async deleteProject(id) {
    await this.ensureData();
    const index = this.data.projects.findIndex(p => p.id === id);
    if (index === -1) return false;

    this.data.projects.splice(index, 1);
    await this.saveData();
    return true;
  }

  // ========== THREADS ==========

  async getAllThreads(filters = {}) {
    await this.ensureData();
    let threads = this.data.threads;

    if (filters.project_id) {
      threads = threads.filter(t => t.project_id === filters.project_id);
    }
    if (filters.status) {
      threads = threads.filter(t => t.status === filters.status);
    }

    return threads;
  }

  async getThreadById(id) {
    await this.ensureData();
    return this.data.threads.find(t => t.id === id);
  }

  async createThread(threadData) {
    await this.ensureData();
    const newThread = {
      ...threadData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.threads.push(newThread);
    await this.saveData();
    return newThread;
  }

  async updateThread(id, updates) {
    await this.ensureData();
    const index = this.data.threads.findIndex(t => t.id === id);
    if (index === -1) return null;

    this.data.threads[index] = {
      ...this.data.threads[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    await this.saveData();
    return this.data.threads[index];
  }

  async deleteThread(id) {
    await this.ensureData();
    const index = this.data.threads.findIndex(t => t.id === id);
    if (index === -1) return false;

    this.data.threads.splice(index, 1);
    await this.saveData();
    return true;
  }

  // ========== TASKS ==========

  async getAllTasks(filters = {}) {
    await this.ensureData();
    let tasks = this.data.tasks;

    if (filters.thread_id) {
      tasks = tasks.filter(t => t.thread_id === filters.thread_id);
    }
    if (filters.assignee_id) {
      tasks = tasks.filter(t => t.assignee_id === filters.assignee_id);
    }
    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }

    return tasks;
  }

  async getTaskById(id) {
    await this.ensureData();
    return this.data.tasks.find(t => t.id === id);
  }

  async createTask(taskData) {
    await this.ensureData();
    const newTask = {
      ...taskData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.tasks.push(newTask);
    await this.saveData();
    return newTask;
  }

  async updateTask(id, updates) {
    await this.ensureData();
    const index = this.data.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    this.data.tasks[index] = {
      ...this.data.tasks[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    await this.saveData();
    return this.data.tasks[index];
  }

  async deleteTask(id) {
    await this.ensureData();
    const index = this.data.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;

    this.data.tasks.splice(index, 1);
    await this.saveData();
    return true;
  }

  // ========== TEAM MEMBERS ==========

  async getAllMembers() {
    await this.ensureData();
    return this.data.team_members.filter(m => m.is_active);
  }

  async getMemberById(id) {
    await this.ensureData();
    return this.data.team_members.find(m => m.id === id);
  }

  async createMember(memberData) {
    await this.ensureData();
    const newMember = {
      ...memberData,
      is_active: true,
      created_at: new Date().toISOString()
    };
    this.data.team_members.push(newMember);
    await this.saveData();
    return newMember;
  }

  async updateMember(id, updates) {
    await this.ensureData();
    const index = this.data.team_members.findIndex(m => m.id === id);
    if (index === -1) return null;

    this.data.team_members[index] = {
      ...this.data.team_members[index],
      ...updates
    };
    await this.saveData();
    return this.data.team_members[index];
  }

  async deleteMember(id) {
    await this.ensureData();
    const index = this.data.team_members.findIndex(m => m.id === id);
    if (index === -1) return false;

    // Soft delete
    this.data.team_members[index].is_active = false;
    await this.saveData();
    return true;
  }

  // ========== THREAD ASSIGNMENTS ==========

  async assignThread(threadId, memberId, role, note = '') {
    await this.ensureData();
    const newAssignment = {
      id: `assign-${Date.now()}`,
      thread_id: threadId,
      member_id: memberId,
      role: role,
      grabbed_at: new Date().toISOString(),
      released_at: null,
      note: note
    };
    this.data.thread_assignments.push(newAssignment);
    await this.saveData();
    return newAssignment;
  }

  async releaseThread(assignmentId, note = '') {
    await this.ensureData();
    const index = this.data.thread_assignments.findIndex(a => a.id === assignmentId);
    if (index === -1) return null;

    this.data.thread_assignments[index].released_at = new Date().toISOString();
    if (note) {
      this.data.thread_assignments[index].note = note;
    }
    await this.saveData();
    return this.data.thread_assignments[index];
  }

  async getThreadAssignments(threadId) {
    await this.ensureData();
    return this.data.thread_assignments
      .filter(a => a.thread_id === threadId)
      .sort((a, b) => new Date(a.grabbed_at) - new Date(b.grabbed_at));
  }

  async getCurrentAssignments(threadId) {
    await this.ensureData();
    return this.data.thread_assignments.filter(
      a => a.thread_id === threadId && a.released_at === null
    );
  }

  // ========== STAKEHOLDERS ==========

  async getAllStakeholders() {
    await this.ensureData();
    return this.data.stakeholders;
  }

  async getStakeholderById(id) {
    await this.ensureData();
    return this.data.stakeholders.find(s => s.id === id);
  }

  async createStakeholder(stakeholderData) {
    await this.ensureData();
    const newStakeholder = {
      ...stakeholderData,
      created_at: new Date().toISOString()
    };
    this.data.stakeholders.push(newStakeholder);
    await this.saveData();
    return newStakeholder;
  }

  async updateStakeholder(id, updates) {
    await this.ensureData();
    const index = this.data.stakeholders.findIndex(s => s.id === id);
    if (index === -1) return null;

    this.data.stakeholders[index] = {
      ...this.data.stakeholders[index],
      ...updates
    };
    await this.saveData();
    return this.data.stakeholders[index];
  }

  async deleteStakeholder(id) {
    await this.ensureData();
    const index = this.data.stakeholders.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.data.stakeholders.splice(index, 1);
    await this.saveData();
    return true;
  }

  // ========== THREAD STAKEHOLDERS ==========

  async addThreadStakeholder(threadId, stakeholderId, roleType) {
    await this.ensureData();
    const newMapping = {
      thread_id: threadId,
      stakeholder_id: stakeholderId,
      role_type: roleType
    };
    this.data.thread_stakeholders.push(newMapping);
    await this.saveData();
    return newMapping;
  }

  async removeThreadStakeholder(threadId, stakeholderId) {
    await this.ensureData();
    const index = this.data.thread_stakeholders.findIndex(
      ts => ts.thread_id === threadId && ts.stakeholder_id === stakeholderId
    );
    if (index === -1) return false;

    this.data.thread_stakeholders.splice(index, 1);
    await this.saveData();
    return true;
  }

  async getThreadStakeholders(threadId) {
    await this.ensureData();
    const mappings = this.data.thread_stakeholders.filter(
      ts => ts.thread_id === threadId
    );

    return mappings.map(mapping => {
      const stakeholder = this.data.stakeholders.find(
        s => s.id === mapping.stakeholder_id
      );
      return {
        ...stakeholder,
        role_type: mapping.role_type
      };
    });
  }
}

// Singleton instance
const dataService = new DataService();

module.exports = dataService;
