const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Data Service - Supabase 기반 데이터 레이어
 * JSON 파일 기반 버전과 동일한 메서드 시그니처 유지
 */
class DataService {

  // ========== PROJECTS ==========

  async getAllProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }

  async getProjectById(id) {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw new Error(error.message);
    return data;
  }

  async createProject(projectData) {
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateProject(id, updates) {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteProject(id) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  // ========== THREADS ==========

  async getAllThreads(filters = {}) {
    let query = supabase.from('threads').select('*');
    if (filters.project_id) query = query.eq('project_id', filters.project_id);
    if (filters.status) query = query.eq('status', filters.status);
    query = query.order('created_at', { ascending: true });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  async getThreadById(id) {
    const { data, error } = await supabase
      .from('threads')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw new Error(error.message);
    return data;
  }

  async createThread(threadData) {
    const { data, error } = await supabase
      .from('threads')
      .insert([threadData])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateThread(id, updates) {
    const { data, error } = await supabase
      .from('threads')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteThread(id) {
    const { error } = await supabase
      .from('threads')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  // ========== TASKS ==========

  async getAllTasks(filters = {}) {
    let query = supabase.from('tasks').select('*');
    if (filters.thread_id) query = query.eq('thread_id', filters.thread_id);
    if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id);
    if (filters.status) query = query.eq('status', filters.status);
    query = query.order('created_at', { ascending: true });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  async getTaskById(id) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw new Error(error.message);
    return data;
  }

  async createTask(taskData) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateTask(id, updates) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteTask(id) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  // ========== TEAM MEMBERS ==========

  async getAllMembers() {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }

  async getMemberById(id) {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw new Error(error.message);
    return data;
  }

  async createMember(memberData) {
    const payload = { ...memberData, is_active: true };
    const { data, error } = await supabase
      .from('team_members')
      .insert([payload])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateMember(id, updates) {
    const { data, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteMember(id) {
    // Soft delete
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  // ========== THREAD ASSIGNMENTS ==========

  async assignThread(threadId, memberId, role, note = '') {
    const payload = {
      id: `assign-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      thread_id: threadId,
      member_id: memberId,
      role,
      grabbed_at: new Date().toISOString(),
      released_at: null,
      note
    };
    const { data, error } = await supabase
      .from('thread_assignments')
      .insert([payload])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async releaseThread(assignmentId, note = '') {
    const updates = { released_at: new Date().toISOString() };
    if (note) updates.note = note;
    const { data, error } = await supabase
      .from('thread_assignments')
      .update(updates)
      .eq('id', assignmentId)
      .select()
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw new Error(error.message);
    return data;
  }

  async getThreadAssignments(threadId) {
    const { data, error } = await supabase
      .from('thread_assignments')
      .select('*')
      .eq('thread_id', threadId)
      .order('grabbed_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }

  async getCurrentAssignments(threadId) {
    const { data, error } = await supabase
      .from('thread_assignments')
      .select('*')
      .eq('thread_id', threadId)
      .is('released_at', null);
    if (error) throw new Error(error.message);
    return data;
  }

  // ========== THREAD TEMPLATES ==========

  async getAllTemplates() {
    const { data, error } = await supabase
      .from('thread_templates')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }

  async getTemplateById(id) {
    const { data, error } = await supabase
      .from('thread_templates')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw new Error(error.message);
    return data;
  }

  async createTemplate(templateData) {
    const { data, error } = await supabase
      .from('thread_templates')
      .insert([templateData])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateTemplate(id, updates) {
    const { data, error } = await supabase
      .from('thread_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteTemplate(id) {
    const { error } = await supabase
      .from('thread_templates')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  // ========== TEMPLATE TASKS ==========

  async getTemplateTasks(templateId) {
    const { data, error } = await supabase
      .from('template_tasks')
      .select('*')
      .eq('template_id', templateId)
      .order('order', { ascending: true });
    if (error) throw new Error(error.message);
    return data;
  }

  async createTemplateTask(taskData) {
    const { data, error } = await supabase
      .from('template_tasks')
      .insert([taskData])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateTemplateTask(id, updates) {
    const { data, error } = await supabase
      .from('template_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error && error.code === 'PGRST116') return null;
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteTemplateTask(id) {
    const { error } = await supabase
      .from('template_tasks')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  // ========== CREATE THREAD FROM TEMPLATE ==========

  async createThreadFromTemplate(templateId, threadData) {
    const template = await this.getTemplateById(templateId);
    if (!template) throw new Error('Template not found');

    const newThread = {
      ...threadData,
      thread_type: template.thread_type
    };
    const { data: createdThread, error: threadError } = await supabase
      .from('threads')
      .insert([newThread])
      .select()
      .single();
    if (threadError) throw new Error(threadError.message);

    const templateTasks = await this.getTemplateTasks(templateId);
    const dueDate = new Date(threadData.due_date);
    const taskRows = templateTasks.map(tt => {
      const taskDue = new Date(dueDate);
      taskDue.setDate(taskDue.getDate() + tt.day_offset);
      return {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        thread_id: createdThread.id,
        title: tt.title,
        assignee_id: null,
        start_date: null,
        due_date: taskDue.toISOString().split('T')[0],
        status: 'todo',
        priority: tt.priority,
        notes: tt.notes || ''
      };
    });

    if (taskRows.length > 0) {
      const { error: taskError } = await supabase.from('tasks').insert(taskRows);
      if (taskError) throw new Error(taskError.message);
    }

    return { thread: createdThread, tasks: taskRows };
  }
}

const dataService = new DataService();
module.exports = dataService;
