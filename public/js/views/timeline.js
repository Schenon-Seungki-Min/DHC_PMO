/**
 * Timeline View
 * 전체 프로젝트 타임라인 뷰 (프로젝트별 그룹 헤더)
 */

class TimelineView {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.container = null;
    this.currentProject = null;
    this.currentWeekStart = null;
    this.threads = [];
    this.members = [];
    this.assignments = [];
    this.statusFilter = 'all';
  }

  /**
   * 타임라인 렌더링
   */
  async render(container, project) {
    this.container = container;
    this.currentProject = project;

    // 현재 주 시작일 계산 (월요일 기준)
    if (!this.currentWeekStart) {
      this.currentWeekStart = this.getMonday(new Date());
    }

    try {
      await this.loadData();
      this.renderUI();
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to load timeline:', error);
      container.innerHTML = `
        <div class="card-modern p-6 text-center">
          <p class="text-red-600 font-semibold">타임라인을 불러올 수 없습니다.</p>
          <p class="text-sm text-gray-600 mt-2">${Helpers.escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  /**
   * 데이터 로드
   */
  async loadData() {
    this.projects = await this.apiClient.getAllProjects();

    const allThreads = await this.apiClient.getAllThreads();
    this.threads = this.currentProject
      ? allThreads.filter(t => t.project_id === this.currentProject.id)
      : allThreads;

    this.members = await this.apiClient.getAllMembers();
    await Helpers.autoAssignColors(this.members, this.apiClient);

    this.assignments = {};
    for (const thread of this.threads) {
      const threadAssignments = await this.apiClient.getCurrentAssignments(thread.id);
      this.assignments[thread.id] = threadAssignments;
    }
  }

  /**
   * UI 렌더링
   */
  renderUI() {
    const weeks = this.calculateWeeks();
    const timelineStart = new Date(weeks[0].start);
    const timelineEnd = new Date(weeks[weeks.length - 1].end);
    timelineEnd.setHours(23, 59, 59, 999);

    const todayPosition = this.calculateTodayPosition(timelineStart, timelineEnd);
    const dayGridLines = this.renderDayGridLines(timelineStart, timelineEnd);

    this.container.innerHTML = `
      <!-- Header -->
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div>
            <h2 class="text-xl md:text-2xl font-bold text-gray-900">Thread Timeline</h2>
            <p class="text-sm text-gray-500 font-medium mt-0.5">전체 프로젝트</p>
          </div>
          <div class="flex items-center gap-1 card-modern p-1 shadow-sm">
            <button id="btn-prev-week" class="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors">\u2190 이전</button>
            <button id="btn-today" class="px-3 py-1.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md shadow-sm">오늘</button>
            <button id="btn-next-week" class="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors">다음 \u2192</button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 w-full lg:w-auto">
          <button id="btn-new-project" class="px-4 py-2.5 rounded-lg text-sm font-semibold border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-700 transition flex-1 sm:flex-none">
            + 프로젝트
          </button>
          <button id="btn-export-excel" class="btn-success text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 flex-1 sm:flex-none justify-center">
            Excel 내보내기
          </button>
          <button id="btn-new-thread" class="btn-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex-1 sm:flex-none">
            + 새 Thread
          </button>
        </div>
      </div>

      <!-- Status Filter -->
      <div class="flex flex-wrap gap-2 mb-4">
        <span class="text-sm font-semibold text-gray-600 self-center mr-1">상태:</span>
        ${[
          { value: 'all',       label: '전체' },
          { value: 'active',    label: '진행중' },
          { value: 'on_hold',   label: '보류' },
          { value: 'completed', label: '완료' }
        ].map(f => `
          <button class="filter-status-btn px-3 py-1.5 text-sm font-semibold rounded-lg border-2 transition-colors
            ${this.statusFilter === f.value
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'}"
            data-status="${f.value}">${f.label}</button>
        `).join('')}
      </div>

      <!-- Timeline Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        <!-- Timeline (3/4) -->
        <div class="lg:col-span-3 card-modern p-4 md:p-6 overflow-x-auto">
          <div class="min-w-[600px]">
            <!-- Week Headers -->
            <div class="grid grid-cols-5 gap-1 mb-2">
              <div class="text-xs font-semibold text-gray-700">Thread</div>
              ${weeks.map(week => `
                <div class="text-center">
                  <div class="text-xs font-bold text-gray-900">${week.label}</div>
                  <div class="text-[10px] text-gray-500">${week.dateRange}</div>
                </div>
              `).join('')}
            </div>

            <!-- Timeline with Today Line & Day Grid -->
            <div class="relative">
              <!-- Day grid lines -->
              ${dayGridLines}

              ${todayPosition !== null ? `
                <div class="today-line" style="left: calc(20% + (80% * ${todayPosition}));">
                  <div class="today-label">TODAY</div>
                </div>
              ` : ''}

              <!-- Thread Bars (grouped by project) -->
              <div class="space-y-1 pt-2" id="thread-bars">
                ${this.renderGroupedThreadBars(timelineStart, timelineEnd)}
              </div>
            </div>

            <!-- Legend -->
            <div class="flex flex-wrap gap-3 md:gap-4 mt-4 pt-3 border-t border-gray-200 text-[10px] font-medium">
              <span class="font-bold text-gray-900">담당자:</span>
              ${this.members.map(member => `
                <span class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full shadow-sm" style="${Helpers.getMemberDotStyle(member.color)}"></span>
                  ${Helpers.escapeHtml(member.name)}
                </span>
              `).join('')}
              <span class="ml-auto flex items-center gap-1.5">
                <span class="w-1 h-5 bg-gradient-to-b from-red-500 to-red-600 shadow-sm"></span>
                오늘
              </span>
            </div>
          </div>
        </div>

        <!-- Team Status (1/4) -->
        <div class="card-modern p-5">
          <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2">팀 현황</h3>
          <div class="space-y-4" id="team-status">
            ${this.renderTeamStatus()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 일(day) 그리드 라인 렌더링 - 연한 점선
   */
  renderDayGridLines(timelineStart, timelineEnd) {
    const totalDays = (timelineEnd - timelineStart) / (1000 * 60 * 60 * 24);
    let lines = '';

    for (let i = 1; i < totalDays; i++) {
      const position = i / totalDays;
      const currentDate = new Date(timelineStart);
      currentDate.setDate(currentDate.getDate() + i);
      const dayOfWeek = currentDate.getDay(); // 0=Sun, 1=Mon

      // 주 경계(월요일)는 더 진하게
      const isWeekBoundary = dayOfWeek === 1;
      const lineClass = isWeekBoundary ? 'day-grid-line week-grid-line' : 'day-grid-line';

      lines += `<div class="${lineClass}" style="left: calc(20% + (80% * ${position}));"></div>`;
    }

    return lines;
  }

  /**
   * 프로젝트별 그룹 헤더로 Thread 바 렌더링
   */
  renderGroupedThreadBars(timelineStart, timelineEnd) {
    const filtered = this.statusFilter === 'all'
      ? this.threads
      : this.threads.filter(t => t.status === this.statusFilter);

    // 프로젝트별 그룹핑
    const grouped = {};
    filtered.forEach(thread => {
      const pid = thread.project_id;
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(thread);
    });

    // 모든 프로젝트를 포함 (빈 프로젝트도 표시)
    this.projects.forEach(p => {
      if (!grouped[p.id]) grouped[p.id] = [];
    });

    // 프로젝트 순서대로 렌더링
    const projectOrder = this.projects.map(p => p.id);
    const sortedPids = Object.keys(grouped).sort((a, b) =>
      projectOrder.indexOf(a) - projectOrder.indexOf(b)
    );

    if (sortedPids.length === 0) {
      return '<div class="text-center py-6 text-gray-500 text-sm">프로젝트가 없습니다. "+ 프로젝트" 버튼으로 추가하세요.</div>';
    }

    return sortedPids.map(pid => {
      const project = this.projects.find(p => p.id === pid);
      const projectName = project ? project.name : '알 수 없는 프로젝트';
      const threads = grouped[pid];

      const threadBars = threads.length > 0
        ? threads.map(thread => {
            const threadAssignments = this.assignments[thread.id] || [];
            const bar = new ThreadBar(thread, threadAssignments, this.members, timelineStart, timelineEnd);
            return `<div class="drag-thread" draggable="true" data-thread-id="${thread.id}" data-project-id="${pid}">${bar.render()}</div>`;
          }).join('')
        : `<div class="text-xs text-gray-400 italic py-1.5 px-2">Thread 없음</div>`;

      return `
        <div class="mb-2 drag-project" draggable="true" data-project-id="${pid}">
          <div class="flex items-center gap-1.5 mb-1 px-1 group/proj drag-project-handle">
            <div class="drag-grip text-gray-400 hover:text-gray-600 cursor-grab px-0.5 py-1" title="드래그하여 순서 변경">
              <svg class="w-3.5 h-3.5 pointer-events-none" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="3" r="1.5"/><circle cx="11" cy="3" r="1.5"/>
                <circle cx="5" cy="8" r="1.5"/><circle cx="11" cy="8" r="1.5"/>
                <circle cx="5" cy="13" r="1.5"/><circle cx="11" cy="13" r="1.5"/>
              </svg>
            </div>
            <div class="w-1 h-4 rounded-full bg-blue-500"></div>
            <span class="text-xs font-bold text-gray-700">${Helpers.escapeHtml(projectName)}</span>
            <span class="text-[10px] text-gray-400 font-medium">${threads.length}개</span>
            <button class="btn-edit-project text-gray-400 hover:text-blue-600 opacity-0 group-hover/proj:opacity-100 transition-opacity" data-project-id="${pid}" title="프로젝트 수정">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
            </button>
            <button class="btn-delete-project text-gray-400 hover:text-red-600 opacity-0 group-hover/proj:opacity-100 transition-opacity" data-project-id="${pid}" title="프로젝트 삭제">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
          <div class="space-y-1 drag-thread-container" data-project-id="${pid}">
            ${threadBars}
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * 팀 현황 렌더링
   */
  renderTeamStatus() {
    return this.members.map(member => {
      const memberThreads = this.threads.filter(thread => {
        const threadAssignments = this.assignments[thread.id] || [];
        return threadAssignments.some(a => a.member_id === member.id);
      });

      if (memberThreads.length === 0) {
        return '';
      }

      const threadWithDays = memberThreads.map(thread => {
        const dDay = Helpers.calculateDDay(thread.due_date);
        const assignment = (this.assignments[thread.id] || []).find(a => a.member_id === member.id);
        return { thread, dDay, role: assignment?.role || 'support' };
      }).sort((a, b) => a.dDay - b.dDay);

      const urgentThread = threadWithDays[0];

      return `
        <div class="border-b border-gray-100 pb-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-4 h-4 rounded-full shadow-sm" style="${Helpers.getMemberDotStyle(member.color)}"></span>
            <span class="font-bold text-gray-800">${Helpers.escapeHtml(member.name)}</span>
          </div>
          <div class="text-sm text-gray-600 mb-2">Thread ${threadWithDays.length}개</div>
          ${this.renderUrgentThreadBadge(urgentThread)}
        </div>
      `;
    }).filter(html => html).join('');
  }

  /**
   * 긴급 Thread 뱃지
   */
  renderUrgentThreadBadge(threadInfo) {
    if (!threadInfo) return '';

    const { thread, dDay } = threadInfo;
    let badgeClass = 'bg-gray-100 text-gray-700';
    let icon = '';

    if (dDay <= 1) {
      badgeClass = 'bg-red-100 text-red-700';
      icon = ' 🔥';
    } else if (dDay <= 3) {
      badgeClass = 'bg-orange-100 text-orange-800';
      icon = ' ⚠️';
    } else if (dDay <= 7) {
      badgeClass = 'bg-yellow-100 text-yellow-800';
    }

    return `
      <div class="text-xs">
        <span class="badge ${badgeClass}">D-${dDay}: ${Helpers.escapeHtml(thread.title)}${icon}</span>
      </div>
    `;
  }

  /**
   * 이벤트 리스너 등록
   */
  attachEventListeners() {
    const btnPrev = document.getElementById('btn-prev-week');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => this.navigateWeek(-1));
    }

    const btnNext = document.getElementById('btn-next-week');
    if (btnNext) {
      btnNext.addEventListener('click', () => this.navigateWeek(1));
    }

    const btnToday = document.getElementById('btn-today');
    if (btnToday) {
      btnToday.addEventListener('click', () => this.goToday());
    }

    const btnNewThread = document.getElementById('btn-new-thread');
    if (btnNewThread) {
      btnNewThread.addEventListener('click', () => this.showNewThreadModal());
    }

    const btnExport = document.getElementById('btn-export-excel');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportToExcel());
    }

    // 프로젝트 추가
    const btnNewProject = document.getElementById('btn-new-project');
    if (btnNewProject) {
      btnNewProject.addEventListener('click', () => this.showNewProjectModal());
    }

    // 프로젝트 수정
    document.querySelectorAll('.btn-edit-project').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showEditProjectModal(btn.dataset.projectId);
      });
    });

    // 프로젝트 삭제
    document.querySelectorAll('.btn-delete-project').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteProject(btn.dataset.projectId);
      });
    });

    // 상태 필터 버튼
    document.querySelectorAll('.filter-status-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.statusFilter = btn.dataset.status;
        this.renderUI();
        this.attachEventListeners();
      });
    });

    // Thread 바 클릭 → Detail 뷰
    document.querySelectorAll('.thread-bar-container').forEach(el => {
      el.addEventListener('click', () => {
        const threadId = el.dataset.threadId;
        const thread = this.threads.find(t => t.id === threadId);
        if (thread) {
          const project = this.projects ? this.projects.find(p => p.id === thread.project_id) : null;
          window.app.currentProject = project;
          window.app.showThreadDetail(thread);
        }
      });
    });

    // ========== 드래그 & 드롭 ==========
    this._attachDragListeners();
  }

  /**
   * 드래그 & 드롭 이벤트 리스너
   */
  _attachDragListeners() {
    let dragType = null; // 'project' or 'thread'
    let dragId = null;
    let dragProjectId = null;

    // --- 프로젝트 드래그 ---
    document.querySelectorAll('.drag-project').forEach(el => {
      // 프로젝트 헤더(handle)에서만 드래그 시작
      const handle = el.querySelector('.drag-project-handle');
      el.draggable = false; // 기본 비활성

      handle.addEventListener('mousedown', () => { el.draggable = true; });
      handle.addEventListener('mouseup', () => { el.draggable = false; });

      el.addEventListener('dragstart', (e) => {
        // thread 드래그가 버블링으로 올라오는 경우 무시
        if (e.target !== el) return;
        dragType = 'project';
        dragId = el.dataset.projectId;
        el.classList.add('opacity-40');
        e.dataTransfer.effectAllowed = 'move';
      });

      el.addEventListener('dragend', (e) => {
        el.classList.remove('opacity-40');
        el.draggable = false;
        document.querySelectorAll('.drag-over-project').forEach(d => d.classList.remove('drag-over-project'));
        dragType = null;
        dragId = null;
      });

      el.addEventListener('dragover', (e) => {
        if (dragType !== 'project') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // 시각적 드롭 위치 표시
        document.querySelectorAll('.drag-over-project').forEach(d => d.classList.remove('drag-over-project'));
        el.classList.add('drag-over-project');
      });

      el.addEventListener('drop', async (e) => {
        if (dragType !== 'project') return;
        e.preventDefault();
        el.classList.remove('drag-over-project');

        const targetId = el.dataset.projectId;
        if (dragId === targetId) return;

        // 순서 계산
        const container = document.getElementById('thread-bars');
        const projectEls = [...container.querySelectorAll('.drag-project')];
        const ids = projectEls.map(p => p.dataset.projectId);

        const fromIdx = ids.indexOf(dragId);
        const toIdx = ids.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return;

        ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, dragId);

        try {
          await this.apiClient.reorderProjects(ids);
          await this.render(this.container, this.currentProject);
        } catch (error) {
          console.error('Project reorder failed:', error);
        }
      });
    });

    // --- Thread 드래그 (같은 프로젝트 내) ---
    document.querySelectorAll('.drag-thread').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        e.stopPropagation(); // 프로젝트 드래그로 전파 방지
        dragType = 'thread';
        dragId = el.dataset.threadId;
        dragProjectId = el.dataset.projectId;
        el.classList.add('opacity-40');
        e.dataTransfer.effectAllowed = 'move';
      });

      el.addEventListener('dragend', () => {
        el.classList.remove('opacity-40');
        document.querySelectorAll('.drag-over-thread').forEach(d => d.classList.remove('drag-over-thread'));
        dragType = null;
        dragId = null;
        dragProjectId = null;
      });

      el.addEventListener('dragover', (e) => {
        if (dragType !== 'thread') return;
        // 같은 프로젝트 내에서만 허용
        if (el.dataset.projectId !== dragProjectId) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.drag-over-thread').forEach(d => d.classList.remove('drag-over-thread'));
        el.classList.add('drag-over-thread');
      });

      el.addEventListener('drop', async (e) => {
        if (dragType !== 'thread') return;
        if (el.dataset.projectId !== dragProjectId) return;
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove('drag-over-thread');

        const targetId = el.dataset.threadId;
        if (dragId === targetId) return;

        // 같은 프로젝트 내 Thread 순서 계산
        const threadContainer = el.closest('.drag-thread-container');
        const threadEls = [...threadContainer.querySelectorAll('.drag-thread')];
        const ids = threadEls.map(t => t.dataset.threadId);

        const fromIdx = ids.indexOf(dragId);
        const toIdx = ids.indexOf(targetId);
        if (fromIdx === -1 || toIdx === -1) return;

        ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, dragId);

        try {
          await this.apiClient.reorderThreads(ids);
          await this.render(this.container, this.currentProject);
        } catch (error) {
          console.error('Thread reorder failed:', error);
        }
      });
    });
  }

  /**
   * Excel 내보내기
   */
  async exportToExcel() {
    try {
      const allTasks = await this.apiClient.getAllTasks();
      const projectTasks = allTasks.filter(t =>
        this.threads.some(th => th.id === t.thread_id)
      );
      const projectForExport = this.currentProject || { name: '전체프로젝트', id: 'all' };
      excelExporter.exportProject(
        projectForExport,
        this.threads,
        projectTasks,
        this.members,
        this.assignments
      );
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Excel 내보내기에 실패했습니다: ' + error.message);
    }
  }

  /**
   * 주간 네비게이션
   */
  navigateWeek(offset) {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + (offset * 7));
    this.render(this.container, this.currentProject);
  }

  /**
   * 오늘로 이동
   */
  goToday() {
    this.currentWeekStart = this.getMonday(new Date());
    this.render(this.container, this.currentProject);
  }

  // ========== 프로젝트 관리 ==========

  showNewProjectModal() {
    Helpers.showModal(`
      <h3 class="text-lg font-bold text-gray-900 mb-5">프로젝트 추가</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">이름 <span class="text-red-500">*</span></label>
          <input type="text" id="m-proj-name" placeholder="프로젝트 이름" maxlength="40"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">목표</label>
          <input type="text" id="m-proj-objective" placeholder="프로젝트 목표 (선택)" maxlength="100"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button id="m-cancel" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">취소</button>
        <button id="m-submit" class="flex-1 py-2.5 rounded-xl btn-primary text-white font-semibold text-sm">추가</button>
      </div>
    `);
    document.getElementById('m-cancel').onclick = () => Helpers.closeModal();
    document.getElementById('m-submit').onclick = async () => {
      const name = document.getElementById('m-proj-name').value.trim();
      const objective = document.getElementById('m-proj-objective').value.trim();
      if (!name) { alert('이름을 입력해주세요.'); return; }
      Helpers.closeModal();
      try {
        await this.apiClient.createProject({ id: `proj-${Date.now()}`, name, objective: objective || null, status: 'active' });
        await this.render(this.container, this.currentProject);
      } catch (error) {
        alert('프로젝트 추가 실패: ' + error.message);
      }
    };
  }

  showEditProjectModal(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    const statusOptions = ['active', 'on_hold', 'completed'].map(s =>
      `<option value="${s}" ${s === project.status ? 'selected' : ''}>${Helpers.translateStatus(s)}</option>`
    ).join('');

    Helpers.showModal(`
      <h3 class="text-lg font-bold text-gray-900 mb-5">프로젝트 수정</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">이름 <span class="text-red-500">*</span></label>
          <input type="text" id="m-proj-name" value="${Helpers.escapeHtml(project.name)}" maxlength="40"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">목표</label>
          <input type="text" id="m-proj-objective" value="${Helpers.escapeHtml(project.objective || '')}" maxlength="100"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">상태</label>
          <select id="m-proj-status" class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
            ${statusOptions}
          </select>
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button id="m-cancel" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">취소</button>
        <button id="m-submit" class="flex-1 py-2.5 rounded-xl btn-primary text-white font-semibold text-sm">저장</button>
      </div>
    `);
    document.getElementById('m-cancel').onclick = () => Helpers.closeModal();
    document.getElementById('m-submit').onclick = async () => {
      const name = document.getElementById('m-proj-name').value.trim();
      const objective = document.getElementById('m-proj-objective').value.trim();
      const status = document.getElementById('m-proj-status').value;
      if (!name) { alert('이름을 입력해주세요.'); return; }
      Helpers.closeModal();
      try {
        await this.apiClient.updateProject(projectId, { name, objective: objective || null, status });
        await this.render(this.container, this.currentProject);
      } catch (error) {
        alert('프로젝트 수정 실패: ' + error.message);
      }
    };
  }

  async deleteProject(projectId) {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;
    const threadCount = this.threads.filter(t => t.project_id === projectId).length;
    const msg = threadCount > 0
      ? `"${project.name}" 프로젝트를 삭제하시겠습니까?\n\n포함된 Thread ${threadCount}개도 함께 삭제됩니다.`
      : `"${project.name}" 프로젝트를 삭제하시겠습니까?`;
    if (!confirm(msg)) return;
    try {
      await this.apiClient.deleteProject(projectId);
      await this.render(this.container, this.currentProject);
    } catch (error) {
      alert('프로젝트 삭제 실패: ' + error.message);
    }
  }

  /**
   * 새 Thread 모달 (빈 Thread / 템플릿에서 생성 토글)
   */
  async showNewThreadModal() {
    const today = new Date().toISOString().split('T')[0];

    let templates = [];
    try { templates = await this.apiClient.getAllTemplates(); } catch (e) { /* ignore */ }

    const projectOptions = (this.projects || []).map(p =>
      `<option value="${p.id}">${Helpers.escapeHtml(p.name)}</option>`
    ).join('');

    const templateOptions = templates.map(t =>
      `<option value="${t.id}">${Helpers.escapeHtml(t.name)}${t.description ? ' - ' + Helpers.escapeHtml(t.description) : ''}</option>`
    ).join('');

    Helpers.showModal(`
      <h3 class="text-lg font-bold text-gray-900 mb-5">새 Thread 생성</h3>

      <!-- 생성 방식 토글 -->
      <div class="flex gap-2 mb-5">
        <button id="m-mode-blank" class="flex-1 py-2 rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-700 font-semibold text-sm transition">빈 Thread</button>
        <button id="m-mode-template" class="flex-1 py-2 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition">템플릿에서 생성</button>
      </div>

      <div class="space-y-4">
        <!-- 템플릿 선택 (template 모드에서만 표시) -->
        <div id="m-template-section" class="hidden">
          <label class="block text-sm font-semibold text-gray-700 mb-1">템플릿 <span class="text-red-500">*</span></label>
          <select id="m-template-select" class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
            <option value="">템플릿 선택</option>
            ${templateOptions}
          </select>
        </div>

        <!-- 제목 (blank: 전체 제목, template: title_suffix) -->
        <div>
          <label id="m-title-label" class="block text-sm font-semibold text-gray-700 mb-1">제목 <span class="text-red-500">*</span></label>
          <input type="text" id="m-thread-title" placeholder="Thread 제목" maxlength="60"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">프로젝트 <span class="text-red-500">*</span></label>
          <select id="m-thread-project" class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
            <option value="">프로젝트 선택</option>
            ${projectOptions}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">시작일</label>
            <input type="date" id="m-thread-start" value="${today}"
              class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">마감일 <span class="text-red-500">*</span></label>
            <input type="date" id="m-thread-due" value="${today}"
              class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
          </div>
        </div>

        <!-- 목표 (blank 모드에서만 표시) -->
        <div id="m-goal-section">
          <label class="block text-sm font-semibold text-gray-700 mb-1">목표 / 성과 기준</label>
          <input type="text" id="m-thread-goal" placeholder="이 Thread의 목표를 간략히 입력" maxlength="100"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button id="m-cancel" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">취소</button>
        <button id="m-submit" class="flex-1 py-2.5 rounded-xl btn-primary text-white font-semibold text-sm">생성</button>
      </div>
    `);

    let mode = 'blank';

    const setMode = (newMode) => {
      mode = newMode;
      const mBlank = document.getElementById('m-mode-blank');
      const mTpl   = document.getElementById('m-mode-template');
      const tplSec = document.getElementById('m-template-section');
      const goalSec = document.getElementById('m-goal-section');
      const titleLabel = document.getElementById('m-title-label');
      const titleInput = document.getElementById('m-thread-title');

      if (mode === 'blank') {
        mBlank.className = 'flex-1 py-2 rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-700 font-semibold text-sm transition';
        mTpl.className   = 'flex-1 py-2 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition';
        tplSec.classList.add('hidden');
        goalSec.classList.remove('hidden');
        titleLabel.textContent = '제목 ';
        titleInput.placeholder = 'Thread 제목';
      } else {
        mTpl.className   = 'flex-1 py-2 rounded-xl border-2 border-blue-500 bg-blue-50 text-blue-700 font-semibold text-sm transition';
        mBlank.className = 'flex-1 py-2 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition';
        tplSec.classList.remove('hidden');
        goalSec.classList.add('hidden');
        titleLabel.innerHTML = '제목 보충 <span class="text-red-500">*</span>';
        titleInput.placeholder = '예: 3월 / 김팀장';
      }
    };

    document.getElementById('m-mode-blank').onclick = () => setMode('blank');
    document.getElementById('m-mode-template').onclick = () => setMode('template');
    document.getElementById('m-cancel').onclick = () => Helpers.closeModal();

    document.getElementById('m-submit').onclick = async () => {
      const title = document.getElementById('m-thread-title').value.trim();
      const projectId = document.getElementById('m-thread-project')?.value;
      const startDate = document.getElementById('m-thread-start').value;
      const dueDate = document.getElementById('m-thread-due').value;

      if (!title) { alert('제목을 입력해주세요.'); return; }
      if (!projectId) { alert('프로젝트를 선택해주세요.'); return; }
      if (!dueDate) { alert('마감일을 선택해주세요.'); return; }

      if (mode === 'template') {
        const templateId = document.getElementById('m-template-select')?.value;
        if (!templateId) { alert('템플릿을 선택해주세요.'); return; }

        Helpers.closeModal();
        try {
          await this.apiClient.applyTemplate(templateId, {
            project_id: projectId,
            title_suffix: title,
            start_date: startDate || null,
            due_date: dueDate
          });
          await this.render(this.container, this.currentProject);
        } catch (error) {
          alert('템플릿 적용 실패: ' + error.message);
        }
      } else {
        const outcomeGoal = document.getElementById('m-thread-goal').value.trim();
        Helpers.closeModal();
        try {
          await this.apiClient.createThread({
            id: `thread-${Date.now()}`,
            title,
            project_id: projectId,
            thread_type: 'execution',
            start_date: startDate || null,
            due_date: dueDate,
            outcome_goal: outcomeGoal || null,
            status: 'active'
          });
          await this.render(this.container, this.currentProject);
        } catch (error) {
          alert('Thread 생성 실패: ' + error.message);
        }
      }
    };
  }

  /**
   * 현재 주 기준 4주 계산
   */
  calculateWeeks() {
    const weeks = [];
    const startDate = new Date(this.currentWeekStart);

    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + (i * 7));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      weeks.push({
        label: `W${this.getWeekNumber(weekStart)}`,
        dateRange: `${Helpers.formatDate(weekStart)}~${Helpers.formatDate(weekEnd)}`,
        start: weekStart.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0]
      });
    }

    return weeks;
  }

  /**
   * 월요일 구하기
   */
  getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  /**
   * 주차 계산
   */
  getWeekNumber(date) {
    const d = new Date(date);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((d - yearStart) / 86400000 + yearStart.getDay() + 1) / 7);
    return weekNumber;
  }

  /**
   * 오늘 위치 계산 (0~1)
   */
  calculateTodayPosition(timelineStart, timelineEnd) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today < timelineStart || today > timelineEnd) {
      return null;
    }

    const totalDays = (timelineEnd - timelineStart) / (1000 * 60 * 60 * 24);
    const todayOffset = (today - timelineStart) / (1000 * 60 * 60 * 24);

    return todayOffset / totalDays;
  }

}
