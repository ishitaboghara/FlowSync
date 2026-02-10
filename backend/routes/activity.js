const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get activity logs with filters
router.get('/', async (req, res) => {
    try {
        const { project_id, user_id, limit = 50 } = req.query;

        let query = `
            SELECT a.*, 
                   u.username, 
                   u.full_name,
                   t.title as task_title,
                   p.project_name
            FROM activity_logs a
            LEFT JOIN users u ON a.user_id = u.user_id
            LEFT JOIN tasks t ON a.task_id = t.task_id
            LEFT JOIN projects p ON a.project_id = p.project_id
            WHERE 1=1
        `;
        const params = [];

        if (project_id) {
            query += ' AND a.project_id = ?';
            params.push(project_id);
        }

        if (user_id) {
            query += ' AND a.user_id = ?';
            params.push(user_id);
        }

        query += ' ORDER BY a.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const [logs] = await db.query(query, params);

        res.json({ success: true, logs });
    } catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get recent activity for dashboard
router.get('/recent', async (req, res) => {
    try {
        const [logs] = await db.query(`
            SELECT a.*, 
                   u.username, 
                   u.full_name,
                   t.title as task_title,
                   p.project_name
            FROM activity_logs a
            LEFT JOIN users u ON a.user_id = u.user_id
            LEFT JOIN tasks t ON a.task_id = t.task_id
            LEFT JOIN projects p ON a.project_id = p.project_id
            ORDER BY a.created_at DESC
            LIMIT 20
        `);

        res.json({ success: true, logs });
    } catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;