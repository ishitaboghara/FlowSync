// FlowSync Frontend Configuration

const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api',
    
    // Storage keys
    STORAGE_KEYS: {
        TOKEN: 'flowsync_token',
        USER: 'flowsync_user'
    },
    
    // API Endpoints
    ENDPOINTS: {
        // Auth
        LOGIN: '/auth/login',
        REGISTER: '/auth/register',
        ME: '/auth/me',
        
        // Tasks
        TASKS: '/tasks',
        TASK_STATS: '/tasks/stats/overview',
        
        // Projects
        PROJECTS: '/projects',
        
        // Comments
        COMMENTS: '/comments',
        
        // Activity
        ACTIVITY: '/activity',
        RECENT_ACTIVITY: '/activity/recent',
        
        // Users
        USERS: '/users'
    }
};

// Utility Functions
const Utils = {
    // Get auth token
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    },
    
    // Set auth token
    setToken(token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    },
    
    // Remove auth token
    removeToken() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    },
    
    // Get user data
    getUser() {
        const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        return user ? JSON.parse(user) : null;
    },
    
    // Set user data
    setUser(user) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    },
    
    // Remove user data
    removeUser() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    },
    
    // Format date
    formatDate(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    },
    
    // Format datetime
    formatDateTime(dateString) {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    },
    
    // Check if task is overdue
    isOverdue(dueDate, status) {
        if (!dueDate || status === 'completed') return false;
        return new Date(dueDate) < new Date();
    },
    
    // Show toast notification
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
};

// API Service
const API = {
    // Make API request
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;
        const token = Utils.getToken();
        
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // GET request
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    // POST request
    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },
    
    // PUT request
    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },
    
    // DELETE request
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};