/**
 * Thread Bar Component
 * Thread 타임라인 바 렌더링
 */

class ThreadBar {
  constructor(thread, assignments, members, timelineStart, timelineEnd, project = null) {
    this.thread = thread;
    this.assignments = assignments;
    this.members = members;
    this.timelineStart = timelineStart;
    this.timelineEnd = timelineEnd;
    this.project = project;
  }

  render() {
    const { left, width } = this.calculatePosition();
    const dDay = Helpers.calculateDDay(this.thread.due_date);
    const memberStripes = this.renderMemberStripes();
    const assigneeNames = this.getAssigneeNames();
    const status = this.thread.status || 'active';

    // 상태별 시각 스타일
    const statusStyles = {
      completed: {
        containerClass: 'opacity-50',
        titleClass: 'line-through text-gray-400',
        badge: '<span class="ml-1 text-xs font-bold text-green-600">✓</span>',
        barStyle: 'filter: grayscale(40%);'
      },
      on_hold: {
        containerClass: 'opacity-70',
        titleClass: 'text-yellow-700',
        badge: '<span class="ml-1 text-xs font-bold text-yellow-500">⏸</span>',
        barStyle: 'border-style: dashed; border-color: #F59E0B;'
      },
      active: {
        containerClass: '',
        titleClass: 'text-gray-800',
        badge: '',
        barStyle: ''
      }
    };
    const s = statusStyles[status] || statusStyles.active;

    return `
      <div class="grid grid-cols-5 gap-2 items-center cursor-pointer thread-bar-container ${s.containerClass}"
           data-thread-id="${this.thread.id}">
        <div class="pr-2">
          <div class="text-sm font-semibold ${s.titleClass} truncate">
            ${Helpers.escapeHtml(this.thread.title)}${s.badge}
          </div>
          <div class="text-xs text-gray-500 mt-0.5">${Helpers.escapeHtml(assigneeNames)}</div>
        </div>
        <div class="col-span-4 relative h-14">
          <div class="thread-bar absolute" style="left: ${left}; width: ${width}; top: 6px; ${s.barStyle}">
            ${memberStripes}
            <div class="absolute right-2 top-1/2 -translate-y-1/2 z-10">
              ${Helpers.renderDDayBadge(dDay)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  calculatePosition() {
    const startDate = new Date(this.thread.start_date);
    const dueDate = new Date(this.thread.due_date);
    const totalDays = (this.timelineEnd - this.timelineStart) / (1000 * 60 * 60 * 24);
    const startOffset = (startDate - this.timelineStart) / (1000 * 60 * 60 * 24);
    const duration = (dueDate - startDate) / (1000 * 60 * 60 * 24);

    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`
    };
  }

  /**
   * 다중 담당자를 수평 밴드(위/아래)로 렌더링
   * 동시 담당 시 겹치는 형태로 표현
   */
  renderMemberStripes() {
    if (this.assignments.length === 0) {
      return '<div class="remaining-segment"></div>';
    }

    // 고유 멤버 추출 (lead 먼저)
    const uniqueMembers = [];
    const seen = new Set();
    const sorted = [...this.assignments].sort((a, b) => {
      if (a.role === 'lead' && b.role !== 'lead') return -1;
      if (a.role !== 'lead' && b.role === 'lead') return 1;
      return 0;
    });

    sorted.forEach(assignment => {
      if (!seen.has(assignment.member_id)) {
        seen.add(assignment.member_id);
        const member = this.members.find(m => m.id === assignment.member_id);
        if (member) {
          uniqueMembers.push({ member, role: assignment.role });
        }
      }
    });

    if (uniqueMembers.length === 1) {
      // 단일 담당자: 전체 채움
      const { member, role } = uniqueMembers[0];
      const displayName = role === 'lead' ? member.name : member.name.charAt(0);
      return `
        <div class="member-segment ${Helpers.getMemberColorClass(member.role)}" style="width: 100%;">
          ${Helpers.escapeHtml(displayName)}
        </div>
      `;
    }

    // 다중 담당자: 수평 밴드 (위/아래로 쌓아서 동시 담당 표현)
    const bandHeight = 100 / uniqueMembers.length;
    const bands = uniqueMembers.map(({ member, role }) => {
      const label = `${member.name.charAt(0)} ${role === 'lead' ? '(L)' : ''}`.trim();
      return `
        <div class="member-band ${Helpers.getMemberColorClass(member.role)}"
             style="height: ${bandHeight}%;"
             title="${Helpers.escapeHtml(member.name)} (${role})">
          ${Helpers.escapeHtml(label)}
        </div>
      `;
    }).join('');

    return `<div class="member-bands-wrap">${bands}</div>`;
  }

  getAssigneeNames() {
    if (this.assignments.length === 0) return '미배정';
    const names = [];
    const seen = new Set();
    this.assignments.forEach(a => {
      if (!seen.has(a.member_id)) {
        seen.add(a.member_id);
        const member = this.members.find(m => m.id === a.member_id);
        if (member) names.push(member.name);
      }
    });
    return names.join(', ');
  }
}
