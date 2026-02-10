const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all users (for team assignment)
router.get('/', async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT user_id, username, email, full_name, role, created_at
            FROM users
            ORDER BY full_name
        `);

        res.json({ success: true, users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get single user
router.get('/:id', async (req, res) => {
    try {
        const [users] = await db.query(`
            SELECT user_id, username, email, full_name, role, created_at
            FROM users
            WHERE user_id = ?
        `, [req.params.id]);

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get user's task statistics
        const [taskStats] = await db.query(`
            SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks
            FROM tasks
            WHERE assigned_to = ?
        `, [req.params.id]);

        res.json({ 
            success: true, 
            user: { 
                ...users[0], 
                stats: taskStats[0] 
            } 
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update user (admin only)
router.put('/:id', isAdmin, async (req, res) => {
    try {
        const { full_name, role } = req.body;
        const userId = req.params.id;

        const updateFields = [];
        const values = [];

        if (full_name) {
            updateFields.push('full_name = ?');
            values.push(full_name);
        }
        if (role && ['admin', 'team_member'].includes(role)) {
            updateFields.push('role = ?');
            values.push(role);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        values.push(userId);

        await db.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`,
            values
        );

        const [updatedUser] = await db.query(
            'SELECT user_id, username, email, full_name, role, created_at FROM users WHERE user_id = ?',
            [userId]
        );

        res.json({ 
            success: true, 
            message: 'User updated successfully', 
            user: updatedUser[0] 
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Delete user (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;

        // Prevent deleting self
        if (userId == req.user.userId) {
            return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
        }

        const [user] = await db.query('SELECT * FROM users WHERE user_id = ?', [userId]);
        
        if (user.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await db.query('DELETE FROM users WHERE user_id = ?', [userId]);

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;