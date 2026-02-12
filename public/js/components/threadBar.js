/**
 * Thread Bar Component
 * Thread 타임라인 바 렌더링
 */

class ThreadBar {
  constructor(thread, assignments, members, timelineStart, timelineEnd) {
    this.thread = thread;
    this.assignments = assignments; // 현재 활성 assignment들
    this.members = members;
    this.timelineStart = timelineStart;
    this.timelineEnd = timelineEnd;
  }

  /**
   * Thread 바 렌더링
   */
  render() {
    const { left, width } = this.calculatePosition();
    const dDay = this.calculateDDay();
    const memberSegments = this.renderMemberSegments();
    const assigneeNames = this.getAssigneeNames();

    return `
      <div class="grid grid-cols-5 gap-2 items-center cursor-pointer thread-bar-container"
           data-thread-id="${this.thread.id}">
        <div class="pr-2">
          <div class="text-sm font-semibold text-gray-800 truncate">${this.escapeHtml(this.thread.title)}</div>
          <div class="text-xs text-gray-500 mt-0.5">${assigneeNames}</div>
        </div>
        <div class="col-span-4 relative h-14">
          <div class="thread-bar absolute" style="left: ${left}; width: ${width}; top: 6px;">
            ${memberSegments}
            <div class="absolute right-2 top-1/2 -translate-y-1/2">
              ${this.renderDDayBadge(dDay)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Thread 바 위치 계산 (타임라인 내에서 left, width)
   */
  calculatePosition() {
    const startDate = new Date(this.thread.start_date);
    const dueDate = new Date(this.thread.due_date);

    const totalDays = (this.timelineEnd - this.timelineStart) / (1000 * 60 * 60 * 24);
    const startOffset = (startDate - this.timelineStart) / (1000 * 60 * 60 * 24);
    const duration = (dueDate - startDate) / (1000 * 60 * 60 * 24);

    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`
    };
  }

  /**
   * D-day 계산
   */
  calculateDDay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(this.thread.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const diff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    return diff;
  }

  /**
   * D-day 뱃지 렌더링
   */
  renderDDayBadge(dDay) {
    let badgeClass = 'bg-gray-100 text-gray-700';
    let text = `D-${dDay}`;

    if (dDay < 0) {
      badgeClass = 'bg-red-100 text-red-700';
      text = `D+${Math.abs(dDay)} 🔥`;
    } else if (dDay === 0) {
      badgeClass = 'bg-red-100 text-red-700';
      text = 'D-day 🔥';
    } else if (dDay <= 3) {
      badgeClass = 'bg-orange-100 text-orange-800';
      text = `D-${dDay} 🔥`;
    } else if (dDay <= 7) {
      badgeClass = 'bg-yellow-100 text-yellow-800';
    }

    return `<span class="badge ${badgeClass}">${text}</span>`;
  }

  /**
   * 멤버 세그먼트 렌더링
   */
  renderMemberSegments() {
    if (this.assignments.length === 0) {
      return '<div class="remaining-segment"></div>';
    }

    // 담당자별 소요 시간 계산 (grabbed_at 기준)
    const sortedAssignments = [...this.assignments].sort((a, b) =>
      new Date(a.grabbed_at) - new Date(b.grabbed_at)
    );

    const threadStart = new Date(this.thread.start_date).getTime();
    const threadDue = new Date(this.thread.due_date).getTime();
    const totalDuration = threadDue - threadStart;

    let segments = [];
    let currentTime = threadStart;

    sortedAssignments.forEach((assignment, index) => {
      const grabbedAt = new Date(assignment.grabbed_at).getTime();
      const member = this.members.find(m => m.id === assignment.member_id);

      if (!member) return;

      // 다음 assignment까지의 시간 또는 마감일까지
      const nextTime = index < sortedAssignments.length - 1
        ? new Date(sortedAssignments[index + 1].grabbed_at).getTime()
        : threadDue;

      const segmentStart = Math.max(grabbedAt, currentTime);
      const segmentDuration = nextTime - segmentStart;
      const widthPercent = (segmentDuration / totalDuration) * 100;

      if (widthPercent > 0) {
        const colorClass = this.getMemberColorClass(member.role);
        const displayName = assignment.role === 'lead' ? member.name : member.name.charAt(0);

        segments.push(`
          <div class="member-segment ${colorClass}" style="width: ${widthPercent}%;">
            ${this.escapeHtml(displayName)}
          </div>
        `);
      }

      currentTime = nextTime;
    });

    // 나머지 시간 (아직 배정 안 된 부분)
    if (currentTime < threadDue) {
      const remainingPercent = ((threadDue - currentTime) / totalDuration) * 100;
      segments.push(`<div class="remaining-segment" style="flex-grow: 0; width: ${remainingPercent}%;"></div>`);
    }

    return segments.join('');
  }

  /**
   * 담당자 이름 목록
   */
  getAssigneeNames() {
    if (this.assignments.length === 0) {
      return '미배정';
    }

    const names = this.assignments.map(a => {
      const member = this.members.find(m => m.id === a.member_id);
      return member ? member.name : '?';
    });

    return names.join(', ');
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
   * HTML 이스케이프
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
