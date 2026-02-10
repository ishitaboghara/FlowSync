const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all projects
router.get('/', async (req, res) => {
    try {
        const [projects] = await db.query(`
            SELECT p.*, 
                   u.username as owner_username,
                   u.full_name as owner_name,
                   COUNT(DISTINCT t.task_id) as task_count,
                   SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
            FROM projects p
            LEFT JOIN users u ON p.owner_id = u.user_id
            LEFT JOIN tasks t ON p.project_id = t.project_id
            GROUP BY p.project_id
            ORDER BY p.created_at DESC
        `);

        res.json({ success: true, projects });
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get single project
router.get('/:id', async (req, res) => {
    try {
        const [projects] = await db.query(`
            SELECT p.*, 
                   u.username as owner_username,
                   u.full_name as owner_name
            FROM projects p
            LEFT JOIN users u ON p.owner_id = u.user_id
            WHERE p.project_id = ?
        `, [req.params.id]);

        if (projects.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Get project tasks
        const [tasks] = await db.query(`
            SELECT t.*, u.username as assigned_username 
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.user_id
            WHERE t.project_id = ?
            ORDER BY t.created_at DESC
        `, [req.params.id]);

        res.json({ 
            success: true, 
            project: { ...projects[0], tasks } 
        });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Create project
router.post('/', [
    body('project_name').trim().notEmpty().withMessage('Project name is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { project_name, description, status } = req.body;

        const [result] = await db.query(
            'INSERT INTO projects (project_name, description, owner_id, status) VALUES (?, ?, ?, ?)',
            [project_name, description, req.user.userId, status || 'active']
        );

        const [newProject] = await db.query('SELECT * FROM projects WHERE project_id = ?', [result.insertId]);

        res.status(201).json({ 
            success: true, 
            message: 'Project created successfully', 
            project: newProject[0] 
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update project
router.put('/:id', async (req, res) => {
    try {
        const { project_name, description, status } = req.body;
        const projectId = req.params.id;

        const updateFields = [];
        const values = [];

        if (project_name) {
            updateFields.push('project_name = ?');
            values.push(project_name);
        }
        if (description !== undefined) {
            updateFields.push('description = ?');
            values.push(description);
        }
        if (status) {
            updateFields.push('status = ?');
            values.push(status);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        values.push(projectId);

        await db.query(
            `UPDATE projects SET ${updateFields.join(', ')} WHERE project_id = ?`,
            values
        );

        const [updatedProject] = await db.query('SELECT * FROM projects WHERE project_id = ?', [projectId]);

        res.json({ 
            success: true, 
            message: 'Project updated successfully', 
            project: updatedProject[0] 
        });
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete project
router.delete('/:id', async (req, res) => {
    try {
        const [project] = await db.query('SELECT * FROM projects WHERE project_id = ?', [req.params.id]);
        
        if (project.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        await db.query('DELETE FROM projects WHERE project_id = ?', [req.params.id]);

        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;