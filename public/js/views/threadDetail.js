/**
 * Thread Detail View
 * Thread 상세 정보, 담당자, Stakeholder(텍스트), Task 목록, 히스토리
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
      await this.loadData();
      this.renderUI();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to load thread detail:', error);
      container.innerHTML = `
        <div class="card-modern p-6 text-center">
          <p class="text-red-600 font-semibold">Thread 정보를 불러올 수 없습니다.</p>
          <p class="text-sm text-gray-600 mt-2">${Helpers.escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  /**
   * 데이터 로드
   */
  async loadData() {
    this.assignments = await this.apiClient.getCurrentAssignments(this.currentThread.id);

    const allTasks = await this.apiClient.getAllTasks();
    this.tasks = allTasks.filter(t => t.thread_id === this.currentThread.id);

    this.members = await this.apiClient.getAllMembers();

    this.history = await this.apiClient.getThreadHistory(this.currentThread.id);
  }

  /**
   * UI 렌더링
   */
  renderUI() {
    const dDay = Helpers.calculateDDay(this.currentThread.due_date);
    const projectName = this.currentProject ? this.currentProject.name : '전체 프로젝트';
    const stakeholderText = this.currentThread.stakeholder_text || '';

    this.container.innerHTML = `
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 mb-4 text-sm text-gray-500 overflow-x-auto">
        <span class="cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap" id="breadcrumb-timeline">\u2190 Timeline</span>
        <span>/</span>
        <span class="text-gray-900 font-semibold whitespace-nowrap">${Helpers.escapeHtml(this.currentThread.title)}</span>
      </div>

      <!-- Thread Detail Card -->
      <div class="card-modern">
        <!-- Header -->
        <div class="p-5 md:p-6 border-b border-gray-100">
          <div class="flex flex-col md:flex-row justify-between items-start gap-4">
            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <h2 class="text-xl md:text-2xl font-black text-gray-900">${Helpers.escapeHtml(this.currentThread.title)}</h2>
                ${this.renderStatusBadge(this.currentThread.status)}
                <button id="btn-change-status" class="text-xs text-gray-500 hover:text-blue-600 font-semibold px-2 py-0.5 border border-gray-300 hover:border-blue-400 rounded-lg transition">상태 변경</button>
                <button id="btn-edit-thread" class="text-xs text-gray-500 hover:text-indigo-600 font-semibold px-2 py-0.5 border border-gray-300 hover:border-indigo-400 rounded-lg transition">수정</button>
                <span class="text-xs text-gray-400 font-medium">${Helpers.escapeHtml(projectName)}</span>
              </div>
              <p class="text-gray-600 font-medium">${Helpers.escapeHtml(this.currentThread.outcome_goal || '목표 없음')}</p>
            </div>
            <div class="flex items-start gap-3">
              <div class="card-modern p-4 text-center bg-gradient-to-br from-gray-50 to-white border-2">
                <div class="text-3xl font-black text-gray-900">D-${dDay}</div>
                <div class="text-sm text-gray-600 font-semibold mt-1">마감: ${Helpers.formatDate(this.currentThread.due_date)}</div>
              </div>
              <button id="btn-delete-thread" class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition" title="Thread 삭제">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
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
                <h3 class="font-bold text-gray-900 flex items-center gap-2 text-lg">현재 담당</h3>
                <button id="btn-add-assignment" class="text-sm text-blue-600 hover:text-blue-700 font-semibold">+ 추가</button>
              </div>
              <div class="space-y-3" id="assignment-list">
                ${this.renderAssignments()}
              </div>
            </div>

            <!-- Stakeholders (텍스트 입력) -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-bold text-gray-900 flex items-center gap-2 text-lg">Stakeholders</h3>
              </div>
              <div class="space-y-2">
                <textarea id="stakeholder-text-input"
                  placeholder="업체명, 담당자 등 자유롭게 입력&#10;예: EMR업체 (홍길동), 법무팀"
                  class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none resize-none"
                  rows="3">${Helpers.escapeHtml(stakeholderText)}</textarea>
                <div class="flex justify-end">
                  <button id="btn-save-stakeholder" class="text-xs text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 border border-blue-300 hover:border-blue-400 rounded-lg transition">저장</button>
                </div>
              </div>
            </div>

            <!-- 담당 히스토리 -->
            <div>
              <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2 text-lg">담당 히스토리</h3>
              <div class="relative" id="history-timeline">
                ${this.renderHistory()}
              </div>
            </div>
          </div>

          <!-- Right Column: Tasks -->
          <div class="p-5 md:p-6">
            <div class="flex justify-between items-center mb-5">
              <h3 class="font-bold text-gray-900 text-lg flex items-center gap-2">Tasks</h3>
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
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${Helpers.getMemberColorClass(member.role)}">
              ${member.name.charAt(0)}
            </div>
            <div>
              <span class="font-bold text-gray-900 block">${Helpers.escapeHtml(member.name)}</span>
              <span class="badge ${isLead ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'} mt-1 inline-block">${assignment.role}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600 font-semibold">${Helpers.formatDate(assignment.grabbed_at)}~</span>
            <button class="btn-release text-xs text-red-600 hover:text-red-700 font-semibold" data-assignment-id="${assignment.id}">제거</button>
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

    const events = [];
    this.history.forEach(item => {
      events.push({ ...item, eventType: 'grab', timestamp: item.grabbed_at });
      if (item.released_at) {
        events.push({ ...item, eventType: 'release', timestamp: item.released_at });
      }
    });

    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return `
      <div class="absolute left-5 top-8 bottom-8 w-1 bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200 rounded-full"></div>
      <div class="space-y-4">
        ${events.map((item, index) => this.renderHistoryItem(item, index)).join('')}
      </div>
    `;
  }

  /**
   * 히스토리 아이템 렌더링
   */
  renderHistoryItem(item, index) {
    const member = this.members.find(m => m.id === item.member_id);
    const memberName = member ? member.name : '알 수 없음';
    const dotClass = member ? Helpers.getMemberDotClass(member.role) : 'bg-gray-400';

    const isGrab = item.eventType === 'grab';
    const title = isGrab ? `${memberName} grab (${item.role})` : `${memberName} release`;
    const description = item.note || (isGrab ? 'Thread 담당 시작' : 'Thread 담당 종료');

    let borderClass = 'border-gray-200';
    let bgClass = 'bg-gradient-to-r from-gray-50 to-transparent';
    if (isGrab && index === 0) {
      borderClass = 'border-blue-200';
      bgClass = 'bg-gradient-to-r from-blue-50 to-transparent';
    }

    return `
      <div class="flex items-start gap-4">
        <div class="timeline-dot ${dotClass} z-10 mt-2 shadow-md"></div>
        <div class="flex-1 p-4 rounded-xl border-2 ${borderClass} ${bgClass}">
          <div class="flex flex-col sm:flex-row justify-between gap-2">
            <span class="font-bold text-gray-900">${Helpers.escapeHtml(title)}</span>
            <span class="text-sm text-gray-600 font-semibold">${Helpers.formatDate(item.timestamp)}</span>
          </div>
          <div class="text-sm text-gray-600 mt-1">${Helpers.escapeHtml(description)}</div>
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

    const statusOrder = { 'in_progress': 0, 'pending': 1, 'completed': 2 };
    const sortedTasks = [...this.tasks].sort((a, b) => {
      const oa = statusOrder[a.status] ?? 1;
      const ob = statusOrder[b.status] ?? 1;
      if (oa !== ob) return oa - ob;
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

  /** 삭제 아이콘 SVG */
  _trashIcon(taskId) {
    return `<button class="btn-delete-task text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition" data-task-id="${taskId}" title="삭제">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
      </svg>
    </button>`;
  }

  /** 수정 아이콘 버튼 */
  _editIcon(taskId) {
    return `<button class="btn-edit-task text-blue-500 hover:text-blue-700 p-1 hover:bg-blue-50 rounded transition" data-task-id="${taskId}" title="수정">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
      </svg>
    </button>`;
  }

  renderCompletedTask(task) {
    const assignee = task.assignee_id ? this.members.find(m => m.id === task.assignee_id) : null;
    const notes = task.notes ? Helpers.escapeHtml(task.notes.slice(0, 30)) : '';

    return `
      <div class="p-4 border-2 rounded-xl bg-gray-50 opacity-75">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 flex-1">
            <span class="text-green-600 text-xl mt-0.5">✓</span>
            <div class="flex-1">
              <div class="line-through text-gray-500 font-medium">${Helpers.escapeHtml(task.title)}</div>
              ${notes ? `<div class="text-xs text-gray-400 mt-0.5">${notes}</div>` : ''}
              ${assignee ? `
                <div class="flex items-center gap-2 text-xs text-gray-400 mt-1">
                  <span class="w-2 h-2 rounded-full ${Helpers.getMemberDotClass(assignee.role)}"></span>
                  <span>${Helpers.escapeHtml(assignee.name)} · ${task.completed_at ? Helpers.formatDate(task.completed_at) : ''} 완료</span>
                </div>
              ` : ''}
            </div>
          </div>
          <div class="flex gap-1 items-start">${this._trashIcon(task.id)}</div>
        </div>
      </div>
    `;
  }

  renderInProgressTask(task) {
    const assignee = task.assignee_id ? this.members.find(m => m.id === task.assignee_id) : null;
    const dDay = Helpers.calculateDDay(task.due_date);
    const notes = task.notes ? Helpers.escapeHtml(task.notes.slice(0, 30)) : '';

    return `
      <div class="p-4 border-2 border-blue-400 rounded-xl bg-gradient-to-r from-blue-50 to-transparent shadow-sm" data-task-id="${task.id}">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 flex-1">
            <span class="text-blue-600 text-xl font-bold mt-0.5">\u2192</span>
            <div class="flex-1">
              <div class="font-bold text-gray-900">${Helpers.escapeHtml(task.title)}</div>
              ${notes ? `<div class="text-xs text-gray-500 mt-0.5">${notes}</div>` : ''}
              ${assignee ? `
                <div class="flex items-center gap-2 text-xs text-gray-600 mt-1">
                  <span class="w-2.5 h-2.5 rounded-full ${Helpers.getMemberDotClass(assignee.role)} shadow-sm"></span>
                  <span class="font-semibold">${Helpers.escapeHtml(assignee.name)}</span>
                </div>
              ` : `<div class="text-xs text-gray-400 mt-1">미배정</div>`}
            </div>
          </div>
          <div class="flex flex-col gap-1 items-end shrink-0">
            ${Helpers.renderDDayBadge(dDay)}
            <div class="flex gap-1 items-center mt-1">
              <button class="btn-complete-task text-xs text-green-600 hover:text-green-700 font-semibold px-2 py-1 hover:bg-green-50 rounded transition" data-task-id="${task.id}">완료</button>
              ${this._editIcon(task.id)}
              ${this._trashIcon(task.id)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderPendingTask(task) {
    const assignee = task.assignee_id ? this.members.find(m => m.id === task.assignee_id) : null;
    const dDay = Helpers.calculateDDay(task.due_date);
    const notes = task.notes ? Helpers.escapeHtml(task.notes.slice(0, 30)) : '';

    return `
      <div class="p-4 border-2 rounded-xl hover:border-blue-200 transition-colors" data-task-id="${task.id}">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 flex-1">
            <span class="text-gray-400 text-xl mt-0.5">\u25CB</span>
            <div class="flex-1">
              <div class="font-semibold text-gray-900">${Helpers.escapeHtml(task.title)}</div>
              ${notes ? `<div class="text-xs text-gray-500 mt-0.5">${notes}</div>` : ''}
              <div class="text-xs text-gray-400 mt-1">${assignee ? Helpers.escapeHtml(assignee.name) : '미배정'}</div>
            </div>
          </div>
          <div class="flex flex-col gap-1 items-end shrink-0">
            ${Helpers.renderDDayBadge(dDay)}
            <div class="flex gap-1 items-center mt-1">
              ${this._editIcon(task.id)}
              ${this._trashIcon(task.id)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderStatusBadge(status) {
    const statusMap = {
      'active': '<span class="badge bg-green-100 text-green-700">진행중</span>',
      'completed': '<span class="badge bg-gray-100 text-gray-700">완료</span>',
      'on_hold': '<span class="badge bg-yellow-100 text-yellow-700">보류</span>'
    };
    return statusMap[status] || '';
  }

  /**
   * 이벤트 리스너 등록
   */
  attachEventListeners() {
    // Breadcrumb
    const breadcrumbTimeline = document.getElementById('breadcrumb-timeline');
    if (breadcrumbTimeline) {
      breadcrumbTimeline.addEventListener('click', () => {
        window.location.hash = '/timeline';
      });
    }

    // Thread 상태 변경
    const btnChangeStatus = document.getElementById('btn-change-status');
    if (btnChangeStatus) {
      btnChangeStatus.addEventListener('click', () => this.showChangeStatusModal());
    }

    // Thread 수정
    const btnEditThread = document.getElementById('btn-edit-thread');
    if (btnEditThread) {
      btnEditThread.addEventListener('click', () => this.showEditThreadModal());
    }

    // Thread 삭제
    const btnDeleteThread = document.getElementById('btn-delete-thread');
    if (btnDeleteThread) {
      btnDeleteThread.addEventListener('click', () => this.deleteThread());
    }

    // 담당자 추가
    const btnAddAssignment = document.getElementById('btn-add-assignment');
    if (btnAddAssignment) {
      btnAddAssignment.addEventListener('click', () => this.showAddAssignmentModal());
    }

    // 담당자 제거
    document.querySelectorAll('.btn-release').forEach(btn => {
      btn.addEventListener('click', () => {
        this.releaseAssignment(btn.dataset.assignmentId);
      });
    });

    // Stakeholder 텍스트 저장
    const btnSaveStakeholder = document.getElementById('btn-save-stakeholder');
    if (btnSaveStakeholder) {
      btnSaveStakeholder.addEventListener('click', () => this.saveStakeholderText());
    }

    // Task 추가
    const btnAddTask = document.getElementById('btn-add-task');
    if (btnAddTask) {
      btnAddTask.addEventListener('click', () => this.showAddTaskModal());
    }

    // Task 완료
    document.querySelectorAll('.btn-complete-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.completeTask(btn.dataset.taskId);
      });
    });

    // Task 수정
    document.querySelectorAll('.btn-edit-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showEditTaskModal(btn.dataset.taskId);
      });
    });

    // Task 삭제
    document.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteTask(btn.dataset.taskId);
      });
    });
  }

  /**
   * Stakeholder 텍스트 저장
   */
  async saveStakeholderText() {
    const textarea = document.getElementById('stakeholder-text-input');
    if (!textarea) return;

    const text = textarea.value.trim();
    try {
      const updated = await this.apiClient.updateThread(this.currentThread.id, {
        stakeholder_text: text
      });
      this.currentThread = { ...this.currentThread, ...updated };
      // 저장 성공 피드백
      const btn = document.getElementById('btn-save-stakeholder');
      if (btn) {
        btn.textContent = '저장됨';
        btn.classList.replace('text-blue-600', 'text-green-600');
        btn.classList.replace('border-blue-300', 'border-green-300');
        setTimeout(() => {
          btn.textContent = '저장';
          btn.classList.replace('text-green-600', 'text-blue-600');
          btn.classList.replace('border-green-300', 'border-blue-300');
        }, 1500);
      }
    } catch (error) {
      alert('Stakeholder 저장 실패: ' + error.message);
    }
  }

  /**
   * 담당자 추가 모달
   */
  showAddAssignmentModal() {
    const memberOptions = this.members.map(m =>
      `<option value="${m.id}">${Helpers.escapeHtml(m.name)} (${Helpers.translateRole(m.role)})</option>`
    ).join('');

    Helpers.showModal(`
      <h3 class="text-lg font-bold text-gray-900 mb-5">담당자 추가</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">팀원 선택</label>
          <select id="m-member-id" class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
            ${memberOptions}
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">역할</label>
          <div class="flex gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="m-assign-role" value="lead" checked class="accent-blue-600"> <span class="text-sm font-medium">Lead</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="m-assign-role" value="support" class="accent-blue-600"> <span class="text-sm font-medium">Support</span>
            </label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">메모 (선택)</label>
          <input type="text" id="m-assign-note" placeholder="인계 사유 등" class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button id="m-cancel" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">취소</button>
        <button id="m-submit" class="flex-1 py-2.5 rounded-xl btn-primary text-white font-semibold text-sm">추가</button>
      </div>
    `);
    document.getElementById('m-cancel').onclick = () => Helpers.closeModal();
    document.getElementById('m-submit').onclick = async () => {
      const memberId = document.getElementById('m-member-id').value;
      const role = document.querySelector('input[name="m-assign-role"]:checked')?.value || 'support';
      const note = document.getElementById('m-assign-note').value.trim();
      Helpers.closeModal();
      try {
        await this.apiClient.assignThread(this.currentThread.id, memberId, role, note);
        await this.render(this.container, this.currentThread, this.currentProject);
      } catch (error) {
        alert('담당자 추가 실패: ' + error.message);
      }
    };
  }

  async releaseAssignment(assignmentId) {
    if (!confirm('담당에서 제거하시겠습니까?')) return;
    try {
      await this.apiClient.releaseThread(this.currentThread.id, assignmentId, '');
      await this.render(this.container, this.currentThread, this.currentProject);
    } catch (error) {
      alert('제거 실패: ' + error.message);
    }
  }

  showAddTaskModal() {
    const today = new Date().toISOString().split('T')[0];
    const memberOptions = `<option value="">미배정</option>` +
      this.members.map(m =>
        `<option value="${m.id}">${Helpers.escapeHtml(m.name)}</option>`
      ).join('');

    Helpers.showModal(`
      <h3 class="text-lg font-bold text-gray-900 mb-5">Task 추가</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">제목 <span class="text-red-500">*</span></label>
          <input type="text" id="m-task-title" placeholder="Task 제목" maxlength="60"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">마감일 <span class="text-red-500">*</span></label>
          <input type="date" id="m-task-due" value="${today}" min="${today}"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">담당자</label>
          <select id="m-task-assignee" class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
            ${memberOptions}
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">메모 <span class="text-gray-400 font-normal">(최대 30자)</span></label>
          <input type="text" id="m-task-notes" placeholder="간단한 메모" maxlength="30"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
          <div class="text-xs text-gray-400 mt-1 text-right"><span id="m-notes-count">0</span>/30</div>
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button id="m-cancel" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">취소</button>
        <button id="m-submit" class="flex-1 py-2.5 rounded-xl btn-primary text-white font-semibold text-sm">추가</button>
      </div>
    `);

    document.getElementById('m-task-notes').addEventListener('input', function() {
      document.getElementById('m-notes-count').textContent = this.value.length;
    });

    document.getElementById('m-cancel').onclick = () => Helpers.closeModal();
    document.getElementById('m-submit').onclick = async () => {
      const title = document.getElementById('m-task-title').value.trim();
      const dueDate = document.getElementById('m-task-due').value;
      const assigneeId = document.getElementById('m-task-assignee').value;
      const notes = document.getElementById('m-task-notes').value.trim();

      if (!title) { alert('제목을 입력해주세요.'); return; }
      if (!dueDate) { alert('마감일을 선택해주세요.'); return; }

      Helpers.closeModal();
      try {
        await this.apiClient.createTask({
          id: `task-${Date.now()}`,
          thread_id: this.currentThread.id,
          title,
          assignee_id: assigneeId || null,
          due_date: dueDate,
          status: assigneeId ? 'in_progress' : 'pending',
          notes
        });
        await this.render(this.container, this.currentThread, this.currentProject);
      } catch (error) {
        alert('Task 추가 실패: ' + error.message);
      }
    };
  }

  showEditTaskModal(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    const memberOptions = `<option value="">미배정</option>` +
      this.members.map(m =>
        `<option value="${m.id}" ${m.id === task.assignee_id ? 'selected' : ''}>${Helpers.escapeHtml(m.name)}</option>`
      ).join('');

    const statusOptions = [
      { value: 'pending',     label: '대기' },
      { value: 'in_progress', label: '진행중' },
      { value: 'completed',   label: '완료' }
    ].map(s => `<option value="${s.value}" ${s.value === task.status ? 'selected' : ''}>${s.label}</option>`).join('');

    const dueVal = task.due_date ? task.due_date.split('T')[0] : '';
    const notes = task.notes || '';

    Helpers.showModal(`
      <h3 class="text-lg font-bold text-gray-900 mb-5">Task 수정</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">제목</label>
          <input type="text" id="m-edit-title" value="${Helpers.escapeHtml(task.title)}" maxlength="60"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">마감일</label>
          <input type="date" id="m-edit-due" value="${dueVal}"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">담당자</label>
          <select id="m-edit-assignee" class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
            ${memberOptions}
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">상태</label>
          <select id="m-edit-status" class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
            ${statusOptions}
          </select>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">메모 <span class="text-gray-400 font-normal">(최대 30자)</span></label>
          <input type="text" id="m-edit-notes" value="${Helpers.escapeHtml(notes)}" maxlength="30"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
          <div class="text-xs text-gray-400 mt-1 text-right"><span id="m-enotes-count">${notes.length}</span>/30</div>
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button id="m-cancel" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">취소</button>
        <button id="m-submit" class="flex-1 py-2.5 rounded-xl btn-primary text-white font-semibold text-sm">저장</button>
      </div>
    `);

    document.getElementById('m-edit-notes').addEventListener('input', function() {
      document.getElementById('m-enotes-count').textContent = this.value.length;
    });

    document.getElementById('m-cancel').onclick = () => Helpers.closeModal();
    document.getElementById('m-submit').onclick = async () => {
      const title = document.getElementById('m-edit-title').value.trim();
      const dueDate = document.getElementById('m-edit-due').value;
      const assigneeId = document.getElementById('m-edit-assignee').value;
      const status = document.getElementById('m-edit-status').value;
      const notes = document.getElementById('m-edit-notes').value.trim();

      if (!title) { alert('제목을 입력해주세요.'); return; }

      const updates = { title, due_date: dueDate, assignee_id: assigneeId || null, status, notes };
      if (status === 'completed' && task.status !== 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      Helpers.closeModal();
      try {
        await this.apiClient.updateTask(taskId, updates);
        await this.render(this.container, this.currentThread, this.currentProject);
      } catch (error) {
        alert('Task 수정 실패: ' + error.message);
      }
    };
  }

  async completeTask(taskId) {
    if (!confirm('Task를 완료 처리하시겠습니까?')) return;
    try {
      await this.apiClient.updateTask(taskId, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      await this.render(this.container, this.currentThread, this.currentProject);
    } catch (error) {
      alert('Task 완료 실패: ' + error.message);
    }
  }

  async deleteTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (!confirm(`"${task.title}" Task를 삭제하시겠습니까?`)) return;
    try {
      await this.apiClient.deleteTask(taskId);
      await this.render(this.container, this.currentThread, this.currentProject);
    } catch (error) {
      alert('Task 삭제 실패: ' + error.message);
    }
  }

  showEditThreadModal() {
    const t = this.currentThread;
    const startVal = t.start_date ? t.start_date.split('T')[0] : '';
    const dueVal   = t.due_date   ? t.due_date.split('T')[0]   : '';

    Helpers.showModal(`
      <h3 class="text-lg font-bold text-gray-900 mb-5">Thread 수정</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">제목 <span class="text-red-500">*</span></label>
          <input type="text" id="m-edit-thread-title" value="${Helpers.escapeHtml(t.title)}" maxlength="60"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">시작일</label>
            <input type="date" id="m-edit-thread-start" value="${startVal}"
              class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">마감일 <span class="text-red-500">*</span></label>
            <input type="date" id="m-edit-thread-due" value="${dueVal}"
              class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">목표 / 성과 기준</label>
          <input type="text" id="m-edit-thread-goal" value="${Helpers.escapeHtml(t.outcome_goal || '')}" maxlength="100"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button id="m-cancel" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">취소</button>
        <button id="m-submit" class="flex-1 py-2.5 rounded-xl btn-primary text-white font-semibold text-sm">저장</button>
      </div>
    `);

    document.getElementById('m-cancel').onclick = () => Helpers.closeModal();
    document.getElementById('m-submit').onclick = async () => {
      const title = document.getElementById('m-edit-thread-title').value.trim();
      const startDate = document.getElementById('m-edit-thread-start').value;
      const dueDate   = document.getElementById('m-edit-thread-due').value;
      const outcomeGoal = document.getElementById('m-edit-thread-goal').value.trim();

      if (!title)   { alert('제목을 입력해주세요.'); return; }
      if (!dueDate) { alert('마감일을 선택해주세요.'); return; }

      Helpers.closeModal();
      try {
        const updated = await this.apiClient.updateThread(this.currentThread.id, {
          title,
          start_date: startDate || null,
          due_date: dueDate,
          outcome_goal: outcomeGoal || null
        });
        this.currentThread = { ...this.currentThread, ...updated };
        await this.render(this.container, this.currentThread, this.currentProject);
      } catch (error) {
        alert('Thread 수정 실패: ' + error.message);
      }
    };
  }

  showChangeStatusModal() {
    const statusOptions = [
      { value: 'active',    label: '진행중',  desc: '현재 진행 중인 Thread' },
      { value: 'on_hold',   label: '보류',    desc: '일시 중단 상태' },
      { value: 'completed', label: '완료',    desc: '모든 작업이 끝난 상태' }
    ];

    Helpers.showModal(`
      <h3 class="text-lg font-bold text-gray-900 mb-5">Thread 상태 변경</h3>
      <div class="space-y-3">
        ${statusOptions.map(s => `
          <label class="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-xl hover:border-blue-300 transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 ${s.value === this.currentThread.status ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}">
            <input type="radio" name="m-thread-status" value="${s.value}" ${s.value === this.currentThread.status ? 'checked' : ''} class="accent-blue-600">
            <div>
              <div class="font-semibold text-gray-900">${s.label}</div>
              <div class="text-xs text-gray-500">${s.desc}</div>
            </div>
          </label>
        `).join('')}
      </div>
      <div class="flex gap-3 mt-6">
        <button id="m-cancel" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">취소</button>
        <button id="m-submit" class="flex-1 py-2.5 rounded-xl btn-primary text-white font-semibold text-sm">변경</button>
      </div>
    `);

    document.getElementById('m-cancel').onclick = () => Helpers.closeModal();
    document.getElementById('m-submit').onclick = async () => {
      const newStatus = document.querySelector('input[name="m-thread-status"]:checked')?.value;
      if (!newStatus || newStatus === this.currentThread.status) {
        Helpers.closeModal();
        return;
      }
      Helpers.closeModal();
      try {
        const updated = await this.apiClient.updateThread(this.currentThread.id, { status: newStatus });
        this.currentThread = { ...this.currentThread, status: updated.status };
        await this.render(this.container, this.currentThread, this.currentProject);
      } catch (error) {
        alert('상태 변경 실패: ' + error.message);
      }
    };
  }

  async deleteThread() {
    if (!confirm(`"${this.currentThread.title}" Thread를 삭제하시겠습니까?\n\n관련 Task와 할당 기록도 함께 삭제됩니다.`)) return;
    try {
      await this.apiClient.deleteThread(this.currentThread.id);
      window.app.currentThread = null;
      window.location.hash = '/timeline';
    } catch (error) {
      alert('Thread 삭제 실패: ' + error.message);
    }
  }

}
