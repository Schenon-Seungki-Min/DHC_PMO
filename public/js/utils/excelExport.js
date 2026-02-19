/**
 * Excel Export Utility
 * SheetJS(xlsx)를 사용한 클라이언트 사이드 Excel 내보내기
 */

class ExcelExporter {
  /**
   * 프로젝트 전체 현황 Excel 내보내기
   * @param {Object} project - 현재 프로젝트
   * @param {Array} threads - Thread 목록
   * @param {Array} tasks - Task 목록
   * @param {Array} members - 팀원 목록
   * @param {Object} assignments - { threadId: [assignment, ...] }
   */
  exportProject(project, threads, tasks, members, assignments) {
    const wb = XLSX.utils.book_new();

    // 시트 1: Thread 목록
    const threadSheet = this.buildThreadSheet(threads, members, assignments);
    XLSX.utils.book_append_sheet(wb, threadSheet, 'Threads');

    // 시트 2: Task 목록
    const taskSheet = this.buildTaskSheet(threads, tasks, members);
    XLSX.utils.book_append_sheet(wb, taskSheet, 'Tasks');

    // 시트 3: 팀원 현황
    const peopleSheet = this.buildPeopleSheet(members, threads, assignments);
    XLSX.utils.book_append_sheet(wb, peopleSheet, '팀원현황');

    // 파일 다운로드
    const today = new Date().toISOString().split('T')[0];
    const fileName = `${project.name}_PMO_${today}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  /**
   * Thread 시트 생성
   */
  buildThreadSheet(threads, members, assignments) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = [
      // 헤더
      ['Thread ID', '제목', '타입', '상태', '시작일', '마감일', 'D-day', '담당자(Lead)', '담당자(Support)', '목표']
    ];

    threads.forEach(thread => {
      const dueDate = new Date(thread.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const dDay = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const dDayLabel = dDay < 0 ? `D+${Math.abs(dDay)}` : `D-${dDay}`;

      const threadAssignments = assignments[thread.id] || [];
      const leadAssignees = threadAssignments
        .filter(a => a.role === 'lead')
        .map(a => {
          const m = members.find(m => m.id === a.member_id);
          return m ? m.name : '?';
        }).join(', ');

      const supportAssignees = threadAssignments
        .filter(a => a.role === 'support')
        .map(a => {
          const m = members.find(m => m.id === a.member_id);
          return m ? m.name : '?';
        }).join(', ');

      rows.push([
        thread.id,
        thread.title,
        thread.thread_type,
        this.translateStatus(thread.status),
        thread.start_date,
        thread.due_date,
        dDayLabel,
        leadAssignees || '미배정',
        supportAssignees || '-',
        thread.objective || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 12 }, // Thread ID
      { wch: 24 }, // 제목
      { wch: 14 }, // 타입
      { wch: 10 }, // 상태
      { wch: 12 }, // 시작일
      { wch: 12 }, // 마감일
      { wch: 8 },  // D-day
      { wch: 16 }, // 담당자(Lead)
      { wch: 16 }, // 담당자(Support)
      { wch: 30 }  // 목표
    ];

    return ws;
  }

  /**
   * Task 시트 생성
   */
  buildTaskSheet(threads, tasks, members) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = [
      // 헤더
      ['Task ID', 'Thread', '제목', '상태', '마감일', 'D-day', '담당자', '우선순위']
    ];

    tasks.forEach(task => {
      const thread = threads.find(t => t.id === task.thread_id);
      const assignee = task.assigned_to
        ? members.find(m => m.id === task.assigned_to)
        : null;

      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const dDay = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      const dDayLabel = task.status === 'completed'
        ? '완료'
        : (dDay < 0 ? `D+${Math.abs(dDay)}` : `D-${dDay}`);

      rows.push([
        task.id,
        thread ? thread.title : '-',
        task.title,
        this.translateTaskStatus(task.status),
        task.due_date,
        dDayLabel,
        assignee ? assignee.name : '미배정',
        task.priority || '-'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 12 }, // Task ID
      { wch: 20 }, // Thread
      { wch: 24 }, // 제목
      { wch: 10 }, // 상태
      { wch: 12 }, // 마감일
      { wch: 8 },  // D-day
      { wch: 12 }, // 담당자
      { wch: 8 }   // 우선순위
    ];

    return ws;
  }

  /**
   * 팀원 현황 시트 생성
   */
  buildPeopleSheet(members, threads, assignments) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = [
      // 헤더
      ['팀원', '역할', '담당 Thread', 'Thread 제목', '역할(Lead/Support)', '마감일', 'D-day']
    ];

    members.forEach(member => {
      const memberAssignments = [];

      threads.forEach(thread => {
        const threadAssignments = assignments[thread.id] || [];
        const myAssignment = threadAssignments.find(a => a.member_id === member.id);
        if (myAssignment) {
          const dueDate = new Date(thread.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const dDay = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

          memberAssignments.push({
            thread,
            role: myAssignment.role,
            dDay
          });
        }
      });

      if (memberAssignments.length === 0) {
        rows.push([
          member.name,
          this.translateRole(member.role),
          0,
          '-', '-', '-', '-'
        ]);
      } else {
        memberAssignments.forEach((ma, index) => {
          rows.push([
            index === 0 ? member.name : '',         // 이름은 첫 행에만
            index === 0 ? this.translateRole(member.role) : '',  // 역할도 첫 행에만
            index === 0 ? memberAssignments.length : '',         // Thread 수도 첫 행에만
            ma.thread.title,
            ma.role,
            ma.thread.due_date,
            ma.dDay < 0 ? `D+${Math.abs(ma.dDay)}` : `D-${ma.dDay}`
          ]);
        });
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // 컬럼 너비 설정
    ws['!cols'] = [
      { wch: 12 }, // 팀원
      { wch: 8 },  // 역할
      { wch: 10 }, // 담당 Thread 수
      { wch: 24 }, // Thread 제목
      { wch: 14 }, // Lead/Support
      { wch: 12 }, // 마감일
      { wch: 8 }   // D-day
    ];

    return ws;
  }

  /**
   * Thread 상태 한국어 변환
   */
  translateStatus(status) {
    const map = {
      'active': '진행중',
      'in_progress': '진행중',
      'completed': '완료',
      'on_hold': '보류'
    };
    return map[status] || status;
  }

  /**
   * Task 상태 한국어 변환
   */
  translateTaskStatus(status) {
    const map = {
      'completed': '완료',
      'in_progress': '진행중',
      'pending': '대기중'
    };
    return map[status] || status;
  }

  /**
   * 역할 한국어 변환
   */
  translateRole(role) {
    const map = {
      'pm': 'PM',
      'intern': '인턴',
      'member': '팀원'
    };
    return map[role] || role;
  }
}

// Singleton
const excelExporter = new ExcelExporter();
