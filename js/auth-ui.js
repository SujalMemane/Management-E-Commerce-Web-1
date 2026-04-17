// Authentication UI Handler
// Manages UI updates based on authentication state

import { 
    signUpUser, 
    signInUser, 
    signOutUser, 
    resetPassword,
    signInWithGoogle,
    onAuthChange,
    getCurrentUser,
    showError,
    showSuccess,
    setButtonLoading
} from './auth.js';

// ==================== PAGE PROTECTION ====================

/**
 * Protect pages that require authentication
 * Redirects to login if user is not authenticated
 */
export function protectPage() {
    // Use onAuthChange to wait for auth state to be ready
    onAuthChange((user) => {
        // Check if we're on a protected page (not login/signup)
        const currentPath = window.location.pathname;
        const isAuthPage = currentPath.includes('index.html') || 
                           currentPath.includes('login.html') || 
                           currentPath.includes('signup.html') ||
                           currentPath === '/' ||
                           currentPath.endsWith('/');
        
        if (!isAuthPage && !user) {
            // User is not authenticated, redirect to login
            const loginPath = currentPath.includes('/pages/') ? '../index.html' : 'index.html';
            window.location.href = loginPath;
        } else if (user) {
            // User is authenticated, update UI
            updateUserUI(user);
        }
    });
}

/**
 * Redirect authenticated users away from login/signup pages
 */
export function redirectIfAuthenticated() {
    // Use onAuthChange to wait for auth state to be ready
    onAuthChange((user) => {
        if (user) {
            // User is already logged in, redirect to dashboard
            const currentPath = window.location.pathname;
            const dashboardPath = currentPath.includes('/pages/') ? 'dashboard.html' : 'pages/dashboard.html';
            window.location.href = dashboardPath;
        }
    });
}

// ==================== UI UPDATE FUNCTIONS ====================

/**
 * Update UI elements with current user information
 */
export function updateUserUI(user) {
    if (!user) return;
    
    // Update user email displays
    const emailElements = document.querySelectorAll('[data-user-email]');
    emailElements.forEach(el => {
        el.textContent = user.email;
    });
    
    // Update user name displays
    const nameElements = document.querySelectorAll('[data-user-name]');
    nameElements.forEach(el => {
        el.textContent = user.displayName || user.email.split('@')[0];
    });
    
    // Update user initials
    const initialsElements = document.querySelectorAll('[data-user-initials]');
    initialsElements.forEach(el => {
        const name = user.displayName || user.email;
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        el.textContent = initials;
    });
}

/**
 * Show/hide elements based on authentication state
 */
export function toggleAuthElements(isAuthenticated) {
    // Show elements only when authenticated
    const authOnlyElements = document.querySelectorAll('[data-auth-only]');
    authOnlyElements.forEach(el => {
        el.style.display = isAuthenticated ? '' : 'none';
    });
    
    // Show elements only when NOT authenticated
    const guestOnlyElements = document.querySelectorAll('[data-guest-only]');
    guestOnlyElements.forEach(el => {
        el.style.display = isAuthenticated ? 'none' : '';
    });
}

// ==================== FORM HANDLERS ====================

/**
 * Initialize login form
 */
export function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    
    if (!loginForm) return;
    
    // Create error/success message containers if they don't exist
    if (!document.getElementById('auth-error')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'auth-error';
        errorDiv.className = 'hidden bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4';
        loginForm.insertBefore(errorDiv, loginForm.firstChild);
    }
    
    if (!document.getElementById('auth-success')) {
        const successDiv = document.createElement('div');
        successDiv.id = 'auth-success';
        successDiv.className = 'hidden bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-xl text-sm mb-4';
        loginForm.insertBefore(successDiv, loginForm.firstChild);
    }
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Get form inputs by ID
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const submitButton = document.getElementById('login-button');
        
        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        
        // Validate inputs
        if (!email || !password) {
            showError('Please enter both email and password.');
            return;
        }
        
        // Set loading state
        setButtonLoading(submitButton, true);
        
        // Attempt sign in
        const result = await signInUser(email, password);
        
        // Remove loading state
        setButtonLoading(submitButton, false);
        
        if (result.success) {
            showSuccess('Login successful! Redirecting...');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'pages/dashboard.html';
            }, 1000);
        } else {
            showError(result.error);
        }
    });
}

/**
 * Initialize signup form
 */
export function initSignupForm() {
    const signupForm = document.getElementById('signup-form');
    
    if (!signupForm) return;
    
    // Create error/success message containers if they don't exist
    if (!document.getElementById('auth-error')) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'auth-error';
        errorDiv.className = 'hidden bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4';
        signupForm.insertBefore(errorDiv, signupForm.firstChild);
    }
    
    if (!document.getElementById('auth-success')) {
        const successDiv = document.createElement('div');
        successDiv.id = 'auth-success';
        successDiv.className = 'hidden bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-3 rounded-xl text-sm mb-4';
        signupForm.insertBefore(successDiv, signupForm.firstChild);
    }
    
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Get form inputs by ID
        const nameInput = document.getElementById('signup-name');
        const emailInput = document.getElementById('signup-email');
        const passwordInput = document.getElementById('signup-password');
        const confirmPasswordInput = document.getElementById('signup-confirm-password');
        const submitButton = document.getElementById('signup-button');
        
        const name = nameInput?.value.trim();
        const email = emailInput?.value.trim();
        const password = passwordInput?.value;
        const confirmPassword = confirmPasswordInput?.value;
        
        // Validate inputs
        if (!name || !email || !password || !confirmPassword) {
            showError('Please fill in all fields.');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Passwords do not match.');
            return;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters long.');
            return;
        }
        
        // Set loading state
        setButtonLoading(submitButton, true);
        
        // Attempt sign up
        const result = await signUpUser(email, password, name);
        
        // Remove loading state
        setButtonLoading(submitButton, false);
        
        if (result.success) {
            showSuccess('Account created successfully! Redirecting...');
            
            // Log to console for debugging
            console.log('✅ Signup successful');
            console.log('User:', result.user);
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
            showError(result.error);
            console.error('❌ Signup failed:', result.error);
        }
    });
}

/**
 * Initialize logout buttons
 */
export function initLogoutButtons() {
    const logoutButtons = document.querySelectorAll('a[href*="index.html"][title="Logout"], a[href*="login.html"]');
    
    logoutButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const result = await signOutUser();
            
            if (result.success) {
                // Redirect to login page
                const currentPath = window.location.pathname;
                const loginPath = currentPath.includes('/pages/') ? '../index.html' : 'index.html';
                window.location.href = loginPath;
            } else {
                alert('Failed to logout. Please try again.');
            }
        });
    });
}

/**
 * Initialize forgot password functionality
 */
export function initForgotPassword() {
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    
    if (!forgotPasswordLink) return;
    
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = prompt('Enter your email address to reset your password:');
        
        if (!email) return;
        
        const result = await resetPassword(email);
        
        if (result.success) {
            alert('Password reset email sent! Please check your inbox.');
        } else {
            alert(result.error);
        }
    });
}

/**
 * Initialize Google Sign-In (if button exists)
 */
export function initGoogleSignIn() {
    const googleButton = document.querySelector('[data-google-signin]');
    
    if (!googleButton) return;
    
    googleButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        setButtonLoading(googleButton, true);
        
        const result = await signInWithGoogle();
        
        setButtonLoading(googleButton, false);
        
        if (result.success) {
            showSuccess('Signed in with Google! Redirecting...');
            
            setTimeout(() => {
                const currentPath = window.location.pathname;
                const dashboardPath = currentPath.includes('/pages/') ? 'dashboard.html' : 'pages/dashboard.html';
                window.location.href = dashboardPath;
            }, 1000);
        } else {
            showError(result.error);
        }
    });
}

// ==================== INITIALIZATION ====================

/**
 * Initialize authentication state listener
 */
export function initAuthStateListener() {
    onAuthChange((user) => {
        if (user) {
            // User is signed in
            console.log('User signed in:', user.email);
            updateUserUI(user);
            toggleAuthElements(true);
        } else {
            // User is signed out
            console.log('User signed out');
            toggleAuthElements(false);
        }
    });
}

/**
 * Initialize all authentication UI components
 */
export function initAuthUI() {
    // Start auth state listener first
    initAuthStateListener();
    
    // Initialize based on current page
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/')) {
        // Login page
        console.log('Initializing login page...');
        redirectIfAuthenticated();
        initLoginForm();
        initForgotPassword();
        initGoogleSignIn();
    } else if (currentPath.includes('signup.html')) {
        // Signup page
        console.log('Initializing signup page...');
        redirectIfAuthenticated();
        initSignupForm();
        initGoogleSignIn();
    } else {
        // Protected pages (dashboard, etc.)
        console.log('Initializing protected page...');
        protectPage();
        initLogoutButtons();
    }
}
