/**
 * Template Manager View
 * Thread 템플릿 CRUD + Task 템플릿 관리
 */

class TemplateManagerView {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.container = null;
    this.templates = [];
    this.selectedTemplate = null;
  }

  async render(container) {
    this.container = container;
    try {
      this.templates = await this.apiClient.getAllTemplates();
      this.renderUI();
      this.attachEventListeners();
    } catch (error) {
      container.innerHTML = `
        <div class="card-modern p-6 text-center">
          <p class="text-red-600 font-semibold">템플릿을 불러올 수 없습니다.</p>
          <p class="text-sm text-gray-600 mt-2">${Helpers.escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  renderUI() {
    this.container.innerHTML = `
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 class="text-xl md:text-2xl font-bold text-gray-900">Thread Templates</h2>
          <p class="text-sm text-gray-500 font-medium mt-0.5">반복 업무를 템플릿으로 관리</p>
        </div>
        <button id="btn-new-template" class="btn-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold">
          + 새 템플릿
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Template List (1/3) -->
        <div class="space-y-3" id="template-list">
          ${this.renderTemplateList()}
        </div>

        <!-- Template Detail (2/3) -->
        <div class="lg:col-span-2" id="template-detail">
          ${this.selectedTemplate ? this.renderTemplateDetail() : this.renderEmptyDetail()}
        </div>
      </div>
    `;
  }

  renderTemplateList() {
    if (this.templates.length === 0) {
      return `
        <div class="card-modern p-6 text-center text-gray-500">
          <p class="font-semibold">템플릿이 없습니다.</p>
          <p class="text-sm mt-1">새 템플릿을 추가해 보세요.</p>
        </div>
      `;
    }

    return this.templates.map(t => {
      const isSelected = this.selectedTemplate?.id === t.id;
      return `
        <div class="card-modern p-4 cursor-pointer template-item ${isSelected ? 'border-blue-400 bg-blue-50' : ''}"
             data-template-id="${t.id}">
          <div class="font-bold text-gray-900">${Helpers.escapeHtml(t.name)}</div>
          ${t.description ? `<div class="text-sm text-gray-500 mt-1">${Helpers.escapeHtml(t.description)}</div>` : ''}
          <div class="flex gap-2 mt-2 text-xs text-gray-400">
            ${t.title_prefix ? `<span class="bg-gray-100 px-2 py-0.5 rounded">접두사: ${Helpers.escapeHtml(t.title_prefix)}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  renderEmptyDetail() {
    return `
      <div class="card-modern p-8 text-center text-gray-400">
        <p class="text-lg font-semibold">좌측에서 템플릿을 선택하세요</p>
      </div>
    `;
  }

  renderTemplateDetail() {
    const t = this.selectedTemplate;
    const tasks = t.task_templates || [];

    return `
      <div class="card-modern p-5">
        <!-- Template Header -->
        <div class="flex justify-between items-start mb-5">
          <div>
            <h3 class="text-lg font-bold text-gray-900">${Helpers.escapeHtml(t.name)}</h3>
            ${t.description ? `<p class="text-sm text-gray-500 mt-1">${Helpers.escapeHtml(t.description)}</p>` : ''}
          </div>
          <div class="flex gap-2">
            <button id="btn-edit-template" class="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition">수정</button>
            <button id="btn-delete-template" class="px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition">삭제</button>
          </div>
        </div>

        <!-- Template Info -->
        <div class="grid grid-cols-2 gap-4 mb-5 text-sm">
          <div>
            <span class="font-semibold text-gray-600">제목 접두사:</span>
            <span class="ml-2 text-gray-900">${Helpers.escapeHtml(t.title_prefix || '(없음)')}</span>
          </div>
          <div>
            <span class="font-semibold text-gray-600">기본 목표:</span>
            <span class="ml-2 text-gray-900">${Helpers.escapeHtml(t.outcome_goal || '(없음)')}</span>
          </div>
        </div>

        <!-- Task Templates -->
        <div class="border-t border-gray-200 pt-4">
          <div class="flex justify-between items-center mb-3">
            <h4 class="font-bold text-gray-800">Task 템플릿 (${tasks.length}개)</h4>
            <button id="btn-add-task-tpl" class="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition">+ Task 추가</button>
          </div>

          ${tasks.length === 0
            ? '<p class="text-sm text-gray-400">아직 Task 템플릿이 없습니다.</p>'
            : `<div class="space-y-2">
                ${tasks.map((task, idx) => `
                  <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group">
                    <span class="text-xs font-bold text-gray-400 w-6">${idx + 1}</span>
                    <div class="flex-1">
                      <div class="font-semibold text-sm text-gray-800">${Helpers.escapeHtml(task.title)}</div>
                      <div class="text-xs text-gray-500 mt-0.5">
                        D+${task.relative_due_days || 0} | 우선순위: ${task.priority || 'medium'}
                      </div>
                    </div>
                    <div class="hidden group-hover:flex gap-1">
                      <button class="btn-edit-task-tpl px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded" data-task-id="${task.id}">수정</button>
                      <button class="btn-delete-task-tpl px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded" data-task-id="${task.id}">삭제</button>
                    </div>
                  </div>
                `).join('')}
              </div>`
          }
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    document.getElementById('btn-new-template')?.addEventListener('click', () => this.showTemplateModal());

    document.querySelectorAll('.template-item').forEach(el => {
      el.addEventListener('click', () => this.selectTemplate(el.dataset.templateId));
    });

    document.getElementById('btn-edit-template')?.addEventListener('click', () => {
      if (this.selectedTemplate) this.showTemplateModal(this.selectedTemplate);
    });

    document.getElementById('btn-delete-template')?.addEventListener('click', () => {
      if (this.selectedTemplate) this.deleteTemplate(this.selectedTemplate.id);
    });

    document.getElementById('btn-add-task-tpl')?.addEventListener('click', () => {
      if (this.selectedTemplate) this.showTaskTemplateModal();
    });

    document.querySelectorAll('.btn-edit-task-tpl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskId = btn.dataset.taskId;
        const task = (this.selectedTemplate?.task_templates || []).find(t => t.id === taskId);
        if (task) this.showTaskTemplateModal(task);
      });
    });

    document.querySelectorAll('.btn-delete-task-tpl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteTaskTemplate(btn.dataset.taskId);
      });
    });
  }

  async selectTemplate(templateId) {
    try {
      this.selectedTemplate = await this.apiClient.getTemplateById(templateId, true);
      this.renderUI();
      this.attachEventListeners();
    } catch (error) {
      alert('템플릿 로드 실패: ' + error.message);
    }
  }

  showTemplateModal(existing = null) {
    const isEdit = !!existing;

    Helpers.showModal(`
      <h3 class="text-lg font-bold text-gray-900 mb-5">${isEdit ? '템플릿 수정' : '새 템플릿'}</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">이름 <span class="text-red-500">*</span></label>
          <input type="text" id="m-tpl-name" value="${isEdit ? Helpers.escapeHtml(existing.name) : ''}" placeholder="예: 웨비나 진행" maxlength="40"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">설명</label>
          <input type="text" id="m-tpl-desc" value="${isEdit ? Helpers.escapeHtml(existing.description || '') : ''}" placeholder="간단한 설명" maxlength="100"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">제목 접두사</label>
          <input type="text" id="m-tpl-prefix" value="${isEdit ? Helpers.escapeHtml(existing.title_prefix || '') : ''}" placeholder="예: [웨비나]" maxlength="30"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">기본 목표 (outcome_goal)</label>
          <input type="text" id="m-tpl-goal" value="${isEdit ? Helpers.escapeHtml(existing.outcome_goal || '') : ''}" placeholder="예: 웨비나 성공 개최" maxlength="100"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button id="m-cancel" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">취소</button>
        <button id="m-submit" class="flex-1 py-2.5 rounded-xl btn-primary text-white font-semibold text-sm">${isEdit ? '저장' : '생성'}</button>
      </div>
    `);

    document.getElementById('m-cancel').onclick = () => Helpers.closeModal();
    document.getElementById('m-submit').onclick = async () => {
      const name = document.getElementById('m-tpl-name').value.trim();
      if (!name) { alert('이름을 입력해주세요.'); return; }

      const payload = {
        name,
        description: document.getElementById('m-tpl-desc').value.trim() || null,
        title_prefix: document.getElementById('m-tpl-prefix').value.trim() || '',
        outcome_goal: document.getElementById('m-tpl-goal').value.trim() || ''
      };

      Helpers.closeModal();
      try {
        if (isEdit) {
          await this.apiClient.updateTemplate(existing.id, payload);
        } else {
          await this.apiClient.createTemplate(payload);
        }
        this.selectedTemplate = null;
        await this.render(this.container);
      } catch (error) {
        alert('템플릿 저장 실패: ' + error.message);
      }
    };
  }

  async deleteTemplate(templateId) {
    if (!confirm('이 템플릿을 삭제하시겠습니까? (Task 템플릿도 함께 삭제됩니다)')) return;
    try {
      await this.apiClient.deleteTemplate(templateId);
      this.selectedTemplate = null;
      await this.render(this.container);
    } catch (error) {
      alert('삭제 실패: ' + error.message);
    }
  }

  showTaskTemplateModal(existing = null) {
    const isEdit = !!existing;

    Helpers.showModal(`
      <h3 class="text-lg font-bold text-gray-900 mb-5">${isEdit ? 'Task 템플릿 수정' : 'Task 템플릿 추가'}</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">제목 <span class="text-red-500">*</span></label>
          <input type="text" id="m-tt-title" value="${isEdit ? Helpers.escapeHtml(existing.title) : ''}" placeholder="Task 제목" maxlength="60"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">상대 마감일 (D+N)</label>
            <input type="number" id="m-tt-days" value="${isEdit ? (existing.relative_due_days || 0) : 0}" min="-365" max="365"
              class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
            <p class="text-xs text-gray-400 mt-1">시작일 기준. 음수 = 이전</p>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">우선순위</label>
            <select id="m-tt-priority" class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
              <option value="high" ${isEdit && existing.priority === 'high' ? 'selected' : ''}>High</option>
              <option value="medium" ${!isEdit || existing.priority === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="low" ${isEdit && existing.priority === 'low' ? 'selected' : ''}>Low</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-1">정렬 순서</label>
          <input type="number" id="m-tt-order" value="${isEdit ? (existing.sort_order || 0) : ((this.selectedTemplate?.task_templates?.length || 0) + 1)}" min="0"
            class="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none">
        </div>
      </div>
      <div class="flex gap-3 mt-6">
        <button id="m-cancel" class="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition">취소</button>
        <button id="m-submit" class="flex-1 py-2.5 rounded-xl btn-primary text-white font-semibold text-sm">${isEdit ? '저장' : '추가'}</button>
      </div>
    `);

    document.getElementById('m-cancel').onclick = () => Helpers.closeModal();
    document.getElementById('m-submit').onclick = async () => {
      const title = document.getElementById('m-tt-title').value.trim();
      if (!title) { alert('제목을 입력해주세요.'); return; }

      const payload = {
        title,
        relative_due_days: parseInt(document.getElementById('m-tt-days').value) || 0,
        priority: document.getElementById('m-tt-priority').value,
        sort_order: parseInt(document.getElementById('m-tt-order').value) || 0
      };

      Helpers.closeModal();
      try {
        if (isEdit) {
          await this.apiClient.updateTaskTemplate(existing.id, payload);
        } else {
          await this.apiClient.createTaskTemplate(this.selectedTemplate.id, payload);
        }
        await this.selectTemplate(this.selectedTemplate.id);
      } catch (error) {
        alert('Task 템플릿 저장 실패: ' + error.message);
      }
    };
  }

  async deleteTaskTemplate(taskId) {
    if (!confirm('이 Task 템플릿을 삭제하시겠습니까?')) return;
    try {
      await this.apiClient.deleteTaskTemplate(taskId);
      await this.selectTemplate(this.selectedTemplate.id);
    } catch (error) {
      alert('삭제 실패: ' + error.message);
    }
  }
}
