-- FlowSync Database Schema
-- MySQL Database Structure

-- Drop existing tables if they exist
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS task_comments;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

-- Users Table
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'team_member') DEFAULT 'team_member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username)
);

-- Projects Table
CREATE TABLE projects (
    project_id INT PRIMARY KEY AUTO_INCREMENT,
    project_name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id INT NOT NULL,
    status ENUM('active', 'completed', 'archived') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_owner (owner_id),
    INDEX idx_status (status)
);

-- Tasks Table
CREATE TABLE tasks (
    task_id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    project_id INT,
    assigned_to INT,
    created_by INT NOT NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    category VARCHAR(50),
    due_date DATETIME,
    completion_percentage INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_assigned (assigned_to),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_due_date (due_date),
    INDEX idx_project (project_id)
);

-- Task Comments Table
CREATE TABLE task_comments (
    comment_id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_task (task_id)
);

-- Activity Logs Table
CREATE TABLE activity_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    task_id INT,
    project_id INT,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
);

-- Insert sample admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (username, email, password_hash, full_name, role) VALUES 
('admin', 'admin@flowsync.com', '$2a$10$rL7c8VZ5L5L5L5L5L5L5L.YQ7Z5L5L5L5L5L5L5L5L5L5L5L5L5L5', 'Admin User', 'admin');

-- Insert sample projects
INSERT INTO projects (project_name, description, owner_id, status) VALUES 
('Website Redesign', 'Complete redesign of company website', 1, 'active'),
('Mobile App Development', 'Develop iOS and Android app', 1, 'active');

-- Insert sample tasks
INSERT INTO tasks (title, description, project_id, assigned_to, created_by, priority, status, category, due_date) VALUES 
('Design Homepage', 'Create mockups for new homepage', 1, 1, 1, 'high', 'in_progress', 'Design', DATE_ADD(NOW(), INTERVAL 3 DAY)),
('Setup Database', 'Configure MySQL database', 1, 1, 1, 'high', 'completed', 'Development', DATE_ADD(NOW(), INTERVAL -2 DAY)),
('User Authentication', 'Implement JWT authentication', 2, 1, 1, 'medium', 'pending', 'Development', DATE_ADD(NOW(), INTERVAL 7 DAY));