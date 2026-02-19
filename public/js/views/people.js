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
          <p class="text-sm text-gray-600 mt-2">${Helpers.escapeHtml(error.message)}</p>
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
      const dDay = Helpers.calculateDDay(thread.due_date);
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
    const colorClass = Helpers.getMemberColorClass(member.role);
    const dotClass = Helpers.getMemberDotClass(member.role);

    return `
      <div class="card-modern p-5 md:p-6">
        <!-- Member Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md ${colorClass}">
              ${member.name.charAt(0)}
            </div>
            <div>
              <div class="font-bold text-gray-900 text-lg">${Helpers.escapeHtml(member.name)}</div>
              <div class="text-sm text-gray-600 font-medium">${Helpers.translateRole(member.role)}</div>
            </div>
          </div>
          <div class="flex items-center gap-4">
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
            <button class="btn-delete-member p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition" data-member-id="${member.id}" title="팀원 삭제">
              <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
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
          <span class="font-semibold text-gray-900">${Helpers.escapeHtml(thread.title)}</span>
          <span class="badge ${role === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}">${role}</span>
        </div>
        ${Helpers.renderDDayBadge(dDay)}
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
          🔥 ${Helpers.escapeHtml(info.urgentThread.thread.title)} D-${info.urgentThread.dDay} 긴급 - 오늘 중 완료 필요
        </div>
      `;
    } else if (info.status === 'warning') {
      return `
        <div class="text-sm font-semibold text-orange-700 bg-gradient-to-r from-orange-50 to-orange-100 p-3 rounded-xl border border-orange-200">
          ⚠️ ${Helpers.escapeHtml(info.urgentThread.thread.title)} D-${info.urgentThread.dDay} 촉박 - 리밸런싱 검토 필요
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
   * 이벤트 리스너 등록
   */
  attachEventListeners() {
    // 팀원 추가
    const btnAddMember = document.getElementById('btn-add-member');
    if (btnAddMember) {
      btnAddMember.addEventListener('click', () => this.showAddMemberModal());
    }

    // 팀원 삭제
    document.querySelectorAll('.btn-delete-member').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteMember(btn.dataset.memberId);
      });
    });
  }

  /**
   * 팀원 추가 모달
   */
  showAddMemberModal() {
    const colorOptions = [
      { value: '#374151', label: '회색 (Gray)' },
      { value: '#3B82F6', label: '파랑 (Blue)' },
      { value: '#8B5CF6', label: '보라 (Purple)' },
      { value: '#10B981', label: '초록 (Green)' },
      { value: '#F59E0B', label: '노랑 (Amber)' },
      { value: '#EF4444', label: '빨강 (Red)' }
    ].map(c => `<option value="${c.value}">${c.label}</option>`).join('');

    Helpers.showModal(`
      <h3 class="text-lg font-bold text-gray-900 mb-5">팀원 추가</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">이름 <span class="text-red-500">*</span></label>
          <input type="text" id="m-member-name" placeholder="이름 입력" maxlength="20"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">역할 <span class="text-red-500">*</span></label>
          <div class="flex flex-wrap gap-3">
            <label class="flex items-center gap-2 cursor-pointer px-4 py-2 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input type="radio" name="m-member-role" value="pm" class="accent-blue-600">
              <span class="text-sm font-semibold">PM</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer px-4 py-2 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input type="radio" name="m-member-role" value="member" checked class="accent-blue-600">
              <span class="text-sm font-semibold">팀원</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer px-4 py-2 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
              <input type="radio" name="m-member-role" value="intern" class="accent-blue-600">
              <span class="text-sm font-semibold">인턴</span>
            </label>
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">색상</label>
          <select id="m-member-color" class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
            ${colorOptions}
          </select>
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button id="m-cancel" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">취소</button>
        <button id="m-submit" class="flex-1 py-2.5 rounded-xl btn-primary text-white font-semibold text-sm">추가</button>
      </div>
    `);

    document.getElementById('m-cancel').onclick = () => Helpers.closeModal();
    document.getElementById('m-submit').onclick = async () => {
      const name = document.getElementById('m-member-name').value.trim();
      const role = document.querySelector('input[name="m-member-role"]:checked')?.value || 'member';
      const color = document.getElementById('m-member-color').value;

      if (!name) { alert('이름을 입력해주세요.'); return; }

      Helpers.closeModal();
      try {
        await this.apiClient.createMember({ name, role, color, is_active: true });
        await this.render(this.container);
      } catch (error) {
        alert('팀원 추가 실패: ' + error.message);
      }
    };
  }

  /**
   * 팀원 삭제
   */
  async deleteMember(memberId) {
    const member = this.members.find(m => m.id === memberId);
    if (!member) return;
    if (!confirm(`"${member.name}" 팀원을 삭제하시겠습니까?\n\n담당 Thread가 있는 경우 할당이 해제됩니다.`)) return;
    try {
      await this.apiClient.deleteMember(memberId);
      await this.render(this.container);
    } catch (error) {
      alert('팀원 삭제 실패: ' + error.message);
    }
  }

}
