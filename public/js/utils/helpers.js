/**
 * 공통 유틸리티 함수 모음
 * 모든 View에서 공유하는 헬퍼 함수들
 */

const Helpers = {

  // ========== 날짜 ==========

  /**
   * D-day 계산 (마감일까지 남은 일수)
   * @param {string} dueDate - ISO 날짜 문자열
   * @returns {number} 양수=남은 일, 0=오늘, 음수=지남
   */
  calculateDDay(dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  },

  /**
   * 날짜 포맷 (M/D)
   * @param {string} dateString - ISO 날짜 문자열
   * @returns {string} "M/D" 형식
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  },

  /**
   * 날짜 포맷 (YYYY-MM-DD)
   * @param {Date} date
   * @returns {string}
   */
  formatDateISO(date) {
    return date.toISOString().split('T')[0];
  },

  // ========== UI ==========

  /**
   * HTML 특수문자 이스케이프 (XSS 방어)
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  },

  /**
   * D-day 뱃지 HTML 생성
   * @param {number} dDay
   * @returns {string} HTML
   */
  renderDDayBadge(dDay) {
    let cls = 'bg-gray-100 text-gray-700';
    let text = `D-${dDay}`;
    let icon = '';

    if (dDay < 0) {
      cls = 'bg-red-100 text-red-700';
      text = `D+${Math.abs(dDay)}`;
      icon = ' 🔥';
    } else if (dDay <= 1) {
      cls = 'bg-red-100 text-red-700';
      icon = ' 🔥';
    } else if (dDay <= 3) {
      cls = 'bg-orange-100 text-orange-800';
      icon = ' ⚠️';
    } else if (dDay <= 7) {
      cls = 'bg-yellow-100 text-yellow-800';
    }

    return `<span class="badge ${cls}">${text}${icon}</span>`;
  },

  /**
   * 로딩 스피너 HTML
   * @param {string} message
   * @returns {string} HTML
   */
  renderLoading(message = '불러오는 중...') {
    return `
      <div class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">${this.escapeHtml(message)}</p>
      </div>
    `;
  },

  /**
   * 에러 상태 HTML
   * @param {string} message
   * @returns {string} HTML
   */
  renderError(message) {
    return `
      <div class="card-modern p-8 text-center">
        <div class="text-4xl mb-3">⚠️</div>
        <p class="text-red-600 font-semibold">${this.escapeHtml(message)}</p>
        <button onclick="location.reload()" class="mt-4 text-sm text-blue-600 hover:underline">새로고침</button>
      </div>
    `;
  },

  /**
   * 빈 상태 HTML
   * @param {string} message
   * @param {string} subMessage
   * @returns {string} HTML
   */
  renderEmpty(message, subMessage = '') {
    return `
      <div class="text-sm text-gray-500 text-center py-6">
        <p>${this.escapeHtml(message)}</p>
        ${subMessage ? `<p class="mt-1 text-xs">${this.escapeHtml(subMessage)}</p>` : ''}
      </div>
    `;
  },

  // ========== 멤버 색상 ==========

  /**
   * 멤버 역할별 배경 색상 클래스 (그라데이션)
   * @param {string} role - pm | intern | member
   * @returns {string}
   */
  getMemberColorClass(role) {
    const map = {
      'pm':     'color-coree',
      'intern': 'color-intern-a',
      'member': 'color-kim'
    };
    return map[role] || 'color-intern-b';
  },

  /**
   * 멤버 역할별 dot 색상 클래스
   * @param {string} role
   * @returns {string}
   */
  getMemberDotClass(role) {
    const map = {
      'pm':     'dot-coree',
      'intern': 'dot-intern-a',
      'member': 'dot-kim'
    };
    return map[role] || 'dot-intern-b';
  },

  // ========== 번역 ==========

  /**
   * Thread/Project 상태 한국어
   */
  translateStatus(status) {
    const map = {
      'active':      '진행중',
      'in_progress': '진행중',
      'completed':   '완료',
      'on_hold':     '보류'
    };
    return map[status] || status;
  },

  /**
   * Task 상태 한국어
   */
  translateTaskStatus(status) {
    const map = {
      'completed':   '완료',
      'in_progress': '진행중',
      'pending':     '대기중'
    };
    return map[status] || status;
  },

  /**
   * 역할 한국어
   */
  translateRole(role) {
    const map = {
      'pm':     'PM',
      'intern': '인턴',
      'member': '팀원'
    };
    return map[role] || role;
  },

  // ========== 상태 뱃지 ==========

  /**
   * 상태 뱃지 HTML
   */
  renderStatusBadge(status) {
    const map = {
      'active':      '<span class="badge bg-green-100 text-green-700">진행중</span>',
      'in_progress': '<span class="badge bg-green-100 text-green-700">진행중</span>',
      'completed':   '<span class="badge bg-gray-100 text-gray-700">완료</span>',
      'on_hold':     '<span class="badge bg-yellow-100 text-yellow-700">보류</span>'
    };
    return map[status] || '';
  }

};
