/**
 * Project List View
 */

class ProjectListView {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.container = null;
  }

  /**
   * 프로젝트 목록 렌더링
   */
  async render(container) {
    this.container = container;

    try {
      const projects = await this.apiClient.getAllProjects();
      const threads = await this.apiClient.getAllThreads();
      const tasks = await this.apiClient.getAllTasks();

      // 프로젝트별 Thread/Task 개수 계산
      const projectStats = this.calculateStats(projects, threads, tasks);

      container.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 class="text-xl md:text-2xl font-bold text-gray-900">프로젝트 목록</h2>
          <button id="btn-new-project" class="btn-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap">
            + 새 프로젝트
          </button>
        </div>
        <div class="grid gap-4 md:gap-5" id="project-list">
          ${projects.map(project => this.renderProjectCard(project, projectStats[project.id])).join('')}
        </div>
      `;

      // 이벤트 리스너 등록
      this.attachEventListeners(projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      container.innerHTML = `
        <div class="card-modern p-6 text-center">
          <p class="text-red-600 font-semibold">프로젝트를 불러올 수 없습니다.</p>
          <p class="text-sm text-gray-600 mt-2">${error.message}</p>
        </div>
      `;
    }
  }

  /**
   * 프로젝트별 통계 계산
   */
  calculateStats(projects, threads, tasks) {
    const stats = {};

    projects.forEach(project => {
      const projectThreads = threads.filter(t => t.project_id === project.id);
      const threadIds = projectThreads.map(t => t.id);
      const projectTasks = tasks.filter(t => threadIds.includes(t.thread_id));
      const inProgressTasks = projectTasks.filter(t => t.status === 'in_progress');

      stats[project.id] = {
        threadCount: projectThreads.length,
        taskCount: projectTasks.length,
        inProgressCount: inProgressTasks.length
      };
    });

    return stats;
  }

  /**
   * 프로젝트 카드 렌더링
   */
  renderProjectCard(project, stats = {}) {
    const statusBadge = this.getStatusBadge(project.status);

    return `
      <div class="card-modern p-5 md:p-6 cursor-pointer project-card" data-project-id="${project.id}">
        <div class="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="font-bold text-gray-900 text-lg">${this.escapeHtml(project.name)}</h3>
              ${statusBadge}
            </div>
            <p class="text-sm text-gray-600 leading-relaxed">${this.escapeHtml(project.objective)}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100 text-sm">
          <span class="text-gray-600">Thread <strong class="font-bold text-gray-900">${stats.threadCount || 0}</strong>개</span>
          <span class="text-gray-600">Task <strong class="font-bold text-gray-900">${stats.taskCount || 0}</strong>개</span>
          <span class="text-blue-600 font-medium">진행중 <strong class="font-bold">${stats.inProgressCount || 0}</strong>개</span>
        </div>
      </div>
    `;
  }

  /**
   * 상태 뱃지
   */
  getStatusBadge(status) {
    const badges = {
      'active': '<span class="badge bg-green-100 text-green-700">진행중</span>',
      'completed': '<span class="badge bg-gray-100 text-gray-700">완료</span>',
      'on_hold': '<span class="badge bg-yellow-100 text-yellow-700">보류</span>'
    };
    return badges[status] || '';
  }

  /**
   * 이벤트 리스너 등록
   */
  attachEventListeners(projects) {
    // 프로젝트 카드 클릭 → Timeline 뷰로 이동
    document.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => {
        const projectId = card.dataset.projectId;
        const project = projects.find(p => p.id === projectId);
        window.app.showTimeline(project);
      });
    });

    // 새 프로젝트 버튼
    const btnNewProject = document.getElementById('btn-new-project');
    if (btnNewProject) {
      btnNewProject.addEventListener('click', () => {
        this.showNewProjectModal();
      });
    }
  }

  /**
   * 새 프로젝트 모달 (간단 구현)
   */
  showNewProjectModal() {
    const name = prompt('프로젝트 이름:');
    if (!name) return;

    const objective = prompt('프로젝트 목표:');
    if (!objective) return;

    this.createProject(name, objective);
  }

  /**
   * 프로젝트 생성
   */
  async createProject(name, objective) {
    try {
      const newProject = await this.apiClient.createProject({
        id: `proj-${Date.now()}`,
        name,
        objective,
        status: 'active'
      });

      // 목록 새로고침
      await this.render(this.container);

      alert('프로젝트가 생성되었습니다.');
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('프로젝트 생성에 실패했습니다: ' + error.message);
    }
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
