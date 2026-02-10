const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get comments for a task
router.get('/task/:taskId', async (req, res) => {
    try {
        const [comments] = await db.query(`
            SELECT c.*, u.username, u.full_name
            FROM task_comments c
            LEFT JOIN users u ON c.user_id = u.user_id
            WHERE c.task_id = ?
            ORDER BY c.created_at DESC
        `, [req.params.taskId]);

        res.json({ success: true, comments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Add comment to task
router.post('/', [
    body('task_id').isInt().withMessage('Valid task ID required'),
    body('comment_text').trim().notEmpty().withMessage('Comment text is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { task_id, comment_text } = req.body;

        // Check if task exists
        const [task] = await db.query('SELECT * FROM tasks WHERE task_id = ?', [task_id]);
        if (task.length === 0) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const [result] = await db.query(
            'INSERT INTO task_comments (task_id, user_id, comment_text) VALUES (?, ?, ?)',
            [task_id, req.user.userId, comment_text]
        );

        const [newComment] = await db.query(`
            SELECT c.*, u.username, u.full_name
            FROM task_comments c
            LEFT JOIN users u ON c.user_id = u.user_id
            WHERE c.comment_id = ?
        `, [result.insertId]);

        res.status(201).json({ 
            success: true, 
            message: 'Comment added successfully', 
            comment: newComment[0] 
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete comment
router.delete('/:id', async (req, res) => {
    try {
        const [comment] = await db.query(
            'SELECT * FROM task_comments WHERE comment_id = ?', 
            [req.params.id]
        );

        if (comment.length === 0) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        // Only comment owner can delete
        if (comment[0].user_id !== req.user.userId && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
        }

        await db.query('DELETE FROM task_comments WHERE comment_id = ?', [req.params.id]);

        res.json({ success: true, message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;