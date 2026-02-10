// FlowSync Main Application

class FlowSyncApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.tasks = [];
        this.projects = [];
        this.users = [];
        this.currentTaskId = null;
    }
    
    async init() {
        this.setupNavigation();
        this.setupModals();
        this.setupCreateButtons();
        this.loadUserProfile();
        await this.loadInitialData();
        this.showPage('dashboard');
    }
    
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.showPage(page);
                
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }
    
    setupModals() {
        // Task Modal
        const taskModal = document.getElementById('task-modal');
        const closeButtons = document.querySelectorAll('.modal-close, .modal-cancel');
        
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                taskModal.classList.remove('active');
                document.getElementById('project-modal').classList.remove('active');
            });
        });
        
        // Click outside to close
        [taskModal, document.getElementById('project-modal')].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
        
        // Task form submission
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTaskSubmit();
        });
        
        // Project form submission
        document.getElementById('project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProjectSubmit();
        });
        
        // Filters
        document.getElementById('filter-status')?.addEventListener('change', () => this.loadTasks());
        document.getElementById('filter-priority')?.addEventListener('change', () => this.loadTasks());
        
        // Search
        let searchTimeout;
        document.getElementById('task-search')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.loadTasks(), 300);
        });
    }
    
    setupCreateButtons() {
        document.getElementById('create-task-btn')?.addEventListener('click', () => this.openTaskModal());
        document.getElementById('create-task-btn-2')?.addEventListener('click', () => this.openTaskModal());
        document.getElementById('create-project-btn')?.addEventListener('click', () => this.openProjectModal());
    }
    
    loadUserProfile() {
        const user = Utils.getUser();
        if (user) {
            document.getElementById('user-name').textContent = user.full_name || user.username;
            document.getElementById('user-role').textContent = user.role;
            document.getElementById('user-avatar').textContent = (user.full_name || user.username).charAt(0).toUpperCase();
        }
    }
    
    async loadInitialData() {
        await Promise.all([
            this.loadTasks(),
            this.loadProjects(),
            this.loadUsers(),
            this.loadStats()
        ]);
    }
    
    async showPage(page) {
        this.currentPage = page;
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // Show selected page
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.classList.add('active');
        }
        
        // Load page-specific data
        switch(page) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'tasks':
                await this.loadTasks();
                break;
            case 'projects':
                await this.loadProjects();
                break;
            case 'team':
                await this.loadTeam();
                break;
            case 'activity':
                await this.loadActivity();
                break;
        }
    }
    
    async loadDashboard() {
        await this.loadStats();
        await this.loadRecentTasks();
        await this.loadRecentActivity();
    }
    
    async loadStats() {
        try {
            const data = await API.get(CONFIG.ENDPOINTS.TASK_STATS);
            if (data.success) {
                const stats = data.stats;
                
                // Update stat cards
                const pending = stats.byStatus.find(s => s.status === 'pending')?.count || 0;
                const inProgress = stats.byStatus.find(s => s.status === 'in_progress')?.count || 0;
                const completed = stats.byStatus.find(s => s.status === 'completed')?.count || 0;
                
                document.getElementById('stat-pending').textContent = pending;
                document.getElementById('stat-progress').textContent = inProgress;
                document.getElementById('stat-completed').textContent = completed;
                document.getElementById('stat-overdue').textContent = stats.overdue;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    async loadRecentTasks() {
        try {
            const data = await API.get(CONFIG.ENDPOINTS.TASKS + '?limit=5');
            if (data.success) {
                const container = document.getElementById('recent-tasks');
                container.innerHTML = data.tasks.slice(0, 5).map(task => this.renderTaskItem(task)).join('');
            }
        } catch (error) {
            console.error('Error loading recent tasks:', error);
        }
    }
    
    async loadRecentActivity() {
        try {
            const data = await API.get(CONFIG.ENDPOINTS.RECENT_ACTIVITY);
            if (data.success) {
                const container = document.getElementById('recent-activity');
                container.innerHTML = data.logs.slice(0, 10).map(log => this.renderActivityItem(log)).join('');
            }
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    }
    
    async loadTasks() {
        try {
            const status = document.getElementById('filter-status')?.value || '';
            const priority = document.getElementById('filter-priority')?.value || '';
            const search = document.getElementById('task-search')?.value || '';
            
            let url = CONFIG.ENDPOINTS.TASKS + '?';
            if (status) url += `status=${status}&`;
            if (priority) url += `priority=${priority}&`;
            if (search) url += `search=${search}&`;
            
            const data = await API.get(url);
            if (data.success) {
                this.tasks = data.tasks;
                this.renderTasks();
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }
    
    renderTasks() {
        const container = document.getElementById('tasks-container');
        if (!container) return;
        
        if (this.tasks.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No tasks found</p>';
            return;
        }
        
        container.innerHTML = this.tasks.map(task => this.renderTaskCard(task)).join('');
        
        // Add event listeners
        this.tasks.forEach(task => {
            document.getElementById(`edit-task-${task.task_id}`)?.addEventListener('click', () => {
                this.openTaskModal(task);
            });
            
            document.getElementById(`delete-task-${task.task_id}`)?.addEventListener('click', () => {
                this.deleteTask(task.task_id);
            });
        });
    }
    
    renderTaskItem(task) {
        const isOverdue = Utils.isOverdue(task.due_date, task.status);
        return `
            <div class="task-item" onclick="app.openTaskModal(${JSON.stringify(task).replace(/"/g, '&quot;')})">
                <div class="task-header">
                    <div class="task-title">${task.title}</div>
                    <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                </div>
                <div class="task-meta">
                    <span class="status-badge status-${task.status}">${task.status.replace('_', ' ')}</span>
                    ${task.due_date ? `<span ${isOverdue ? 'style="color: var(--danger)"' : ''}>${Utils.formatDate(task.due_date)}</span>` : ''}
                    ${isOverdue ? '<span style="color: var(--danger)">⚠ Overdue</span>' : ''}
                </div>
            </div>
        `;
    }
    
    renderTaskCard(task) {
        const isOverdue = Utils.isOverdue(task.due_date, task.status);
        return `
            <div class="task-card">
                <div class="task-card-header">
                    <h3 class="task-card-title">${task.title}</h3>
                    <div class="task-actions">
                        <button class="task-action-btn" id="edit-task-${task.task_id}">✎</button>
                        <button class="task-action-btn" id="delete-task-${task.task_id}">🗑</button>
                    </div>
                </div>
                ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
                <div class="task-meta">
                    <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                    <span class="status-badge status-${task.status}">${task.status.replace('_', ' ')}</span>
                    ${task.category ? `<span>${task.category}</span>` : ''}
                </div>
                <div class="task-footer">
                    <div class="task-due">
                        ${task.due_date ? `
                            <span ${isOverdue ? 'style="color: var(--danger)"' : ''}>
                                ${isOverdue ? '⚠ ' : ''}Due: ${Utils.formatDate(task.due_date)}
                            </span>
                        ` : 'No due date'}
                    </div>
                    ${task.assigned_username ? `<div>👤 ${task.assigned_username}</div>` : ''}
                </div>
            </div>
        `;
    }
    
    async loadProjects() {
        try {
            const data = await API.get(CONFIG.ENDPOINTS.PROJECTS);
            if (data.success) {
                this.projects = data.projects;
                this.renderProjects();
                this.updateProjectSelects();
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }
    
    renderProjects() {
        const container = document.getElementById('projects-container');
        if (!container) return;
        
        if (this.projects.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No projects found</p>';
            return;
        }
        
        container.innerHTML = this.projects.map(project => `
            <div class="project-card">
                <div class="project-header">
                    <h3 class="project-name">${project.project_name}</h3>
                    <span class="status-badge status-${project.status}">${project.status}</span>
                </div>
                ${project.description ? `<p class="project-description">${project.description}</p>` : ''}
                <div class="project-stats">
                    <div class="project-stat">
                        <div class="project-stat-value">${project.task_count || 0}</div>
                        <div class="project-stat-label">Tasks</div>
                    </div>
                    <div class="project-stat">
                        <div class="project-stat-value">${project.completed_tasks || 0}</div>
                        <div class="project-stat-label">Completed</div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    updateProjectSelects() {
        const select = document.getElementById('task-project');
        if (select) {
            select.innerHTML = '<option value="">No Project</option>' + 
                this.projects.map(p => `<option value="${p.project_id}">${p.project_name}</option>`).join('');
        }
    }
    
    async loadUsers() {
        try {
            const data = await API.get(CONFIG.ENDPOINTS.USERS);
            if (data.success) {
                this.users = data.users;
                this.updateUserSelects();
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }
    
    updateUserSelects() {
        const select = document.getElementById('task-assigned');
        if (select) {
            select.innerHTML = '<option value="">Unassigned</option>' + 
                this.users.map(u => `<option value="${u.user_id}">${u.full_name || u.username}</option>`).join('');
        }
    }
    
    async loadTeam() {
        try {
            const data = await API.get(CONFIG.ENDPOINTS.USERS);
            if (data.success) {
                const container = document.getElementById('team-container');
                container.innerHTML = data.users.map(user => `
                    <div class="team-member">
                        <div class="team-avatar">${(user.full_name || user.username).charAt(0).toUpperCase()}</div>
                        <div class="team-name">${user.full_name || user.username}</div>
                        <div class="team-role">${user.role}</div>
                        <div style="margin-top: 1rem; font-size: 0.875rem; color: var(--text-secondary);">
                            ${user.email}
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading team:', error);
        }
    }
    
    async loadActivity() {
        try {
            const data = await API.get(CONFIG.ENDPOINTS.ACTIVITY);
            if (data.success) {
                const container = document.getElementById('activity-container');
                container.innerHTML = data.logs.map(log => this.renderActivityItem(log)).join('');
            }
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    }
    
    renderActivityItem(log) {
        return `
            <div class="activity-item">
                <div class="activity-icon">${this.getActivityIcon(log.action)}</div>
                <div class="activity-content">
                    <div class="activity-text">
                        <strong>${log.full_name || log.username}</strong> ${log.details}
                    </div>
                    <div class="activity-time">${Utils.formatDateTime(log.created_at)}</div>
                </div>
            </div>
        `;
    }
    
    getActivityIcon(action) {
        const icons = {
            'created_task': '✓',
            'updated_task': '✎',
            'deleted_task': '🗑',
            'completed_task': '✓'
        };
        return icons[action] || '•';
    }
    
    openTaskModal(task = null) {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        
        if (task) {
            // Edit mode
            document.getElementById('task-modal-title').textContent = 'Edit Task';
            document.getElementById('task-id').value = task.task_id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-status').value = task.status;
            document.getElementById('task-project').value = task.project_id || '';
            document.getElementById('task-category').value = task.category || '';
            document.getElementById('task-assigned').value = task.assigned_to || '';
            
            if (task.due_date) {
                const date = new Date(task.due_date);
                document.getElementById('task-due-date').value = date.toISOString().slice(0, 16);
            }
        } else {
            // Create mode
            document.getElementById('task-modal-title').textContent = 'Create New Task';
            form.reset();
            document.getElementById('task-id').value = '';
        }
        
        modal.classList.add('active');
    }
    
    async handleTaskSubmit() {
        const taskId = document.getElementById('task-id').value;
        const taskData = {
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-description').value,
            priority: document.getElementById('task-priority').value,
            status: document.getElementById('task-status').value,
            project_id: document.getElementById('task-project').value || null,
            category: document.getElementById('task-category').value,
            assigned_to: document.getElementById('task-assigned').value || null,
            due_date: document.getElementById('task-due-date').value || null
        };
        
        try {
            let data;
            if (taskId) {
                // Update existing task
                data = await API.put(`${CONFIG.ENDPOINTS.TASKS}/${taskId}`, taskData);
            } else {
                // Create new task
                data = await API.post(CONFIG.ENDPOINTS.TASKS, taskData);
            }
            
            if (data.success) {
                Utils.showToast(taskId ? 'Task updated!' : 'Task created!', 'success');
                document.getElementById('task-modal').classList.remove('active');
                await this.loadTasks();
                await this.loadStats();
                if (this.currentPage === 'dashboard') {
                    await this.loadRecentTasks();
                }
            }
        } catch (error) {
            Utils.showToast(error.message || 'Failed to save task', 'error');
        }
    }
    
    async deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        
        try {
            const data = await API.delete(`${CONFIG.ENDPOINTS.TASKS}/${taskId}`);
            if (data.success) {
                Utils.showToast('Task deleted!', 'success');
                await this.loadTasks();
                await this.loadStats();
            }
        } catch (error) {
            Utils.showToast(error.message || 'Failed to delete task', 'error');
        }
    }
    
    openProjectModal() {
        const modal = document.getElementById('project-modal');
        document.getElementById('project-form').reset();
        modal.classList.add('active');
    }
    
    async handleProjectSubmit() {
        const projectData = {
            project_name: document.getElementById('project-name').value,
            description: document.getElementById('project-description').value,
            status: document.getElementById('project-status').value
        };
        
        try {
            const data = await API.post(CONFIG.ENDPOINTS.PROJECTS, projectData);
            if (data.success) {
                Utils.showToast('Project created!', 'success');
                document.getElementById('project-modal').classList.remove('active');
                await this.loadProjects();
            }
        } catch (error) {
            Utils.showToast(error.message || 'Failed to create project', 'error');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FlowSyncApp();
});