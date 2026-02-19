/**
 * Timeline View
 * Thread 타임라인 뷰
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
      // 데이터 로드
      await this.loadData();

      // UI 렌더링
      this.renderUI();

      // 이벤트 리스너 등록
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
    // 모든 프로젝트 로드
    this.projects = await this.apiClient.getAllProjects();

    // Thread 로드 (프로젝트 선택 시 필터링)
    const allThreads = await this.apiClient.getAllThreads();
    this.threads = this.currentProject
      ? allThreads.filter(t => t.project_id === this.currentProject.id)
      : allThreads; // 전체 프로젝트 Thread 표시

    // 팀원 로드
    this.members = await this.apiClient.getAllMembers();

    // 모든 Thread의 현재 assignment 로드
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
    const titleText = this.currentProject
      ? Helpers.escapeHtml(this.currentProject.name)
      : '전체 프로젝트';

    this.container.innerHTML = `
      <!-- Header -->
      <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div>
            <h2 class="text-xl md:text-2xl font-bold text-gray-900">Thread Timeline</h2>
            <p class="text-sm text-gray-500 font-medium mt-0.5">${titleText}</p>
          </div>
          <div class="flex items-center gap-1 card-modern p-1 shadow-sm">
            <button id="btn-prev-week" class="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors">← 이전</button>
            <button id="btn-today" class="px-3 py-1.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md shadow-sm">오늘</button>
            <button id="btn-next-week" class="px-3 py-1.5 text-sm font-medium hover:bg-gray-100 rounded-md transition-colors">다음 →</button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 w-full lg:w-auto">
          <button id="btn-export-excel" class="btn-success text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 flex-1 sm:flex-none justify-center">
            📥 Excel 내보내기
          </button>
          <button id="btn-new-thread" class="btn-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex-1 sm:flex-none">
            + 새 Thread
          </button>
        </div>
      </div>

      <!-- Timeline Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        <!-- Timeline (3/4) -->
        <div class="lg:col-span-3 card-modern p-4 md:p-6 overflow-x-auto">
          <div class="min-w-[600px]">
            <!-- Week Headers -->
            <div class="grid grid-cols-5 gap-2 mb-3">
              <div class="text-sm font-semibold text-gray-700">Thread</div>
              ${weeks.map(week => `
                <div class="text-center">
                  <div class="text-sm font-bold text-gray-900">${week.label}</div>
                  <div class="text-xs text-gray-500">${week.dateRange}</div>
                </div>
              `).join('')}
            </div>

            <!-- Timeline with Today Line -->
            <div class="relative">
              ${todayPosition !== null ? `
                <div class="today-line" style="left: calc(20% + (80% * ${todayPosition}));">
                  <div class="today-label">TODAY</div>
                </div>
              ` : ''}

              <!-- Thread Bars -->
              <div class="space-y-4 pt-4" id="thread-bars">
                ${this.renderThreadBars(timelineStart, timelineEnd)}
              </div>
            </div>

            <!-- Legend -->
            <div class="flex flex-wrap gap-4 md:gap-6 mt-6 pt-4 border-t border-gray-200 text-xs font-medium">
              <span class="font-bold text-gray-900">담당자:</span>
              ${this.members.map(member => `
                <span class="flex items-center gap-1.5">
                  <span class="w-3 h-3 rounded-full ${Helpers.getMemberDotClass(member.role)} shadow-sm"></span>
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
          <h3 class="font-bold text-gray-900 mb-4 flex items-center gap-2">👥 팀 현황</h3>
          <div class="space-y-4" id="team-status">
            ${this.renderTeamStatus()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Thread 바 렌더링
   */
  renderThreadBars(timelineStart, timelineEnd) {
    if (this.threads.length === 0) {
      return '<div class="text-center py-8 text-gray-500">Thread가 없습니다.</div>';
    }

    return this.threads.map(thread => {
      const threadAssignments = this.assignments[thread.id] || [];
      const project = this.projects.find(p => p.id === thread.project_id);
      const bar = new ThreadBar(thread, threadAssignments, this.members, timelineStart, timelineEnd, project);
      return bar.render();
    }).join('');
  }

  /**
   * 팀 현황 렌더링
   */
  renderTeamStatus() {
    return this.members.map(member => {
      // 멤버가 담당한 Thread 찾기
      const memberThreads = this.threads.filter(thread => {
        const threadAssignments = this.assignments[thread.id] || [];
        return threadAssignments.some(a => a.member_id === member.id);
      });

      if (memberThreads.length === 0) {
        return '';
      }

      // D-day 계산
      const threadWithDays = memberThreads.map(thread => {
        const dDay = Helpers.calculateDDay(thread.due_date);
        const assignment = (this.assignments[thread.id] || []).find(a => a.member_id === member.id);
        return { thread, dDay, role: assignment?.role || 'support' };
      }).sort((a, b) => a.dDay - b.dDay);

      const urgentThread = threadWithDays[0];

      return `
        <div class="border-b border-gray-100 pb-3">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-4 h-4 rounded-full ${Helpers.getMemberDotClass(member.role)} shadow-sm"></span>
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
    // 이전 주
    const btnPrev = document.getElementById('btn-prev-week');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => this.navigateWeek(-1));
    }

    // 다음 주
    const btnNext = document.getElementById('btn-next-week');
    if (btnNext) {
      btnNext.addEventListener('click', () => this.navigateWeek(1));
    }

    // 오늘
    const btnToday = document.getElementById('btn-today');
    if (btnToday) {
      btnToday.addEventListener('click', () => this.goToday());
    }

    // 새 Thread
    const btnNewThread = document.getElementById('btn-new-thread');
    if (btnNewThread) {
      btnNewThread.addEventListener('click', () => this.showNewThreadModal());
    }

    // Excel 내보내기
    const btnExport = document.getElementById('btn-export-excel');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportToExcel());
    }

    // Thread 바 클릭 → Detail 뷰
    document.querySelectorAll('.thread-bar-container').forEach(el => {
      el.addEventListener('click', () => {
        const threadId = el.dataset.threadId;
        const thread = this.threads.find(t => t.id === threadId);
        if (thread) {
          // Thread의 프로젝트를 함께 전달
          const project = this.projects ? this.projects.find(p => p.id === thread.project_id) : null;
          window.app.currentProject = project;
          window.app.showThreadDetail(thread);
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
      // null project 시 더미 프로젝트 객체 사용
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

  /**
   * 새 Thread 모달
   */
  showNewThreadModal() {
    const today = new Date().toISOString().split('T')[0];

    const projectSelectHtml = !this.currentProject ? `
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1">프로젝트 <span class="text-red-500">*</span></label>
        <select id="m-thread-project" class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
          <option value="">프로젝트 선택</option>
          ${(this.projects || []).map(p => `<option value="${p.id}">${Helpers.escapeHtml(p.name)}</option>`).join('')}
        </select>
      </div>
    ` : '';

    Helpers.showModal(`
      <h3 class="text-lg font-bold text-gray-900 mb-5">새 Thread 생성</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">제목 <span class="text-red-500">*</span></label>
          <input type="text" id="m-thread-title" placeholder="Thread 제목" maxlength="60"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        ${projectSelectHtml}
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">유형 <span class="text-red-500">*</span></label>
          <div class="flex flex-wrap gap-2">
            <label class="flex items-center gap-2 cursor-pointer px-3 py-2 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input type="radio" name="m-thread-type" value="negotiation" checked class="accent-blue-600">
              <span class="text-sm font-semibold">협상</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer px-3 py-2 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input type="radio" name="m-thread-type" value="execution" class="accent-blue-600">
              <span class="text-sm font-semibold">실행</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer px-3 py-2 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input type="radio" name="m-thread-type" value="development" class="accent-blue-600">
              <span class="text-sm font-semibold">개발</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer px-3 py-2 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input type="radio" name="m-thread-type" value="research" class="accent-blue-600">
              <span class="text-sm font-semibold">리서치</span>
            </label>
          </div>
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
        <div>
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

    document.getElementById('m-cancel').onclick = () => Helpers.closeModal();
    document.getElementById('m-submit').onclick = async () => {
      const title = document.getElementById('m-thread-title').value.trim();
      const projectId = this.currentProject
        ? this.currentProject.id
        : document.getElementById('m-thread-project')?.value;
      const threadType = document.querySelector('input[name="m-thread-type"]:checked')?.value || 'execution';
      const startDate = document.getElementById('m-thread-start').value;
      const dueDate = document.getElementById('m-thread-due').value;
      const outcomeGoal = document.getElementById('m-thread-goal').value.trim();

      if (!title) { alert('제목을 입력해주세요.'); return; }
      if (!projectId) { alert('프로젝트를 선택해주세요.'); return; }
      if (!dueDate) { alert('마감일을 선택해주세요.'); return; }

      Helpers.closeModal();
      try {
        await this.apiClient.createThread({
          title,
          project_id: projectId,
          thread_type: threadType,
          start_date: startDate || null,
          due_date: dueDate,
          outcome_goal: outcomeGoal || null,
          status: 'active'
        });
        await this.render(this.container, this.currentProject);
      } catch (error) {
        alert('Thread 생성 실패: ' + error.message);
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
      return null; // 타임라인 범위 밖
    }

    const totalDays = (timelineEnd - timelineStart) / (1000 * 60 * 60 * 24);
    const todayOffset = (today - timelineStart) / (1000 * 60 * 60 * 24);

    return todayOffset / totalDays;
  }

}
