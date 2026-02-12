/**
 * People View
 * 팀원별 Thread 현황 + D-day 시각화
 */

class PeopleView {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.container = null;
    this.members = [];
    this.threads = [];
    this.tasks = [];
    this.assignments = {};
  }

  /**
   * People 뷰 렌더링
   */
  async render(container) {
    this.container = container;

    try {
      // 데이터 로드
      await this.loadData();

      // UI 렌더링
      this.renderUI();

      // 이벤트 리스너 등록
      this.attachEventListeners();
    } catch (error) {
      console.error('Failed to load people view:', error);
      container.innerHTML = `
        <div class="card-modern p-6 text-center">
          <p class="text-red-600 font-semibold">팀원 정보를 불러올 수 없습니다.</p>
          <p class="text-sm text-gray-600 mt-2">${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * 데이터 로드
   */
  async loadData() {
    // 팀원 로드
    this.members = await this.apiClient.getAllMembers();

    // Thread 로드
    this.threads = await this.apiClient.getAllThreads();

    // Task 로드
    this.tasks = await this.apiClient.getAllTasks();

    // 각 Thread의 현재 assignment 로드
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
    const stats = this.calculateStats();

    this.container.innerHTML = `
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 class="text-xl md:text-2xl font-bold text-gray-900">팀원별 현황</h2>
        <button id="btn-add-member" class="btn-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap">
          + 팀원 추가
        </button>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="card-modern p-5 text-center">
          <div class="text-3xl font-black text-gray-900">${stats.totalMembers}</div>
          <div class="text-sm text-gray-600 font-medium mt-1">전체 인원</div>
        </div>
        <div class="card-modern p-5 text-center">
          <div class="text-3xl font-black text-blue-600">${stats.activeThreads}</div>
          <div class="text-sm text-gray-600 font-medium mt-1">진행중 Thread</div>
        </div>
        <div class="card-modern p-5 text-center">
          <div class="text-3xl font-black text-yellow-600">${stats.thisWeekDeadlines}</div>
          <div class="text-sm text-gray-600 font-medium mt-1">이번주 마감</div>
        </div>
        <div class="card-modern p-5 text-center">
          <div class="text-3xl font-black text-red-600">${stats.urgentThreads}</div>
          <div class="text-sm text-gray-600 font-medium mt-1">지연 위험</div>
        </div>
      </div>

      <!-- Member Cards -->
      <div class="space-y-4" id="member-cards">
        ${this.renderMemberCards()}
      </div>
    `;
  }

  /**
   * 통계 계산
   */
  calculateStats() {
    const activeThreads = this.threads.filter(t => t.status === 'active').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekLater = new Date(today);
    oneWeekLater.setDate(today.getDate() + 7);

    let thisWeekDeadlines = 0;
    let urgentThreads = 0;

    this.threads.forEach(thread => {
      if (thread.status !== 'active') return;

      const dueDate = new Date(thread.due_date);
      dueDate.setHours(0, 0, 0, 0);

      // 이번주 마감
      if (dueDate >= today && dueDate <= oneWeekLater) {
        thisWeekDeadlines++;
      }

      // 지연 위험 (D-1 이하)
      const dDay = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      if (dDay <= 1) {
        urgentThreads++;
      }
    });

    return {
      totalMembers: this.members.length,
      activeThreads,
      thisWeekDeadlines,
      urgentThreads
    };
  }

  /**
   * 멤버 카드 렌더링
   */
  renderMemberCards() {
    return this.members.map(member => {
      const memberInfo = this.getMemberInfo(member);
      return this.renderMemberCard(member, memberInfo);
    }).join('');
  }

  /**
   * 멤버 정보 수집
   */
  getMemberInfo(member) {
    // 멤버가 담당한 Thread 찾기
    const memberThreads = this.threads.filter(thread => {
      const threadAssignments = this.assignments[thread.id] || [];
      return threadAssignments.some(a => a.member_id === member.id);
    });

    // 활성 Thread만
    const activeThreads = memberThreads.filter(t => t.status === 'active');

    // Thread별 정보 (D-day, role)
    const threadInfos = activeThreads.map(thread => {
      const dDay = this.calculateDDay(thread.due_date);
      const assignment = (this.assignments[thread.id] || []).find(a => a.member_id === member.id);
      const role = assignment?.role || 'support';

      return { thread, dDay, role };
    }).sort((a, b) => a.dDay - b.dDay);

    // Task 개수
    const threadIds = activeThreads.map(t => t.id);
    const memberTasks = this.tasks.filter(t =>
      threadIds.includes(t.thread_id) && t.assigned_to === member.id
    );

    // 가장 긴급한 Thread
    const urgentThread = threadInfos.length > 0 ? threadInfos[0] : null;

    // 상태 결정
    let status = 'normal'; // normal, warning, urgent
    if (urgentThread) {
      if (urgentThread.dDay <= 1) {
        status = 'urgent';
      } else if (urgentThread.dDay <= 3) {
        status = 'warning';
      }
    }

    return {
      threadCount: activeThreads.length,
      taskCount: memberTasks.length,
      threadInfos,
      urgentThread,
      status
    };
  }

  /**
   * 멤버 카드 렌더링
   */
  renderMemberCard(member, info) {
    const colorClass = this.getMemberColorClass(member.role);
    const dotClass = this.getMemberDotClass(member.role);

    return `
      <div class="card-modern p-5 md:p-6">
        <!-- Member Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${colorClass}">
              ${member.name.charAt(0)}
            </div>
            <div>
              <div class="font-bold text-gray-900 text-lg">${this.escapeHtml(member.name)}</div>
              <div class="text-sm text-gray-600 font-medium">${this.getRoleLabel(member.role)}</div>
            </div>
          </div>
          <div class="flex gap-6 text-sm">
            <div class="text-center">
              <div class="font-black text-2xl text-blue-600">${info.threadCount}</div>
              <div class="text-gray-600 font-medium">Thread</div>
            </div>
            <div class="text-center">
              <div class="font-black text-2xl text-gray-700">${info.taskCount}</div>
              <div class="text-gray-600 font-medium">Task</div>
            </div>
          </div>
        </div>

        <!-- Thread List -->
        ${info.threadInfos.length > 0 ? `
          <div class="space-y-3 mb-4">
            ${info.threadInfos.map(ti => this.renderThreadInfo(ti, dotClass)).join('')}
          </div>
        ` : `
          <div class="text-sm text-gray-500 text-center py-4 mb-4">담당 Thread가 없습니다.</div>
        `}

        <!-- Status Message -->
        ${this.renderStatusMessage(info)}
      </div>
    `;
  }

  /**
   * Thread 정보 카드
   */
  renderThreadInfo(threadInfo, dotClass) {
    const { thread, dDay, role } = threadInfo;

    let borderClass = 'border-gray-200';
    let bgClass = 'bg-gray-50';

    if (dDay <= 1) {
      borderClass = 'border-red-300';
      bgClass = 'bg-red-50';
    } else if (dDay <= 3) {
      borderClass = 'border-orange-300';
      bgClass = 'bg-orange-50';
    }

    return `
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 ${bgClass} rounded-xl border-2 ${borderClass}">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="w-3 h-3 rounded-full ${dotClass} shadow-sm"></span>
          <span class="font-semibold text-gray-900">${this.escapeHtml(thread.title)}</span>
          <span class="badge ${role === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}">${role}</span>
        </div>
        ${this.renderDDayBadge(dDay)}
      </div>
    `;
  }

  /**
   * 상태 메시지
   */
  renderStatusMessage(info) {
    if (info.status === 'urgent') {
      return `
        <div class="text-sm font-semibold text-red-700 bg-gradient-to-r from-red-50 to-red-100 p-3 rounded-xl border border-red-200">
          🔥 ${this.escapeHtml(info.urgentThread.thread.title)} D-${info.urgentThread.dDay} 긴급 - 오늘 중 완료 필요
        </div>
      `;
    } else if (info.status === 'warning') {
      return `
        <div class="text-sm font-semibold text-orange-700 bg-gradient-to-r from-orange-50 to-orange-100 p-3 rounded-xl border border-orange-200">
          ⚠️ ${this.escapeHtml(info.urgentThread.thread.title)} D-${info.urgentThread.dDay} 촉박 - 리밸런싱 검토 필요
        </div>
      `;
    } else if (info.threadCount === 0) {
      return `
        <div class="text-sm font-semibold text-green-700 bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-xl border border-green-200">
          ✅ 여유 있음 - 추가 업무 배정 가능
        </div>
      `;
    } else {
      return `
        <div class="text-sm font-semibold text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-xl border border-blue-200">
          ✓ 정상 진행 중
        </div>
      `;
    }
  }

  /**
   * D-day 뱃지
   */
  renderDDayBadge(dDay) {
    let badgeClass = 'bg-gray-100 text-gray-700';
    let text = `D-${dDay}`;
    let icon = '';

    if (dDay < 0) {
      badgeClass = 'bg-red-100 text-red-700';
      text = `D+${Math.abs(dDay)}`;
      icon = ' 🔥';
    } else if (dDay <= 1) {
      badgeClass = 'bg-red-100 text-red-700';
      icon = ' 🔥';
    } else if (dDay <= 3) {
      badgeClass = 'bg-orange-100 text-orange-800';
      icon = ' ⚠️';
    } else if (dDay <= 7) {
      badgeClass = 'bg-yellow-100 text-yellow-800';
    }

    return `<span class="badge ${badgeClass}">${text}${icon}</span>`;
  }

  /**
   * 이벤트 리스너 등록
   */
  attachEventListeners() {
    // 팀원 추가
    const btnAddMember = document.getElementById('btn-add-member');
    if (btnAddMember) {
      btnAddMember.addEventListener('click', () => this.showAddMemberModal());
    }
  }

  /**
   * 팀원 추가 모달
   */
  async showAddMemberModal() {
    const name = prompt('팀원 이름:');
    if (!name) return;

    const roleOptions = 'pm, intern, member';
    const role = prompt(`역할 (${roleOptions}):`);
    if (!role) return;

    if (!['pm', 'intern', 'member'].includes(role)) {
      alert('올바른 역할을 입력하세요 (pm, intern, member)');
      return;
    }

    try {
      await this.apiClient.createMember({
        id: `member-${Date.now()}`,
        name,
        role
      });

      await this.render(this.container);
      alert('팀원이 추가되었습니다.');
    } catch (error) {
      alert('팀원 추가 실패: ' + error.message);
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
   * 역할 라벨
   */
  getRoleLabel(role) {
    const roleMap = {
      'pm': 'PM',
      'intern': '인턴',
      'member': '팀원'
    };
    return roleMap[role] || role;
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
