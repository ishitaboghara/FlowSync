// FlowSync Authentication Module

class AuthManager {
    constructor() {
        this.init();
    }
    
    init() {
        // Check if user is already logged in
        const token = Utils.getToken();
        if (token) {
            this.verifyToken();
        } else {
            this.showAuthContainer();
        }
        
        // Setup event listeners
        this.setupAuthListeners();
    }
    
    setupAuthListeners() {
        // Switch between login and register
        document.getElementById('show-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegister();
        });
        
        document.getElementById('show-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });
        
        // Form submissions
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            this.logout();
        });
    }
    
    showLogin() {
        document.getElementById('login-page').classList.add('active');
        document.getElementById('register-page').classList.remove('active');
    }
    
    showRegister() {
        document.getElementById('register-page').classList.add('active');
        document.getElementById('login-page').classList.remove('active');
    }
    
    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const data = await API.post(CONFIG.ENDPOINTS.LOGIN, { email, password });
            
            if (data.success) {
                Utils.setToken(data.token);
                Utils.setUser(data.user);
                Utils.showToast('Login successful!', 'success');
                this.showAppContainer();
                
                // Initialize app
                if (window.app) {
                    window.app.init();
                }
            }
        } catch (error) {
            Utils.showToast(error.message || 'Login failed', 'error');
        }
    }
    
    async handleRegister() {
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const full_name = document.getElementById('reg-fullname').value;
        
        try {
            const data = await API.post(CONFIG.ENDPOINTS.REGISTER, {
                username,
                email,
                password,
                full_name
            });
            
            if (data.success) {
                Utils.setToken(data.token);
                Utils.setUser(data.user);
                Utils.showToast('Account created successfully!', 'success');
                this.showAppContainer();
                
                // Initialize app
                if (window.app) {
                    window.app.init();
                }
            }
        } catch (error) {
            Utils.showToast(error.message || 'Registration failed', 'error');
        }
    }
    
    async verifyToken() {
        try {
            const data = await API.get(CONFIG.ENDPOINTS.ME);
            if (data.success) {
                Utils.setUser(data.user);
                this.showAppContainer();
                
                // Initialize app
                if (window.app) {
                    window.app.init();
                }
            }
        } catch (error) {
            // Token is invalid
            this.logout();
        }
    }
    
    logout() {
        Utils.removeToken();
        Utils.removeUser();
        this.showAuthContainer();
        Utils.showToast('Logged out successfully', 'success');
    }
    
    showAuthContainer() {
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
    
    showAppContainer() {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'grid';
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});