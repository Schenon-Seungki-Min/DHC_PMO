/**
 * Main App - 앱 초기화 및 hash 기반 라우팅
 *
 * Hash 규칙:
 *   #/timeline        → Timeline 뷰 (currentProject 유지)
 *   #/thread/:id      → Thread Detail 뷰 (Timeline 탭 활성)
 *   #/projects        → Projects 뷰
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
    this._skipNextHashChange = false; // 프로그래밍 방식 hash 변경 시 이중 렌더 방지

    this.views = {
      projects: new ProjectListView(this.apiClient),
      timeline: new TimelineView(this.apiClient),
      detail:   new ThreadDetailView(this.apiClient),
      people:   new PeopleView(this.apiClient)
    };
  }

  /**
   * 앱 초기화
   */
  async init() {
    console.log('🚀 DHC_PMO App initialized');

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
   * Thread Detail 탭은 제거됨 — detail은 Timeline의 depth로 처리
   */
  setupNavigation() {
    const tabs = {
      'tab-timeline': 'timeline',
      'tab-projects': 'projects',
      'tab-people':   'people',
    };

    Object.entries(tabs).forEach(([tabId, section]) => {
      const el = document.getElementById(tabId);
      if (el) el.addEventListener('click', () => this.navigate(section));
    });
  }

  /**
   * 탭/버튼 클릭으로 이동 (hash 변경 → hashchange → handleHashChange)
   * Timeline 탭은 currentProject가 있으면 그대로 유지
   */
  navigate(section) {
    const newHash = `#/${section}`;

    if (window.location.hash === newHash) {
      // 이미 같은 hash면 hashchange가 발생하지 않으므로 직접 렌더
      this.handleHashChange();
    } else {
      window.location.hash = `/${section}`;
    }
  }

  /**
   * Hash 파싱 후 뷰 렌더링
   * 브라우저 뒤로가기, 직접 URL 접근, navigate() 모두 이 함수로 처리
   */
  async handleHashChange() {
    const hash = window.location.hash || '#/projects';
    const path = hash.replace(/^#\/?/, '');        // '#/thread/xxx' → 'thread/xxx'
    const [section, id] = path.split('/');

    if (section === 'thread' && id) {
      await this._resolveAndShowThread(id);
    } else if (section === 'timeline') {
      this._switchView('timeline');
      this._activateTab('timeline');
      await this.views.timeline.render(
        document.getElementById('view-timeline'),
        this.currentProject   // null이면 "프로젝트를 선택해주세요" 상태
      );
    } else if (section === 'people') {
      this._switchView('people');
      this._activateTab('people');
      await this.views.people.render(document.getElementById('view-people'));
    } else {
      // projects (default)
      this._switchView('projects');
      this._activateTab('projects');
      await this.views.projects.render(document.getElementById('view-projects'));
    }
  }

  /**
   * ThreadId로 thread를 가져와서 Detail 뷰 표시
   * (직접 URL 접근 or 뒤로가기 대응)
   */
  async _resolveAndShowThread(threadId) {
    // 이미 메모리에 같은 thread가 있으면 재사용
    let thread = (this.currentThread?.id === threadId) ? this.currentThread : null;

    if (!thread) {
      try {
        thread = await this.apiClient.getThreadById(threadId);
        if (!thread) { this.navigate('timeline'); return; }

        // project도 함께 로드 (직접 URL 접근 시 currentProject가 없을 수 있음)
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
    this._activateTab('timeline'); // detail은 Timeline의 하위 depth → Timeline 탭 활성 유지
    await this.views.detail.render(
      document.getElementById('view-detail'),
      thread,
      this.currentProject
    );
  }

  // ========== 뷰에서 호출하는 외부 진입점 ==========

  /**
   * ProjectListView → Timeline으로 이동 (프로젝트 선택)
   */
  async showTimeline(project) {
    this.currentProject = project;
    this._setHash('/timeline');
    this._switchView('timeline');
    this._activateTab('timeline');
    await this.views.timeline.render(document.getElementById('view-timeline'), project);
  }

  /**
   * TimelineView → Thread Detail로 이동 (thread 클릭)
   */
  async showThreadDetail(thread) {
    this.currentThread = thread;
    this._setHash(`/thread/${thread.id}`);
    this._switchView('detail');
    this._activateTab('timeline'); // detail은 Timeline의 하위 depth
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
