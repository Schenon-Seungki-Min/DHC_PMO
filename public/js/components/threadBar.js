/**
 * Thread Bar Component
 * Thread 타임라인 바 렌더링
 */

class ThreadBar {
  constructor(thread, assignments, members, timelineStart, timelineEnd) {
    this.thread = thread;
    this.assignments = assignments;
    this.members = members;
    this.timelineStart = timelineStart;
    this.timelineEnd = timelineEnd;
  }

  render() {
    const { left, width } = this.calculatePosition();
    const dDay = Helpers.calculateDDay(this.thread.due_date);
    const memberSegments = this.renderMemberSegments();
    const assigneeNames = this.getAssigneeNames();

    return `
      <div class="grid grid-cols-5 gap-2 items-center cursor-pointer thread-bar-container"
           data-thread-id="${this.thread.id}">
        <div class="pr-2">
          <div class="text-sm font-semibold text-gray-800 truncate">${Helpers.escapeHtml(this.thread.title)}</div>
          <div class="text-xs text-gray-500 mt-0.5">${Helpers.escapeHtml(assigneeNames)}</div>
        </div>
        <div class="col-span-4 relative h-14">
          <div class="thread-bar absolute" style="left: ${left}; width: ${width}; top: 6px;">
            ${memberSegments}
            <div class="absolute right-2 top-1/2 -translate-y-1/2">
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

  renderMemberSegments() {
    if (this.assignments.length === 0) {
      return '<div class="remaining-segment"></div>';
    }

    const sortedAssignments = [...this.assignments].sort((a, b) =>
      new Date(a.grabbed_at) - new Date(b.grabbed_at)
    );

    const threadStart = new Date(this.thread.start_date).getTime();
    const threadDue = new Date(this.thread.due_date).getTime();
    const totalDuration = threadDue - threadStart;

    let segments = [];
    let currentTime = threadStart;

    sortedAssignments.forEach((assignment, index) => {
      const member = this.members.find(m => m.id === assignment.member_id);
      if (!member) return;

      const grabbedAt = new Date(assignment.grabbed_at).getTime();
      const nextTime = index < sortedAssignments.length - 1
        ? new Date(sortedAssignments[index + 1].grabbed_at).getTime()
        : threadDue;

      const segmentStart = Math.max(grabbedAt, currentTime);
      const widthPercent = ((nextTime - segmentStart) / totalDuration) * 100;

      if (widthPercent > 0) {
        const displayName = assignment.role === 'lead' ? member.name : member.name.charAt(0);
        segments.push(`
          <div class="member-segment ${Helpers.getMemberColorClass(member.role)}" style="width: ${widthPercent}%;">
            ${Helpers.escapeHtml(displayName)}
          </div>
        `);
      }
      currentTime = nextTime;
    });

    if (currentTime < threadDue) {
      const remainingPercent = ((threadDue - currentTime) / totalDuration) * 100;
      segments.push(`<div class="remaining-segment" style="flex-grow: 0; width: ${remainingPercent}%;"></div>`);
    }

    return segments.join('');
  }

  getAssigneeNames() {
    if (this.assignments.length === 0) return '미배정';
    return this.assignments.map(a => {
      const member = this.members.find(m => m.id === a.member_id);
      return member ? member.name : '?';
    }).join(', ');
  }
}
