const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Log activity helper function
const logActivity = async (userId, taskId, projectId, action, details) => {
    try {
        await db.query(
            'INSERT INTO activity_logs (user_id, task_id, project_id, action, details) VALUES (?, ?, ?, ?, ?)',
            [userId, taskId, projectId, action, details]
        );
    } catch (error) {
        console.error('Activity log error:', error);
    }
};

// Get all tasks (with filters and search)
router.get('/', async (req, res) => {
    try {
        const { status, priority, project_id, assigned_to, search, category } = req.query;
        
        let query = `
            SELECT t.*, 
                   u.username as assigned_username, 
                   u.full_name as assigned_name,
                   c.username as creator_username,
                   p.project_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.user_id
            LEFT JOIN users c ON t.created_by = c.user_id
            LEFT JOIN projects p ON t.project_id = p.project_id
            WHERE 1=1
        `;
        const params = [];

        // Apply filters
        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }
        if (priority) {
            query += ' AND t.priority = ?';
            params.push(priority);
        }
        if (project_id) {
            query += ' AND t.project_id = ?';
            params.push(project_id);
        }
        if (assigned_to) {
            query += ' AND t.assigned_to = ?';
            params.push(assigned_to);
        }
        if (category) {
            query += ' AND t.category = ?';
            params.push(category);
        }
        if (search) {
            query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY t.created_at DESC';

        const [tasks] = await db.query(query, params);
        res.json({ success: true, tasks });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get single task by ID
router.get('/:id', async (req, res) => {
    try {
        const [tasks] = await db.query(`
            SELECT t.*, 
                   u.username as assigned_username, 
                   u.full_name as assigned_name,
                   c.username as creator_username,
                   p.project_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.user_id
            LEFT JOIN users c ON t.created_by = c.user_id
            LEFT JOIN projects p ON t.project_id = p.project_id
            WHERE t.task_id = ?
        `, [req.params.id]);

        if (tasks.length === 0) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        res.json({ success: true, task: tasks[0] });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Create new task
router.post('/', [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('priority').isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
    body('status').optional().isIn(['pending', 'in_progress', 'completed'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { 
            title, description, project_id, assigned_to, 
            priority, status, category, due_date 
        } = req.body;

        const [result] = await db.query(
            `INSERT INTO tasks (title, description, project_id, assigned_to, created_by, 
             priority, status, category, due_date) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, description, project_id, assigned_to, req.user.userId,
                priority || 'medium', status || 'pending', category, due_date
            ]
        );

        const [newTask] = await db.query('SELECT * FROM tasks WHERE task_id = ?', [result.insertId]);

        // Log activity
        await logActivity(
            req.user.userId, 
            result.insertId, 
            project_id, 
            'created_task', 
            `Created task: ${title}`
        );

        res.status(201).json({ 
            success: true, 
            message: 'Task created successfully', 
            task: newTask[0] 
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update task
router.put('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;
        const updates = req.body;
        
        // Build dynamic update query
        const allowedFields = [
            'title', 'description', 'project_id', 'assigned_to', 
            'priority', 'status', 'category', 'due_date', 'completion_percentage'
        ];
        
        const updateFields = [];
        const values = [];
        
        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });

        // If status changed to completed, set completed_at
        if (updates.status === 'completed') {
            updateFields.push('completed_at = NOW()');
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }

        values.push(taskId);
        
        await db.query(
            `UPDATE tasks SET ${updateFields.join(', ')} WHERE task_id = ?`,
            values
        );

        const [updatedTask] = await db.query('SELECT * FROM tasks WHERE task_id = ?', [taskId]);

        // Log activity
        await logActivity(
            req.user.userId, 
            taskId, 
            updatedTask[0].project_id, 
            'updated_task', 
            `Updated task: ${updatedTask[0].title}`
        );

        res.json({ success: true, message: 'Task updated successfully', task: updatedTask[0] });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete task
router.delete('/:id', async (req, res) => {
    try {
        const [task] = await db.query('SELECT * FROM tasks WHERE task_id = ?', [req.params.id]);
        
        if (task.length === 0) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        await db.query('DELETE FROM tasks WHERE task_id = ?', [req.params.id]);

        // Log activity
        await logActivity(
            req.user.userId, 
            null, 
            task[0].project_id, 
            'deleted_task', 
            `Deleted task: ${task[0].title}`
        );

        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get tasks statistics/analytics
router.get('/stats/overview', async (req, res) => {
    try {
        const userId = req.query.user_id || req.user.userId;

        // Total tasks by status
        const [statusStats] = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM tasks 
            WHERE assigned_to = ? OR created_by = ?
            GROUP BY status
        `, [userId, userId]);

        // Tasks by priority
        const [priorityStats] = await db.query(`
            SELECT priority, COUNT(*) as count 
            FROM tasks 
            WHERE assigned_to = ? OR created_by = ?
            GROUP BY priority
        `, [userId, userId]);

        // Overdue tasks
        const [overdueCount] = await db.query(`
            SELECT COUNT(*) as count 
            FROM tasks 
            WHERE (assigned_to = ? OR created_by = ?) 
            AND due_date < NOW() 
            AND status != 'completed'
        `, [userId, userId]);

        // Completed tasks this week
        const [weekCompleted] = await db.query(`
            SELECT COUNT(*) as count 
            FROM tasks 
            WHERE (assigned_to = ? OR created_by = ?) 
            AND status = 'completed' 
            AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        `, [userId, userId]);

        res.json({ 
            success: true, 
            stats: {
                byStatus: statusStats,
                byPriority: priorityStats,
                overdue: overdueCount[0].count,
                completedThisWeek: weekCompleted[0].count
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;