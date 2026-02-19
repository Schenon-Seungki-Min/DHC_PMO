/**
 * Main App - 앱 초기화 및 라우팅
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
    this.currentView = 'projects';
    this.currentProject = null;
    this.currentThread = null;

    this.views = {
      projects: new ProjectListView(this.apiClient),
      timeline: new TimelineView(this.apiClient),
      detail: new ThreadDetailView(this.apiClient),
      people: new PeopleView(this.apiClient)
    };
  }

  /**
   * 앱 초기화
   */
  async init() {
    console.log('🚀 DHC_PMO App initialized');

    // 초기 뷰 렌더링
    await this.showView('timeline');

    // 탭 네비게이션 이벤트 리스너
    this.setupNavigation();
  }

  /**
   * 탭 네비게이션 설정
   */
  setupNavigation() {
    const tabs = {
      'tab-projects': 'projects',
      'tab-timeline': 'timeline',
      'tab-detail': 'detail',
      'tab-people': 'people'
    };

    Object.entries(tabs).forEach(([tabId, viewName]) => {
      const tab = document.getElementById(tabId);
      if (tab) {
        tab.addEventListener('click', () => this.showView(viewName));
      }
    });
  }

  /**
   * 뷰 전환
   */
  async showView(viewName) {
    // 모든 뷰 숨기기
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

    // 선택한 뷰 표시
    const viewElement = document.getElementById(`view-${viewName}`);
    if (viewElement) {
      viewElement.classList.remove('hidden');
    }

    // 탭 활성화
    document.querySelectorAll('nav button').forEach(t => {
      t.classList.remove('tab-active');
      t.classList.add('text-gray-500');
    });

    const activeTab = document.getElementById(`tab-${viewName}`);
    if (activeTab) {
      activeTab.classList.add('tab-active');
      activeTab.classList.remove('text-gray-500');
    }

    this.currentView = viewName;

    // 뷰별 렌더링
    const mainContent = document.getElementById(`view-${viewName}`);
    if (mainContent && this.views[viewName]) {
      await this.views[viewName].render(mainContent);
    }
  }

  /**
   * Timeline 뷰로 이동 (프로젝트 선택)
   */
  async showTimeline(project) {
    this.currentProject = project;

    // Timeline 뷰로 전환
    await this.showView('timeline');

    // Timeline 뷰 렌더링 (프로젝트 전달)
    const mainContent = document.getElementById('view-timeline');
    if (mainContent && this.views.timeline) {
      await this.views.timeline.render(mainContent, project);
    }
  }

  /**
   * Thread Detail 뷰로 이동
   */
  async showThreadDetail(thread) {
    this.currentThread = thread;

    // Detail 뷰로 전환
    await this.showView('detail');

    // Detail 뷰 렌더링 (thread, project 전달)
    const mainContent = document.getElementById('view-detail');
    if (mainContent && this.views.detail) {
      await this.views.detail.render(mainContent, thread, this.currentProject);
    }
  }
}

// 앱 인스턴스 생성 및 초기화
const app = new App();

// DOM 로드 완료 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// 전역 접근용
window.app = app;
