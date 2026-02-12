const express = require('express');
const cors = require('cors');
const path = require('path');
const dataService = require('./dataService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DHC_PMO server is running' });
});

// ========== PROJECTS API ==========

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await dataService.getAllProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await dataService.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const newProject = await dataService.createProject(req.body);
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const updated = await dataService.updateProject(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const deleted = await dataService.deleteProject(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== THREADS API ==========

app.get('/api/threads', async (req, res) => {
  try {
    const filters = {
      project_id: req.query.project_id,
      status: req.query.status
    };
    const threads = await dataService.getAllThreads(filters);
    res.json(threads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/threads/:id', async (req, res) => {
  try {
    const thread = await dataService.getThreadById(req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json(thread);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/threads', async (req, res) => {
  try {
    const newThread = await dataService.createThread(req.body);
    res.status(201).json(newThread);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/threads/:id', async (req, res) => {
  try {
    const updated = await dataService.updateThread(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/threads/:id', async (req, res) => {
  try {
    const deleted = await dataService.deleteThread(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thread Assignment
app.post('/api/threads/:id/assign', async (req, res) => {
  try {
    const { member_id, role, note } = req.body;
    const assignment = await dataService.assignThread(
      req.params.id,
      member_id,
      role,
      note
    );
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/threads/:id/release', async (req, res) => {
  try {
    const { assignment_id, note } = req.body;
    const released = await dataService.releaseThread(assignment_id, note);
    if (!released) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(released);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/threads/:id/history', async (req, res) => {
  try {
    const history = await dataService.getThreadAssignments(req.params.id);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/threads/:id/current-assignments', async (req, res) => {
  try {
    const assignments = await dataService.getCurrentAssignments(req.params.id);
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== TASKS API ==========

app.get('/api/tasks', async (req, res) => {
  try {
    const filters = {
      thread_id: req.query.thread_id,
      assignee_id: req.query.assignee_id,
      status: req.query.status
    };
    const tasks = await dataService.getAllTasks(filters);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks/:id', async (req, res) => {
  try {
    const task = await dataService.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const newTask = await dataService.createTask(req.body);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const updated = await dataService.updateTask(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const deleted = await dataService.deleteTask(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== TEAM MEMBERS API ==========

app.get('/api/members', async (req, res) => {
  try {
    const members = await dataService.getAllMembers();
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/members/:id', async (req, res) => {
  try {
    const member = await dataService.getMemberById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const newMember = await dataService.createMember(req.body);
    res.status(201).json(newMember);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const updated = await dataService.updateMember(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    const deleted = await dataService.deleteMember(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== STAKEHOLDERS API ==========

app.get('/api/stakeholders', async (req, res) => {
  try {
    const stakeholders = await dataService.getAllStakeholders();
    res.json(stakeholders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stakeholders/:id', async (req, res) => {
  try {
    const stakeholder = await dataService.getStakeholderById(req.params.id);
    if (!stakeholder) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    res.json(stakeholder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stakeholders', async (req, res) => {
  try {
    const newStakeholder = await dataService.createStakeholder(req.body);
    res.status(201).json(newStakeholder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/stakeholders/:id', async (req, res) => {
  try {
    const updated = await dataService.updateStakeholder(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/stakeholders/:id', async (req, res) => {
  try {
    const deleted = await dataService.deleteStakeholder(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }
    res.json({ message: 'Stakeholder deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thread Stakeholders
app.post('/api/threads/:id/stakeholders', async (req, res) => {
  try {
    const { stakeholder_id, role_type } = req.body;
    const mapping = await dataService.addThreadStakeholder(
      req.params.id,
      stakeholder_id,
      role_type
    );
    res.status(201).json(mapping);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/threads/:id/stakeholders/:stakeholder_id', async (req, res) => {
  try {
    const deleted = await dataService.removeThreadStakeholder(
      req.params.id,
      req.params.stakeholder_id
    );
    if (!deleted) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    res.json({ message: 'Stakeholder removed from thread' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/threads/:id/stakeholders', async (req, res) => {
  try {
    const stakeholders = await dataService.getThreadStakeholders(req.params.id);
    res.json(stakeholders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== THREAD TEMPLATES API ==========

app.get('/api/templates', async (req, res) => {
  try {
    const templates = await dataService.getAllTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/templates/:id', async (req, res) => {
  try {
    const template = await dataService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    const newTemplate = await dataService.createTemplate(req.body);
    res.status(201).json(newTemplate);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/templates/:id', async (req, res) => {
  try {
    const updated = await dataService.updateTemplate(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/templates/:id', async (req, res) => {
  try {
    const deleted = await dataService.deleteTemplate(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Template Tasks
app.get('/api/templates/:id/tasks', async (req, res) => {
  try {
    const tasks = await dataService.getTemplateTasks(req.params.id);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Thread from Template
app.post('/api/threads/from-template', async (req, res) => {
  try {
    const { template_id, ...threadData } = req.body;
    const result = await dataService.createThreadFromTemplate(template_id, threadData);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DHC_PMO server running on http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/health`);
});
