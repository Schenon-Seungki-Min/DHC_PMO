/**
 * Main App - 앱 초기화 및 hash 기반 라우팅
 *
 * Hash 규칙:
 *   #/timeline        → Timeline 뷰 (메인, 전체 프로젝트 그룹 헤더)
 *   #/thread/:id      → Thread Detail 뷰 (Timeline 탭 활성)
 *   #/people          → People 뷰
 */

// 인증 가드: 토큰 없거나 만료되면 로그인 페이지로
(function checkAuth() {
  const token = localStorage.getItem('pmo_token');
  if (!token) { window.location.href = '/login.html'; return; }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      localStorage.removeItem('pmo_token');
      window.location.href = '/login.html';
    }
  } catch (e) {
    localStorage.removeItem('pmo_token');
    window.location.href = '/login.html';
  }
})();

function logout() {
  localStorage.removeItem('pmo_token');
  window.location.href = '/login.html';
}

class App {
  constructor() {
    this.apiClient = apiClient;
    this.currentView = null;
    this.currentProject = null;
    this.currentThread = null;
    this._skipNextHashChange = false;

    this.views = {
      timeline: new TimelineView(this.apiClient),
      detail:   new ThreadDetailView(this.apiClient),
      people:   new PeopleView(this.apiClient)
    };
  }

  /**
   * 앱 초기화
   */
  async init() {
    console.log('DHC_PMO App initialized');

    // 탭 클릭 이벤트 등록
    this.setupNavigation();

    // 브라우저 뒤로/앞으로가기 대응
    window.addEventListener('hashchange', () => {
      if (this._skipNextHashChange) { this._skipNextHashChange = false; return; }
      this.handleHashChange();
    });

    // 초기 hash 처리 (직접 URL 접근 포함)
    await this.handleHashChange();
  }

  /**
   * 탭 네비게이션 등록
   */
  setupNavigation() {
    const tabs = {
      'tab-timeline': 'timeline',
      'tab-people':   'people',
    };

    Object.entries(tabs).forEach(([tabId, section]) => {
      const el = document.getElementById(tabId);
      if (el) el.addEventListener('click', () => this.navigate(section));
    });
  }

  /**
   * 탭/버튼 클릭으로 이동
   */
  navigate(section) {
    const newHash = `#/${section}`;

    if (window.location.hash === newHash) {
      this.handleHashChange();
    } else {
      window.location.hash = `/${section}`;
    }
  }

  /**
   * Hash 파싱 후 뷰 렌더링
   */
  async handleHashChange() {
    const hash = window.location.hash || '#/timeline';
    const path = hash.replace(/^#\/?/, '');
    const [section, id] = path.split('/');

    if (section === 'thread' && id) {
      await this._resolveAndShowThread(id);
    } else if (section === 'people') {
      this._switchView('people');
      this._activateTab('people');
      await this.views.people.render(document.getElementById('view-people'));
    } else {
      // timeline (default)
      this._switchView('timeline');
      this._activateTab('timeline');
      await this.views.timeline.render(
        document.getElementById('view-timeline'),
        null // 항상 전체 프로젝트 (프로젝트 그룹 헤더로 분류)
      );
    }
  }

  /**
   * ThreadId로 thread를 가져와서 Detail 뷰 표시
   */
  async _resolveAndShowThread(threadId) {
    let thread = (this.currentThread?.id === threadId) ? this.currentThread : null;

    if (!thread) {
      try {
        thread = await this.apiClient.getThreadById(threadId);
        if (!thread) { this.navigate('timeline'); return; }

        if (!this.currentProject || this.currentProject.id !== thread.project_id) {
          this.currentProject = await this.apiClient.getProjectById(thread.project_id);
        }
        this.currentThread = thread;
      } catch (e) {
        console.error('Thread 로드 실패:', e);
        this.navigate('timeline');
        return;
      }
    }

    this._switchView('detail');
    this._activateTab('timeline');
    await this.views.detail.render(
      document.getElementById('view-detail'),
      thread,
      this.currentProject
    );
  }

  // ========== 뷰에서 호출하는 외부 진입점 ==========

  /**
   * TimelineView → Thread Detail로 이동 (thread 클릭)
   */
  async showThreadDetail(thread) {
    this.currentThread = thread;
    this._setHash(`/thread/${thread.id}`);
    this._switchView('detail');
    this._activateTab('timeline');
    await this.views.detail.render(
      document.getElementById('view-detail'),
      thread,
      this.currentProject
    );
  }

  // ========== 내부 헬퍼 ==========

  /** hash 변경 (hashchange 이벤트 skip) */
  _setHash(path) {
    this._skipNextHashChange = true;
    window.location.hash = path;
  }

  /** 모든 뷰 숨기고 지정 뷰만 표시 */
  _switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewName}`)?.classList.remove('hidden');
    this.currentView = viewName;
  }

  /** 탭 활성 스타일 변경 */
  _activateTab(tabName) {
    document.querySelectorAll('nav button').forEach(t => {
      t.classList.remove('tab-active');
      t.classList.add('text-gray-500');
    });
    const tab = document.getElementById(`tab-${tabName}`);
    if (tab) {
      tab.classList.add('tab-active');
      tab.classList.remove('text-gray-500');
    }
  }
}

// 앱 인스턴스 생성 및 초기화
const app = new App();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// 전역 접근용
window.app = app;
