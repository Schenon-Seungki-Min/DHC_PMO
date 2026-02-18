/**
 * Project List View
 */

class ProjectListView {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.container = null;
  }

  async render(container) {
    this.container = container;

    try {
      const [projects, threads, tasks] = await Promise.all([
        this.apiClient.getAllProjects(),
        this.apiClient.getAllThreads(),
        this.apiClient.getAllTasks()
      ]);

      const projectStats = this.calculateStats(projects, threads, tasks);

      container.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 class="text-xl md:text-2xl font-bold text-gray-900">프로젝트 목록</h2>
          <button id="btn-new-project" class="btn-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap">
            + 새 프로젝트
          </button>
        </div>
        <div class="grid gap-4 md:gap-5" id="project-list">
          ${projects.length > 0
            ? projects.map(p => this.renderProjectCard(p, projectStats[p.id])).join('')
            : Helpers.renderEmpty('프로젝트가 없습니다.', '새 프로젝트를 추가해보세요.')
          }
        </div>
      `;

      this.attachEventListeners(projects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      container.innerHTML = Helpers.renderError('프로젝트를 불러올 수 없습니다.');
    }
  }

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

  renderProjectCard(project, stats = {}) {
    return `
      <div class="card-modern p-5 md:p-6 cursor-pointer project-card" data-project-id="${project.id}">
        <div class="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <h3 class="font-bold text-gray-900 text-lg">${Helpers.escapeHtml(project.name)}</h3>
              ${Helpers.renderStatusBadge(project.status)}
            </div>
            <p class="text-sm text-gray-600 leading-relaxed">${Helpers.escapeHtml(project.objective)}</p>
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

  attachEventListeners(projects) {
    document.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', () => {
        const project = projects.find(p => p.id === card.dataset.projectId);
        if (project) window.app.showTimeline(project);
      });
    });

    const btnNew = document.getElementById('btn-new-project');
    if (btnNew) btnNew.addEventListener('click', () => this.showNewProjectModal());
  }

  showNewProjectModal() {
    const name = prompt('프로젝트 이름:');
    if (!name?.trim()) return;
    const objective = prompt('프로젝트 목표:');
    if (!objective?.trim()) return;
    this.createProject(name.trim(), objective.trim());
  }

  async createProject(name, objective) {
    try {
      await this.apiClient.createProject({
        id: `proj-${Date.now()}`,
        name,
        objective,
        status: 'active'
      });
      await this.render(this.container);
    } catch (error) {
      alert('프로젝트 생성에 실패했습니다: ' + error.message);
    }
  }
}
