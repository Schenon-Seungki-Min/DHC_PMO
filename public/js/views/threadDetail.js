/**
 * Thread Detail View
 * Thread 상세 정보, 담당자, Task 목록, 히스토리
 */

class ThreadDetailView {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.container = null;
    this.currentThread = null;
    this.currentProject = null;
    this.assignments = [];
    this.tasks = [];
    this.members = [];
    this.stakeholders = [];
    this.threadStakeholders = [];
    this.history = [];
  }

  /**
   * Thread Detail 렌더링
   */
  async render(container, thread, project) {
    this.container = container;
    this.currentThread = thread;
    this.currentProject = project;

    try {
      // 데이터 로드
      await this.loadData();

      // UI 렌더링
      this.renderUI();

      // 이벤트 리스너 등록
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to load thread detail:', error);
      container.innerHTML = `
        <div class="card-modern p-6 text-center">
          <p class="text-red-600 font-semibold">Thread 정보를 불러올 수 없습니다.</p>
          <p class="text-sm text-gray-600 mt-2">${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * 데이터 로드
   */
  async loadData() {
    // 현재 assignment 로드
    this.assignments = await this.apiClient.getCurrentAssignments(this.currentThread.id);

    // Task 로드
    const allTasks = await this.apiClient.getAllTasks();
    this.tasks = allTasks.filter(t => t.thread_id === this.currentThread.id);

    // 팀원 로드
    this.members = await this.apiClient.getAllMembers();

    // Stakeholder 로드
    this.stakeholders = await this.apiClient.getAllStakeholders();
    this.threadStakeholders = await this.apiClient.getThreadStakeholders(this.currentThread.id);

    // 히스토리 로드
    this.history = await this.apiClient.getThreadHistory(this.currentThread.id);
  }

  /**
   * UI 렌더링
   */
  renderUI() {
    const dDay = this.calculateDDay(this.currentThread.due_date);

    this.container.innerHTML = `
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 mb-4 text-sm text-gray-500 overflow-x-auto">
        <span class="cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap" id="breadcrumb-projects">Projects</span>
        <span>/</span>
        <span class="cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap" id="breadcrumb-timeline">${this.escapeHtml(this.currentProject.name)}</span>
        <span>/</span>
        <span class="text-gray-900 font-semibold whitespace-nowrap">${this.escapeHtml(this.currentThread.title)}</span>
      </div>

      <!-- Thread Detail Card -->
      <div class="card-modern">
        <!-- Header -->
        <div class="p-5 md:p-6 border-b border-gray-100">
          <div class="flex flex-col md:flex-row justify-between items-start gap-4">
            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <h2 class="text-xl md:text-2xl font-black text-gray-900">${this.escapeHtml(this.currentThread.title)}</h2>
                ${this.renderThreadTypeBadge(this.currentThread.thread_type)}
                ${this.renderStatusBadge(this.currentThread.status)}
              </div>
              <p class="text-gray-600 font-medium">${this.escapeHtml(this.currentThread.objective)}</p>
            </div>
            <div class="card-modern p-4 text-center bg-gradient-to-br from-gray-50 to-white border-2">
              <div class="text-3xl font-black text-gray-900">D-${dDay}</div>
              <div class="text-sm text-gray-600 font-semibold mt-1">마감: ${this.formatDate(this.currentThread.due_date)}</div>
            </div>
          </div>
        </div>

        <!-- Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
          <!-- Left Column: 담당자, Stakeholder, 히스토리 -->
          <div class="p-5 md:p-6 space-y-6">
            <!-- 현재 담당 -->
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-gray-900 flex items-center gap-2 text-lg">📍 현재 담당</h3>
                <button id="btn-add-assignment" class="text-sm text-blue-600 hover:text-blue-700 font-semibold">+ 추가</button>
              </div>
              <div class="space-y-3" id="assignment-list">
                ${this.renderAssignments()}
              </div>
            </div>

            <!-- Stakeholders -->
            <div>
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-gray-900 flex items-center gap-2 text-lg">🤝 Stakeholders</h3>
                <button id="btn-add-stakeholder" class="text-sm text-blue-600 hover:text-blue-700 font-semibold">+ 추가</button>
              </div>
              <div class="space-y-3" id="stakeholder-list">
                ${this.renderStakeholders()}
              </div>
            </div>

            <!-- 담당 히스토리 -->
            <div>
              <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">📜 담당 히스토리</h3>
              <div class="relative" id="history-timeline">
                ${this.renderHistory()}
              </div>
            </div>
          </div>

          <!-- Right Column: Tasks -->
          <div class="p-5 md:p-6">
            <div class="flex justify-between items-center mb-5">
              <h3 class="font-bold text-gray-900 text-lg flex items-center gap-2">📋 Tasks</h3>
              <button id="btn-add-task" class="btn-primary text-white px-3 py-2 rounded-lg text-sm font-semibold">+ 추가</button>
            </div>
            <div class="space-y-3" id="task-list">
              ${this.renderTasks()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 현재 담당자 렌더링
   */
  renderAssignments() {
    if (this.assignments.length === 0) {
      return '<div class="text-sm text-gray-500 text-center py-4">담당자가 없습니다.</div>';
    }

    // lead를 먼저, 그 다음 support
    const sortedAssignments = [...this.assignments].sort((a, b) => {
      if (a.role === 'lead' && b.role !== 'lead') return -1;
      if (a.role !== 'lead' && b.role === 'lead') return 1;
      return 0;
    });

    return sortedAssignments.map(assignment => {
      const member = this.members.find(m => m.id === assignment.member_id);
      if (!member) return '';

      const isLead = assignment.role === 'lead';
      const borderClass = isLead ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-transparent' : 'border-gray-200 bg-gradient-to-r from-gray-50 to-transparent';

      return `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border-2 ${borderClass}">
          <div class="flex items-center gap-3 mb-2 sm:mb-0">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${this.getMemberColorClass(member.role)}">
              ${member.name.charAt(0)}
            </div>
            <div>
              <span class="font-bold text-gray-900 block">${this.escapeHtml(member.name)}</span>
              <span class="badge ${isLead ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'} mt-1 inline-block">${assignment.role}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600 font-semibold">${this.formatDate(assignment.grabbed_at)}~</span>
            <button class="btn-release text-xs text-red-600 hover:text-red-700 font-semibold" data-assignment-id="${assignment.id}">제거</button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Stakeholder 렌더링
   */
  renderStakeholders() {
    if (this.threadStakeholders.length === 0) {
      return '<div class="text-sm text-gray-500 text-center py-4">Stakeholder가 없습니다.</div>';
    }

    return this.threadStakeholders.map(ts => {
      const stakeholder = this.stakeholders.find(s => s.id === ts.stakeholder_id);
      if (!stakeholder) return '';

      const roleColor = ts.role_type === 'counterpart' ? 'orange' : 'green';

      return `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-2 rounded-xl hover:border-${roleColor}-200 transition-colors">
          <div>
            <div class="font-bold text-gray-900">${this.escapeHtml(stakeholder.name)}</div>
            <div class="text-sm text-gray-600 mt-0.5">${stakeholder.type === 'internal' ? '내부' : '외부'}</div>
          </div>
          <div class="flex items-center gap-2 mt-2 sm:mt-0">
            <span class="badge bg-${roleColor}-100 text-${roleColor}-800">${ts.role_type}</span>
            <button class="btn-remove-stakeholder text-xs text-red-600 hover:text-red-700 font-semibold" data-stakeholder-id="${stakeholder.id}">제거</button>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 히스토리 타임라인 렌더링
   */
  renderHistory() {
    if (this.history.length === 0) {
      return '<div class="text-sm text-gray-500 text-center py-4">히스토리가 없습니다.</div>';
    }

    // 최신순으로 정렬
    const sortedHistory = [...this.history].sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    return `
      <div class="absolute left-5 top-8 bottom-8 w-1 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200 rounded-full"></div>
      <div class="space-y-4">
        ${sortedHistory.map((item, index) => this.renderHistoryItem(item, index)).join('')}
      </div>
    `;
  }

  /**
   * 히스토리 아이템 렌더링
   */
  renderHistoryItem(item, index) {
    const member = this.members.find(m => m.id === item.member_id);
    const memberName = member ? member.name : '알 수 없음';
    const dotClass = member ? this.getMemberDotClass(member.role) : 'bg-gray-400';

    let title = '';
    let description = '';
    let borderClass = 'border-gray-200';
    let bgClass = 'bg-gradient-to-r from-gray-50 to-transparent';

    if (item.action === 'grabbed') {
      title = `${memberName} grab`;
      description = item.note || 'Thread 담당 시작';
      if (index === 0) { // 최신 = 현재 담당
        borderClass = 'border-blue-200';
        bgClass = 'bg-gradient-to-r from-blue-50 to-transparent';
      }
    } else if (item.action === 'released') {
      title = `${memberName} release`;
      description = item.note || 'Thread 담당 종료';
    }

    return `
      <div class="flex items-start gap-4">
        <div class="timeline-dot ${dotClass} z-10 mt-2 shadow-md"></div>
        <div class="flex-1 p-4 rounded-xl border-2 ${borderClass} ${bgClass}">
          <div class="flex flex-col sm:flex-row justify-between gap-2">
            <span class="font-bold text-gray-900">${title}</span>
            <span class="text-sm text-gray-600 font-semibold">${this.formatDate(item.timestamp)}</span>
          </div>
          <div class="text-sm text-gray-600 mt-1">${this.escapeHtml(description)}</div>
        </div>
      </div>
    `;
  }

  /**
   * Task 목록 렌더링
   */
  renderTasks() {
    if (this.tasks.length === 0) {
      return '<div class="text-sm text-gray-500 text-center py-4">Task가 없습니다.</div>';
    }

    // 완료 → 진행중 → 미배정 순으로 정렬
    const statusOrder = { 'completed': 0, 'in_progress': 1, 'pending': 2 };
    const sortedTasks = [...this.tasks].sort((a, b) => {
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(a.due_date) - new Date(b.due_date);
    });

    return sortedTasks.map(task => {
      if (task.status === 'completed') {
        return this.renderCompletedTask(task);
      } else if (task.status === 'in_progress') {
        return this.renderInProgressTask(task);
      } else {
        return this.renderPendingTask(task);
      }
    }).join('');
  }

  /**
   * 완료된 Task 렌더링
   */
  renderCompletedTask(task) {
    const assignee = task.assigned_to ? this.members.find(m => m.id === task.assigned_to) : null;

    return `
      <div class="p-4 border-2 rounded-xl bg-gray-50 opacity-70">
        <div class="flex items-start gap-3">
          <span class="text-green-600 text-xl mt-0.5">✓</span>
          <div class="flex-1">
            <div class="line-through text-gray-500 font-medium">${this.escapeHtml(task.title)}</div>
            ${assignee ? `
              <div class="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span class="w-2.5 h-2.5 rounded-full ${this.getMemberDotClass(assignee.role)} shadow-sm"></span>
                <span class="font-medium">${this.escapeHtml(assignee.name)} · ${this.formatDate(task.completed_at)} 완료</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 진행중 Task 렌더링
   */
  renderInProgressTask(task) {
    const assignee = this.members.find(m => m.id === task.assigned_to);
    const dDay = this.calculateDDay(task.due_date);

    return `
      <div class="p-4 border-2 border-blue-400 rounded-xl bg-gradient-to-r from-blue-50 to-transparent shadow-sm task-item" data-task-id="${task.id}">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 flex-1">
            <span class="text-blue-600 text-xl font-bold mt-0.5">→</span>
            <div class="flex-1">
              <div class="font-bold text-gray-900">${this.escapeHtml(task.title)}</div>
              ${assignee ? `
                <div class="flex items-center gap-2 text-xs text-gray-600 mt-1">
                  <span class="w-2.5 h-2.5 rounded-full ${this.getMemberDotClass(assignee.role)} shadow-sm"></span>
                  <span class="font-semibold">${this.escapeHtml(assignee.name)} · 진행중</span>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="flex flex-col gap-1 items-end">
            ${this.renderDDayBadge(dDay)}
            <button class="btn-complete-task text-xs text-green-600 hover:text-green-700 font-semibold" data-task-id="${task.id}">완료</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 미배정 Task 렌더링
   */
  renderPendingTask(task) {
    const dDay = this.calculateDDay(task.due_date);

    return `
      <div class="p-4 border-2 rounded-xl hover:border-blue-200 transition-colors cursor-pointer task-item" data-task-id="${task.id}">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 flex-1">
            <span class="text-gray-400 text-xl mt-0.5">○</span>
            <div class="flex-1">
              <div class="font-semibold text-gray-900">${this.escapeHtml(task.title)}</div>
              <div class="text-xs text-gray-500 mt-1">미배정</div>
            </div>
          </div>
          ${this.renderDDayBadge(dDay)}
        </div>
      </div>
    `;
  }

  /**
   * Thread Type 뱃지
   */
  renderThreadTypeBadge(type) {
    const typeMap = {
      'negotiation': { label: 'negotiation', color: 'purple' },
      'development': { label: 'development', color: 'blue' },
      'research': { label: 'research', color: 'green' },
      'communication': { label: 'communication', color: 'yellow' }
    };

    const typeInfo = typeMap[type] || { label: type, color: 'gray' };
    return `<span class="badge bg-${typeInfo.color}-100 text-${typeInfo.color}-800">${typeInfo.label}</span>`;
  }

  /**
   * Status 뱃지
   */
  renderStatusBadge(status) {
    const statusMap = {
      'active': '<span class="badge bg-green-100 text-green-700">진행중</span>',
      'completed': '<span class="badge bg-gray-100 text-gray-700">완료</span>',
      'on_hold': '<span class="badge bg-yellow-100 text-yellow-700">보류</span>'
    };
    return statusMap[status] || '';
  }

  /**
   * D-day 뱃지 렌더링
   */
  renderDDayBadge(dDay) {
    let badgeClass = 'bg-gray-100 text-gray-700';
    let text = `D-${dDay}`;

    if (dDay < 0) {
      badgeClass = 'bg-red-100 text-red-700';
      text = `D+${Math.abs(dDay)}`;
    } else if (dDay <= 1) {
      badgeClass = 'bg-red-100 text-red-700';
    } else if (dDay <= 3) {
      badgeClass = 'bg-orange-100 text-orange-800';
    } else if (dDay <= 7) {
      badgeClass = 'bg-yellow-100 text-yellow-800';
    }

    return `<span class="badge ${badgeClass}">${text}</span>`;
  }

  /**
   * 이벤트 리스너 등록
   */
  attachEventListeners() {
    // Breadcrumb - Projects
    const breadcrumbProjects = document.getElementById('breadcrumb-projects');
    if (breadcrumbProjects) {
      breadcrumbProjects.addEventListener('click', () => {
        window.app.showView('projects');
      });
    }

    // Breadcrumb - Timeline
    const breadcrumbTimeline = document.getElementById('breadcrumb-timeline');
    if (breadcrumbTimeline) {
      breadcrumbTimeline.addEventListener('click', () => {
        window.app.showTimeline(this.currentProject);
      });
    }

    // 담당자 추가
    const btnAddAssignment = document.getElementById('btn-add-assignment');
    if (btnAddAssignment) {
      btnAddAssignment.addEventListener('click', () => this.showAddAssignmentModal());
    }

    // 담당자 제거
    document.querySelectorAll('.btn-release').forEach(btn => {
      btn.addEventListener('click', () => {
        const assignmentId = btn.dataset.assignmentId;
        this.releaseAssignment(assignmentId);
      });
    });

    // Stakeholder 추가
    const btnAddStakeholder = document.getElementById('btn-add-stakeholder');
    if (btnAddStakeholder) {
      btnAddStakeholder.addEventListener('click', () => this.showAddStakeholderModal());
    }

    // Stakeholder 제거
    document.querySelectorAll('.btn-remove-stakeholder').forEach(btn => {
      btn.addEventListener('click', () => {
        const stakeholderId = btn.dataset.stakeholderId;
        this.removeStakeholder(stakeholderId);
      });
    });

    // Task 추가
    const btnAddTask = document.getElementById('btn-add-task');
    if (btnAddTask) {
      btnAddTask.addEventListener('click', () => this.showAddTaskModal());
    }

    // Task 완료
    document.querySelectorAll('.btn-complete-task').forEach(btn => {
      btn.addEventListener('click', () => {
        const taskId = btn.dataset.taskId;
        this.completeTask(taskId);
      });
    });
  }

  /**
   * 담당자 추가 모달
   */
  async showAddAssignmentModal() {
    const memberOptions = this.members.map(m => `${m.name} (${m.role})`).join('\n');
    const memberName = prompt(`담당자 선택:\n${memberOptions}\n\n이름 입력:`);
    if (!memberName) return;

    const member = this.members.find(m => m.name.includes(memberName) || memberName.includes(m.name));
    if (!member) {
      alert('멤버를 찾을 수 없습니다.');
      return;
    }

    const role = confirm('Lead로 배정하시겠습니까? (취소 = Support)') ? 'lead' : 'support';
    const note = prompt('메모 (선택):') || '';

    try {
      await this.apiClient.assignThread(this.currentThread.id, member.id, role, note);
      await this.render(this.container, this.currentThread, this.currentProject);
      alert('담당자가 추가되었습니다.');
    } catch (error) {
      alert('담당자 추가 실패: ' + error.message);
    }
  }

  /**
   * 담당자 제거
   */
  async releaseAssignment(assignmentId) {
    if (!confirm('담당에서 제거하시겠습니까?')) return;

    const note = prompt('메모 (선택):') || '';

    try {
      await this.apiClient.releaseThread(this.currentThread.id, assignmentId, note);
      await this.render(this.container, this.currentThread, this.currentProject);
      alert('담당에서 제거되었습니다.');
    } catch (error) {
      alert('제거 실패: ' + error.message);
    }
  }

  /**
   * Stakeholder 추가 모달
   */
  async showAddStakeholderModal() {
    const stakeholderOptions = this.stakeholders.map(s => `${s.name} (${s.type})`).join('\n');
    const stakeholderName = prompt(`Stakeholder 선택:\n${stakeholderOptions}\n\n이름 입력:`);
    if (!stakeholderName) return;

    const stakeholder = this.stakeholders.find(s => s.name.includes(stakeholderName) || stakeholderName.includes(s.name));
    if (!stakeholder) {
      alert('Stakeholder를 찾을 수 없습니다.');
      return;
    }

    const roleType = prompt('Role type (counterpart/approver/observer):') || 'counterpart';

    try {
      await this.apiClient.addThreadStakeholder(this.currentThread.id, stakeholder.id, roleType);
      await this.render(this.container, this.currentThread, this.currentProject);
      alert('Stakeholder가 추가되었습니다.');
    } catch (error) {
      alert('Stakeholder 추가 실패: ' + error.message);
    }
  }

  /**
   * Stakeholder 제거
   */
  async removeStakeholder(stakeholderId) {
    if (!confirm('Stakeholder를 제거하시겠습니까?')) return;

    try {
      await this.apiClient.removeThreadStakeholder(this.currentThread.id, stakeholderId);
      await this.render(this.container, this.currentThread, this.currentProject);
      alert('Stakeholder가 제거되었습니다.');
    } catch (error) {
      alert('제거 실패: ' + error.message);
    }
  }

  /**
   * Task 추가 모달
   */
  async showAddTaskModal() {
    const title = prompt('Task 제목:');
    if (!title) return;

    const dueDays = prompt('마감일까지 남은 일수 (숫자):');
    if (!dueDays) return;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(dueDays));

    try {
      await this.apiClient.createTask({
        id: `task-${Date.now()}`,
        thread_id: this.currentThread.id,
        title,
        status: 'pending',
        due_date: dueDate.toISOString().split('T')[0]
      });

      await this.render(this.container, this.currentThread, this.currentProject);
      alert('Task가 추가되었습니다.');
    } catch (error) {
      alert('Task 추가 실패: ' + error.message);
    }
  }

  /**
   * Task 완료
   */
  async completeTask(taskId) {
    if (!confirm('Task를 완료하시겠습니까?')) return;

    try {
      await this.apiClient.updateTask(taskId, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });

      await this.render(this.container, this.currentThread, this.currentProject);
      alert('Task가 완료되었습니다.');
    } catch (error) {
      alert('Task 완료 실패: ' + error.message);
    }
  }

  /**
   * D-day 계산
   */
  calculateDDay(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  }

  /**
   * 날짜 포맷 (M/D)
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  /**
   * 멤버 색상 클래스
   */
  getMemberColorClass(role) {
    const colorMap = {
      'pm': 'color-coree',
      'intern': 'color-intern-a',
      'member': 'color-kim'
    };
    return colorMap[role] || 'color-intern-b';
  }

  /**
   * 멤버 dot 클래스
   */
  getMemberDotClass(role) {
    const dotMap = {
      'pm': 'dot-coree',
      'intern': 'dot-intern-a',
      'member': 'dot-kim'
    };
    return dotMap[role] || 'dot-intern-b';
  }

  /**
   * HTML 이스케이프
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
